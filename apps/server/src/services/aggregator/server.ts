import dotenv from "dotenv";
dotenv.config();

import express, { Request, Response } from "express";
import http from "http";
import { WebSocketServer, WebSocket } from "ws";
import nodemailer from "nodemailer";
import { Counter, Gauge, Histogram } from "prom-client";

import prisma from "../../prismaClient"; 
import { info, error as logError } from "../../utils/logger"; 
import { sendToTopic } from "../../services/producer"; 
import { mailConfig } from "../../config/mailConfig"; 


const SERVER_PORT = Number(process.env.PORT) || 3000;

if (!process.env.VALIDATOR_IDS) {
  throw new Error("VALIDATOR_IDS must be set (comma-separated)");
}

const VALIDATOR_IDS = process.env.VALIDATOR_IDS.split(",").map((s) => {
  const n = Number(s.trim());
  if (isNaN(n)) {
    throw new Error(`Invalid validator ID: ${s}`);
  }
  return n;
});

if (VALIDATOR_IDS.length === 0) {
  throw new Error("VALIDATOR_IDS list cannot be empty");
}

const QUORUM = Math.ceil(VALIDATOR_IDS.length / 2);

const KAFKA_TOPIC = process.env.KAFKA_TOPIC || "validator-logs";
const KAFKA_CONSENSUS_TOPIC =
  process.env.KAFKA_CONSENSUS_TOPIC || "validator-consensus";

let ALERT_EMAILS: Record<string, string> = {};
if (process.env.LOCATION_EMAILS) {
  try {
    ALERT_EMAILS = JSON.parse(process.env.LOCATION_EMAILS);
  } catch {
    throw new Error("LOCATION_EMAILS must be valid JSON");
  }
}


const voteCounter = new Counter({
  name: "validator_votes_total",
  help: "Total number of votes received",
  labelNames: ["status"],
});

const consensusGauge = new Gauge({
  name: "site_consensus_status",
  help: "Current consensus status for sites (1=UP, 0=DOWN)",
  labelNames: ["url"],
});

const voteLatencyHistogram = new Histogram({
  name: "vote_processing_latency_seconds",
  help: "Time taken to process votes and reach consensus",
  labelNames: ["url"],
});


const mailTransporter = nodemailer.createTransport({
  host: mailConfig.SMTP_HOST,
  port: Number(mailConfig.SMTP_PORT),
  secure: mailConfig.SMTP_SECURE,
  auth: {
    user: mailConfig.SMTP_USER,
    pass: mailConfig.SMTP_PASS,
  },
});


type Status = "UP" | "DOWN";

interface VoteEntry {
  validatorId: number;
  status: Status;
  weight: number;
  latencyMs: number;
  location: string;
  timestamp: number; // arrival time (ms)
}

const voteBuffer: Record<string, VoteEntry[]> = {};
const processedConsensus = new Set<string>();
const VOTE_TTL_MS = 5 * 60 * 1000; // votes older than 5 min are discarded

function cleanupOldVotes() {
  const now = Date.now();
  for (const key of Object.keys(voteBuffer)) {
    const arr = voteBuffer[key];
    if (!arr?.length) {
      delete voteBuffer[key];
      continue;
    }
    voteBuffer[key] = arr.filter((e) => now - e.timestamp < VOTE_TTL_MS);
    if (voteBuffer[key].length === 0) delete voteBuffer[key];
  }
}
setInterval(cleanupOldVotes, 60_000);


const app = express();
app.use(express.json());

app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", service: "aggregator" });
});

app.get("/api/historical-logs", async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      res
        .status(400)
        .json({ error: "startDate and endDate are required (ISO strings)" });
      return;
    }

    const logs = await prisma.validatorLog.findMany({
      where: {
        timestamp: {
          gte: new Date(startDate as string),
          lte: new Date(endDate as string),
        },
      },
      orderBy: { timestamp: "asc" },
    });

    res.json({ logs });
  } catch (err: any) {
    logError(`Failed to get historical logs: ${err.message}`);
    res.status(500).json({ error: "Failed to get historical logs" });
  }
});


const server = http.createServer(app);
const wsServer = new WebSocketServer({ server, path: "/ws" });

