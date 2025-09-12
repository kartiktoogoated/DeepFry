import dotenv from "dotenv";
dotenv.config();

import express, { Router, Request, Response } from "express";
import { WebSocketServer } from "ws";
import { info, warn, error as logError } from "../../../../utils/logger";
import prisma from "../../../prismaClient";
import { Validator, Status, GossipPayload } from "../../../core/Validator";
import { GossipManager } from "../../../core/GossipManager";
import { RaftNode } from "../../../core/raft";
import { latencyHistogram, statusCounter } from "../../../metrics";
import axios from "axios";

const GOSSIP_ROUNDS = 1;
const PING_INTERVAL_MS = Number(process.env.PING_INTERVAL_MS) || 60_000;

const peerAddresses = (process.env.PEERS ?? "")
  .split(",")
  .map((h) => h.trim().replace(/^https?:\/\//, "").replace(/\/+$/, ""))
  .filter(Boolean)
  .map(peer => {
    if (!peer.includes(':')) {
      warn(`Peer ${peer} missing port number, defaulting to 3000`);
      return `${peer}:3000`;
    }
    return peer;
  });

peerAddresses.forEach(peer => {
  const [host, port] = peer.split(':');
  if (!host || !port || isNaN(Number(port))) {
    warn(`Invalid peer address format: ${peer}, expected format: host:port`);
  }
});

const localValidatorId = Number(process.env.VALIDATOR_ID);
if (isNaN(localValidatorId)) throw new Error("VALIDATOR_ID must be a number");

const localLocation = process.env.LOCATION || "unknown";

const validatorInstance = new Validator(localValidatorId);
validatorInstance.peers = peerAddresses;

let raftNode: RaftNode | undefined;
if (process.env.IS_AGGREGATOR === "true") {
  raftNode = new RaftNode(localValidatorId, peerAddresses, (committed) => {
    info(`Raft committed: ${JSON.stringify(committed)}`);
  });
}

interface VoteEntry {
  validatorId: number;
  status: 'UP' | 'DOWN';
  weight: number;
  latencyMs: number;
  location: string;
  timestamp: number;
}

declare global {
  var voteBuffer: Record<string, VoteEntry[]>;
}

export default function createSimulationRouter(
  wsServer: WebSocketServer
): Router {
  const SimulationRouter = Router();
  SimulationRouter.use(express.json());

  let isLoopRunning = false;
  let loopInterval: NodeJS.Timeout | null = null;

  function startValidationLoop() {
    if (isLoopRunning) return;
    isLoopRunning = true;
    info(`🔁 Simulation loop starting for Validator ${localValidatorId}`);
    loopInterval = setInterval(async () => {
      try {
        const sites = await prisma.website.findMany({ where: { paused: false } });
        await Promise.all(
          sites.map((w: any) =>
            executeRoundForUrl(wsServer, w.url).catch((err) =>
              logError(`Loop round failed for ${w.url}: ${err}`)
            )
          )
        );
      } catch (err) {
        logError(`Failed to fetch websites in interval: ${err}`);
      }
    }, PING_INTERVAL_MS);
  }

  function stopValidationLoop() {
    if (!isLoopRunning) return;
    if (loopInterval) clearInterval(loopInterval);
    isLoopRunning = false;
    info(`🔴 Simulation loop stopped for Validator ${localValidatorId}`);
  }

  SimulationRouter.post("/gossip", async (req: Request, res: Response) => {
    try {
      const { site, vote, validatorId, latencyMs, timestamp, location } = req.body;
      
      if (process.env.IS_AGGREGATOR === "true") {
        const key = `${site}__${timestamp}`;
        global.voteBuffer = global.voteBuffer || {};
        global.voteBuffer[key] = global.voteBuffer[key] || [];
        
        global.voteBuffer[key].push({
          validatorId,
          status: vote.status,
          weight: vote.weight,
          latencyMs,
          location,
          timestamp: Date.now()
        });

        const QUORUM = Math.ceil((process.env.VALIDATOR_IDS || '').split(',').length / 2);
        const CONSENSUS_WINDOW_MS = 5000; // 5 second window for retries
        
        const [_, voteTimestamp] = key.split('__');
        const voteTime = new Date(voteTimestamp).getTime();
        const now = Date.now();
        
        if (now - voteTime >= CONSENSUS_WINDOW_MS) {
          if (global.voteBuffer[key].length >= QUORUM) {
            const upCount = global.voteBuffer[key].filter(e => e.status === 'UP').length;
            const consensus = upCount >= global.voteBuffer[key].length - upCount ? 'UP' : 'DOWN';
            
            await prisma.validatorLog.create({
              data: {
                validatorId: 0, 
                site,
                status: consensus,
                latency: 0,
                timestamp: new Date(voteTimestamp)
              }
            });

            info(`✔️ Consensus for ${site}@${voteTimestamp}: ${consensus} (${upCount}/${global.voteBuffer[key].length} UP)`);
            
            delete global.voteBuffer[key];
          } else {
            warn(`⚠️ No quorum reached for ${site}@${voteTimestamp} after ${CONSENSUS_WINDOW_MS}ms window (${global.voteBuffer[key].length}/${QUORUM} votes)`);
            delete global.voteBuffer[key];
          }
        } else {
          info(`Waiting for more votes for ${site}@${voteTimestamp} (${global.voteBuffer[key].length}/${QUORUM} votes, ${Math.round((CONSENSUS_WINDOW_MS - (now - voteTime))/1000)}s remaining)`);
        }
      }

      await prisma.validator.upsert({
        where: { id: validatorId },
        update: {},
        create: { 
          id: validatorId,
          location: location || 'unknown'
        }
      });

      const logTimestamp = new Date(timestamp);
      if (isNaN(logTimestamp.getTime())) {
        logError(`Invalid gossip timestamp: ${timestamp}`);
        res.status(400).json({ success: false, error: "Invalid timestamp" });
        return;
      }

     
      await prisma.validatorLog.create({
        data: {
          validatorId: validatorId,
          site: site,
          status: vote.status,
          latency: latencyMs,
          timestamp: logTimestamp
        }
      });

      res.sendStatus(204);
    } catch (err) {
      logError(`Gossip error: ${err}`);
      res.status(500).json({ success: false, error: "Failed to process gossip" });
    }
  });

  SimulationRouter.post("/start", async (_req: Request, res: Response) => {
    if (process.env.IS_AGGREGATOR === "true") {
      
      await Promise.all(
        peerAddresses.map(async (peer) => {
          try {
            const url = `http://${peer}/api/simulate/start`;
            await axios.post(url);
          } catch (err) {
            logError(`Failed to start validator at ${peer}: ${err}`);
          }
        })
      );
      res.json({ success: true, message: "Start command sent to all validators" });
    } else {
      
    startValidationLoop();
    res.json({ success: true, message: "Validation loop started" });
    }
  });

  SimulationRouter.post("/stop", async (_req: Request, res: Response) => {
    if (process.env.IS_AGGREGATOR === "true") {
      
      await Promise.all(
        peerAddresses.map(async (peer) => {
          try {
            const url = `http://${peer}/api/simulate/stop`;
            await axios.post(url);
          } catch (err) {
            logError(`Failed to stop validator at ${peer}: ${err}`);
          }
        })
      );
      res.json({ success: true, message: "Stop command sent to all validators" });
    } else {
      
    stopValidationLoop();
    res.json({ success: true, message: "Validation loop stopped" });
    }
  });

  SimulationRouter.get("/", async (_req: Request, res: Response, next) => {
    try {
      
      if (process.env.IS_AGGREGATOR !== "true") {
      startValidationLoop();
      }
      const sites = await prisma.website.findMany({ where: { paused: false } });
      const payloads = await Promise.all(
        sites.map((w: any) => executeRoundForUrl(wsServer, w.url))
      );
      res.json({ success: true, payloads });
    } catch (err: any) {
      logError(`GET /simulation error: ${err.stack || err}`);
      next(err);
    }
  });

  return SimulationRouter;
}

async function executeRoundForUrl(
  wsServer: WebSocketServer,
  url: string
): Promise<{
  url: string;
  consensus: Status;
  votes: Array<{ validatorId: number; status: Status; weight: number }>;
  timestamp: string;
}> {
  
  if (process.env.IS_AGGREGATOR === "true") {
    return {
      url,
      consensus: "UP",
      votes: [],
      timestamp: new Date().toISOString()
    };
  }

  let voteResult: { vote: { status: Status; weight: number }; latency: number };
  let timestamp: string;

  try {
    voteResult = await validatorInstance.checkWebsite(url);
    timestamp = new Date().toISOString();

    info(`[Ping] Validator ${localValidatorId}@${localLocation} → ${url}: ${voteResult.vote.status} (${voteResult.latency}ms)`);

    
    if (typeof voteResult.latency === "number" && !isNaN(voteResult.latency)) {
      latencyHistogram.observe(voteResult.latency);
    }

    statusCounter.labels(voteResult.vote.status).inc();
  } catch (err: any) {
    logError(`Ping error for ${url}: ${err.stack || err}`);
    throw err;
  }

  try {
    await prisma.validator.upsert({
      where: { id: localValidatorId },
      update: { location: localLocation },
      create: { id: localValidatorId, location: localLocation },
    });
  } catch (err: any) {
    logError(`DB upsert validator error: ${err.stack || err}`);
  }

  try {
    await new GossipManager([validatorInstance], GOSSIP_ROUNDS, localLocation).runGossipRounds(
      url,
      voteResult.latency,
      timestamp
    );
  } catch (err: any) {
    logError(`GossipManager error for ${url}: ${err.stack || err}`);
  }

  const payload = {
    url,
    consensus: voteResult.vote.status,
    votes: [
      {
        validatorId: localValidatorId,
        status: voteResult.vote.status,
        weight: voteResult.vote.weight,
      },
    ],
    timestamp,
  };

  try {
    
    if (typeof raftNode !== 'undefined' && process.env.IS_AGGREGATOR === "true") {
    raftNode.propose(payload);
    info(`Raft propose successful for ${url}`);
    }
  } catch {
    info("Not Raft leader—skipping propose");
  }

  try {
    const msg = JSON.stringify(payload);
    wsServer.clients.forEach((c) => {
      if (c.readyState === c.OPEN) c.send(msg);
    });
  } catch (err: any) {
    logError(`WebSocket broadcast error for ${url}: ${err.stack || err}`);
  }

  return payload;
}
