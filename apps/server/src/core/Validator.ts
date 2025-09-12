import ping from "ping";
import * as dns from "dns";
import { promisify } from "util";
import { info, warn, error as logError } from "../../utils/logger";
import { WebSocket } from "ws";

export type Status = "UP" | "DOWN";
export interface Vote {
  status: Status;
  weight: number;
}
export interface GossipPayload {
  site: string;
  vote: Vote;
  validatorId: number;
  latencyMs: number;
  timestamp: string;
  location: string;
}

// ── DNS Cache ─────────────────────────────────────
const lookup = promisify(dns.lookup);
const dnsCache = new Map<string, { address: string; family: number }>();
const skipFirstPingForSite = new Set<string>();

async function cachedLookup(hostname: string) {
  const cached = dnsCache.get(hostname);
  if (cached) {
    info(`DNS cache hit: ${hostname} -> ${cached.address}`);
    return cached;
  }
  const result = await lookup(hostname, { family: 0, verbatim: true });
  dnsCache.set(hostname, result);
  info(`DNS cache miss: resolved ${hostname} -> ${result.address}`);
  return result;
}

// ── Validator Class ───────────────────────────────
export class Validator {
  stopPinging() {
    throw new Error("Method not implemented.");
  }
  public readonly id: number;
  public peers: string[] = [];
  private lastVotes = new Map<string, Vote>();
  private location: string;
  private ws: WebSocket | null = null;
  private wsReconnectTimeout: NodeJS.Timeout | null = null;
  private readonly aggregatorUrl: string;
  private isConnecting: boolean = false;
  private reconnectAttempts: number = 0;
  private readonly MAX_RECONNECT_ATTEMPTS = 5;
  private readonly RECONNECT_DELAY = 5000; // 5 seconds
  private connectionLock: boolean = false;
  private pingInterval: NodeJS.Timeout | null = null;

  constructor(id: number, location: string = process.env.LOCATION || "unknown") {
    this.id = id;
    this.location = location;
    this.aggregatorUrl = process.env.AGGREGATOR_URL || 'ws://aggregator:3000/ws';
    this.connectWebSocket();
  }

