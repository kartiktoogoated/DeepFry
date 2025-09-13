import dotenv from "dotenv";
dotenv.config();

if (process.env.IS_VALIDATOR !== "true") {
  throw new Error("Run this file with IS_VALIDATOR=true");
}

import express, { Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import { Validator } from "../../core/Validator";
import { info, error as logError } from "../../../utils/logger";
import { register as promRegister } from "../../metrics";
import createSimulationRouter from "../../routes/api/v1/simulation";
import { WebSocketServer } from "ws";
import http from "http";
import prisma from "../../prismaClient"; 

interface ValidatorStatus {
  validatorId: number;
  location: string;
  checks: Array<{
    siteId: string;
    url: string;
    lastCheck: {
      vote: { status: "UP" | "DOWN"; weight: number };
      latency: number;
      timestamp: string;
    } | null;
  }>;
  uptime: number;
}

interface HealthResponse {
  status: "ok";
  validatorId: number;
  location: string;
}

const app = express();
const PORT = Number(process.env.PORT) || 3000;

const validatorId = Number(process.env.VALIDATOR_ID);
const location = process.env.LOCATION || "unknown";
const pingInterval = Number(process.env.PING_INTERVAL_MS) || 30000;

// keep per-site status in memory
const siteChecks: Record<string, any> = {};

async function checkAllWebsites() {
  const websites = await prisma.website.findMany();
  for (const site of websites) {
    try {
      const validator = new Validator(validatorId, location);
      const { vote, latency } = await validator.checkWebsite(site.url);

      siteChecks[site.id] = {
        siteId: site.id,
        url: site.url,
        lastCheck: { vote, latency, timestamp: new Date().toISOString() }
      };

      info(`Validator ${validatorId}@${location} → ${site.url}: ${vote.status} (${latency}ms)`);
    } catch (error) {
      logError(`Validator ${validatorId} failed for ${site.url}: ${error}`);
    }
  }
}

// run every X ms
setInterval(checkAllWebsites, pingInterval);

app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ["http://localhost:5173"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));
app.use(express.json());

// Metrics
app.get("/metrics", async (_req, res) => {
  try {
    res.setHeader("Content-Type", promRegister.contentType);
    res.end(await promRegister.metrics());
  } catch (err) {
    logError(`Metrics scrape failed: ${err}`);
    res.status(500).end();
  }
});

// Health
app.get("/health", (_req, res: Response<HealthResponse>) => {
  res.json({ status: "ok", validatorId, location });
});

// Status → show all tracked sites
app.get("/status", (_req, res: Response<ValidatorStatus>) => {
  res.json({
    validatorId,
    location,
    checks: Object.values(siteChecks),
    uptime: process.uptime(),
  });
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

wss.on("connection", (ws) => {
  info(`Client connected to validator ${validatorId}`);
  ws.on("error", (err) => logError(`WebSocket error: ${err.message}`));
  ws.on("close", () => info(`Client disconnected from validator ${validatorId}`));
});

process.on("SIGTERM", () => {
  info(`Shutting down validator ${validatorId}...`);
  wss.close(() => {
    server.close(() => {
      info(`HTTP server closed for validator ${validatorId}`);
      process.exit(0);
    });
  });
});

// mount sim router
app.use("/api/simulate", createSimulationRouter(wss));

server.listen(PORT, "0.0.0.0", () => {
  info(`🧿 Validator ${validatorId} listening on ${PORT}`);
});