wsServer.on("connection", (ws: WebSocket) => {
  info("Validator connected via WebSocket");

  ws.on("message", async (message) => {
    try {
      const payload = JSON.parse(message.toString()) as {
        type: "vote";
        validatorId: number;
        url: string; // origin
        status: Status;
        latencyMs: number;
        timestamp: string; // ISO
        location?: string;
        icmpLatencyMs?: number;
        icmpStatus?: Status;
        httpStatus?: Status;
        httpCode?: number | null;
        failureReason?: string;
      };

      if (payload.type !== "vote") return;

      // Basic validation
      if (
        typeof payload.validatorId !== "number" ||
        typeof payload.url !== "string" ||
        (payload.status !== "UP" && payload.status !== "DOWN") ||
        typeof payload.latencyMs !== "number" ||
        typeof payload.timestamp !== "string"
      ) {
        logError(`Malformed vote payload: ${message.toString()}`);
        return;
      }

      const key = `${payload.url}__${payload.timestamp}`;

      // Store as individual vote in DB (no files, no S3)
      try {
        await prisma.validatorLog.create({
          data: {
            validatorId: payload.validatorId,
            site: payload.url,
            status: payload.status,
            latency: payload.latencyMs,
            timestamp: new Date(payload.timestamp),
            location: payload.location ?? null,
          },
        });
      } catch (dbErr: any) {
        logError(`DB write failed for vote: ${dbErr.message}`);
      }

      // Publish raw vote to Kafka (optional but useful downstream)
      try {
        await sendToTopic(KAFKA_TOPIC, {
          validatorId: payload.validatorId,
          url: payload.url,
          status: payload.status,
          latencyMs: payload.latencyMs,
          timestamp: payload.timestamp,
          location: payload.location ?? "unknown",
        });
      } catch (e: any) {
        logError(`Kafka publish (vote) failed: ${e.message}`);
      }

      voteCounter.inc({ status: payload.status });
      voteLatencyHistogram.observe(payload.latencyMs / 1000); // seconds

      voteBuffer[key] = voteBuffer[key] || [];
      voteBuffer[key].push({
        validatorId: payload.validatorId,
        status: payload.status,
        weight: 1,
        latencyMs: payload.latencyMs,
        location: payload.location ?? "unknown",
        timestamp: Date.now(),
      });


      if (voteBuffer[key].length >= QUORUM) {
        await processQuorumForKey(key);
      }
    } catch (err: any) {
      logError(`Error processing WS message: ${err.message}`);
    }
  });

  ws.on("close", () => info("Validator disconnected from WebSocket"));
  ws.on("error", (err) => logError(`WebSocket error: ${err.message}`));
});


async function processQuorumForKey(key: string) {
  const startTime = Date.now();
  if (processedConsensus.has(key)) return;

  const entries = voteBuffer[key];
  if (!entries || entries.length < QUORUM) return;

  const [site, timestamp] = key.split("__");
  const upCount = entries.filter((e) => e.status === "UP").length;
  const consensus: Status = upCount >= entries.length - upCount ? "UP" : "DOWN";

  processedConsensus.add(key);
  delete voteBuffer[key];

  // Metrics only — no DB insert for consensus
  consensusGauge.set({ url: site }, consensus === "UP" ? 1 : 0);

  // Broadcast consensus over WS
  const payload = { url: site, consensus, votes: entries, timestamp };
  const msg = JSON.stringify(payload);
  wsServer.clients.forEach((c) => {
    if (c.readyState === c.OPEN) c.send(msg);
  });

  // Publish consensus to Kafka (optional)
  try {
    await sendToTopic(KAFKA_CONSENSUS_TOPIC, payload);
  } catch (e: any) {
    logError(`Kafka publish (consensus) failed: ${e.message}`);
  }

  // Send alert emails if DOWN
  if (consensus === "DOWN") {
    for (const e of entries.filter((x) => x.status === "DOWN")) {
      const to = ALERT_EMAILS[e.location];
      if (!to) continue;
      try {
        await mailTransporter.sendMail({
          from: process.env.ALERT_FROM!,
          to,
          subject: `ALERT: ${site} DOWN in ${e.location}`,
          text: `Validator ${e.validatorId}@${e.location} reported DOWN at ${timestamp}.`,
        });
        info(`Alert sent to ${to}`);
      } catch (mailErr: any) {
        logError(`Mail error: ${mailErr.message}`);
      }
    }
  }

  const processingTime = (Date.now() - startTime) / 1000;
  voteLatencyHistogram.observe({ url: site }, processingTime);
  info(
    `✔️ Consensus for ${site}@${timestamp}: ${consensus} (${upCount}/${entries.length} UP)`
  );
}


process.on("unhandledRejection", (err) => {
  logError(`UNHANDLED REJECTION: ${(err as Error).stack || err}`);
  process.exit(1);
});
process.on("uncaughtException", (err) => {
  logError(`UNCAUGHT EXCEPTION: ${(err as Error).stack || err}`);
  process.exit(1);
});

server.listen(SERVER_PORT, "0.0.0.0", () => {
  info(`🧿 Aggregator listening on ${SERVER_PORT}`);
});