  private connectWebSocket() {
    if (this.connectionLock || this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      return; // Prevent duplicate connection attempts
    }

    this.connectionLock = true;
    this.isConnecting = true;
    
    try {
      if (this.ws) {
        this.ws.terminate(); // Clean up existing connection
        this.ws = null;
      }

      if (this.pingInterval) {
        clearInterval(this.pingInterval);
        this.pingInterval = null;
      }

      this.ws = new WebSocket(this.aggregatorUrl);

      this.ws.on('open', () => {
        this.isConnecting = false;
        this.connectionLock = false;
        this.reconnectAttempts = 0; // Reset reconnect attempts on successful connection
        info(`WebSocket connected to aggregator at ${this.aggregatorUrl}`);
        if (this.wsReconnectTimeout) {
          clearTimeout(this.wsReconnectTimeout);
          this.wsReconnectTimeout = null;
        }

        // Start ping interval only after successful connection
        this.pingInterval = setInterval(() => {
          if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.ping();
          } else {
            if (this.pingInterval) {
              clearInterval(this.pingInterval);
              this.pingInterval = null;
            }
          }
        }, 30000);
      });

      this.ws.on('close', () => {
        this.isConnecting = false;
        this.connectionLock = false;
        info('WebSocket disconnected from aggregator');
        
        if (this.pingInterval) {
          clearInterval(this.pingInterval);
          this.pingInterval = null;
        }
        
        if (this.reconnectAttempts < this.MAX_RECONNECT_ATTEMPTS) {
          this.reconnectAttempts++;
          const delay = this.RECONNECT_DELAY * Math.pow(2, this.reconnectAttempts - 1); // Exponential backoff
          info(`Attempting to reconnect in ${delay/1000} seconds (attempt ${this.reconnectAttempts}/${this.MAX_RECONNECT_ATTEMPTS})...`);
          this.wsReconnectTimeout = setTimeout(() => this.connectWebSocket(), delay);
        } else {
          logError(`Failed to reconnect after ${this.MAX_RECONNECT_ATTEMPTS} attempts`);
        }
      });

      this.ws.on('error', (err) => {
        this.isConnecting = false;
        this.connectionLock = false;
        logError(`WebSocket error: ${err.message}`);
      });

      this.ws.on('pong', () => {
        // Connection is alive
      });

    } catch (err) {
      this.isConnecting = false;
      this.connectionLock = false;
      logError(`Failed to connect WebSocket: ${err}`);
      if (this.reconnectAttempts < this.MAX_RECONNECT_ATTEMPTS) {
        this.reconnectAttempts++;
        const delay = this.RECONNECT_DELAY * Math.pow(2, this.reconnectAttempts - 1);
        this.wsReconnectTimeout = setTimeout(() => this.connectWebSocket(), delay);
      }
    }
  }

  private recordVote(origin: string, status: Status, weight: number): Vote {
    const vote: Vote = { status, weight };
    this.lastVotes.set(origin, vote);
    return vote;
  }

  /**
   * ICMP-ping + HTTP check. Returns status + latency.
   */
  public async checkWebsite(siteUrl: string): Promise<{ vote: Vote; latency: number }> {
    const origin = new URL(siteUrl).origin;
    const hostname = new URL(siteUrl).hostname;

    // DNS resolve
    let address: string;
    try {
      address = (await cachedLookup(hostname)).address;
    } catch {
      return { vote: this.recordVote(origin, "DOWN", 1), latency: 0 };
    }

    // ICMP ping with retries
    let icmpLatency = 0;
    let icmpStatus: Status = "DOWN";
    const maxPingRetries = 3;
    const pingRetryDelay = 1000; // 1 second

    for (let retryCount = 0; retryCount < maxPingRetries; retryCount++) {
      try {
        const res = await ping.promise.probe(address, { timeout: 2, min_reply: 1 });
        info(`Raw ICMP Result (attempt ${retryCount + 1}/${maxPingRetries}): ${JSON.stringify(res)}`);

        let pingTime = 0;
        if (Array.isArray(res.times) && res.times.length > 0) {
          pingTime = res.times[0];
        } else if (typeof res.time === 'number') {
          pingTime = res.time;
        } else if (typeof res.time === 'string') {
          pingTime = parseFloat(res.time);
        }

        if (res.alive) {
          if (pingTime && pingTime > 0) {
            icmpStatus = "UP";
            icmpLatency = pingTime;
            info(`✅ ICMP ping successful: ${pingTime}ms (packet loss: ${res.packetLoss}%)`);
            break; 
          } else {
            const reason = res.packetLoss === "100.000" 
              ? "100% packet loss" 
              : res.output?.includes("unknown") 
                ? "unknown response time" 
                : "0ms response time";
            warn(`⚠️ ICMP ping returned 0ms on attempt ${retryCount + 1}/${maxPingRetries} for ${origin}`);
            warn(`   └─ Reason: ${reason}`);
            warn(`   └─ Raw output: ${res.output}`);
            if (retryCount < maxPingRetries - 1) {
              warn(`   └─ Retrying in ${pingRetryDelay}ms...`);
              await new Promise(resolve => setTimeout(resolve, pingRetryDelay));
              continue; 
            }
          }
        } else {
          warn(`❌ ICMP ping failed: ${res.output}`);
        }
      } catch (err: any) {
        logError(`ICMP ping error for ${origin} (attempt ${retryCount + 1}/${maxPingRetries}): ${err.message}`);
        if (retryCount < maxPingRetries - 1) {
          warn(`   └─ Retrying in ${pingRetryDelay}ms...`);
          await new Promise(resolve => setTimeout(resolve, pingRetryDelay));
          continue; 
        }
      }
    }

    // HTTP check
    let httpStatus: Status = "DOWN";
    let httpCode: number | null = null;
    let httpLatency = 0;
    const controller = new AbortController();
    const to = setTimeout(() => controller.abort(), 3000);
    try {
      const start = Date.now();
      const r = await fetch(siteUrl, { signal: controller.signal });
      httpLatency = Date.now() - start;
      httpCode = r.status;
      httpStatus = r.status >= 200 && r.status < 400 ? "UP" : "DOWN";
    } catch {
      httpStatus = "DOWN";
    } finally {
      clearTimeout(to);
    }

    const finalStatus: Status = httpStatus === "DOWN" ? "DOWN" : icmpStatus;

    let reportedLatency = 0;
    if (finalStatus === "UP") {
      reportedLatency = icmpLatency > 0 ? icmpLatency : httpLatency;
      if (reportedLatency === 0) {
        logError(`Both ICMP and HTTP latency are 0ms after ${maxPingRetries} retries. Skipping log.`);
        return { vote: this.recordVote(origin, finalStatus, 1), latency: 0 };
      }
    }

    try {
      const votePayload = {
        type: 'vote',
        validatorId: this.id,
        url: origin,
        status: finalStatus,
        latencyMs: reportedLatency,
        timestamp: new Date().toISOString(),
        location: this.location,
        icmpLatencyMs: icmpLatency,
        icmpStatus,
        httpStatus,
        httpCode,
        failureReason: finalStatus === "DOWN" 
          ? "Both ICMP and HTTP checks failed"
          : undefined
      };

      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify(votePayload));
        info(`Validator ${this.id}@${this.location} → ${origin}`);
        info(`   └─ ICMP ${icmpStatus === ("UP" as Status) ? "🟢" : "🔴"}: ${icmpLatency}ms`);
        info(`   └─ HTTP ${httpCode ?? "ERR"}: ${httpStatus}`);
        info(`   └─ Final: ${finalStatus} (Reported: ${reportedLatency}ms)`);
        if (finalStatus === "DOWN") {
          warn(`   └─ Failure Reason: ${votePayload.failureReason}`);
        }
      } else {
        logError('WebSocket not connected, cannot send vote');
      }
    } catch (err: any) {
      logError(`Failed to send vote via WebSocket: ${err.message}`);
    }

    return { vote: this.recordVote(origin, finalStatus, 1), latency: reportedLatency };
  }

  public gossip(
    siteUrl: string,
    latencyMs: number,
    timestamp: string,
    location: string
  ): void {
    const vote = this.lastVotes.get(siteUrl);
    if (!vote) {
      warn(`No cached vote for ${siteUrl}, skipping gossip`);
      return;
    }

    const validTimestamp = (typeof timestamp === 'string' && !isNaN(new Date(timestamp).getTime()))
      ? timestamp
      : new Date().toISOString();

    const payload: GossipPayload = {
      site: siteUrl,
      vote,
      validatorId: this.id,
      latencyMs,
      timestamp: validTimestamp,
      location,
    };

    info(`Gossiping ${siteUrl} (${vote.status}) to ${this.peers.length} peers`);
    
    this.peers.forEach((peer) => {
      const maxRetries = 3;
      const retryDelay = 1000; // 1 second
      
      const attemptGossip = async (retryCount = 0) => {
        try {
          const response = await fetch(`http://${peer}/api/simulate/gossip`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          
          info(`Validator ${this.id} → ${peer}: ${vote.status}`);
        } catch (error: unknown) {
          const err = error as Error;
          if (retryCount < maxRetries) {
            warn(`Retry ${retryCount + 1}/${maxRetries} for ${peer} after error: ${err.message}`);
            setTimeout(() => attemptGossip(retryCount + 1), retryDelay);
          } else {
            info(`Validator ${this.id} → ${peer} failed after ${maxRetries} retries: ${err.message}`);
          }
        }
      };
      
      attemptGossip();
    });
  }

  public getStatus(siteUrl: string): Vote | undefined {
    return this.lastVotes.get(siteUrl);
  }

  public receiveGossip(siteUrl: string, vote: Vote, from: number): void {
    this.lastVotes.set(siteUrl, vote);
    info(`Validator ${this.id} got gossip from ${from} for ${siteUrl}: ${vote.status}`);
  }
}