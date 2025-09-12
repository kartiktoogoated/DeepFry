import dotenv from "dotenv";
dotenv.config();

import { Validator } from "./Validator";
import { info, warn, error as logError } from "../../utils/logger";
import prisma from "../prismaClient";


const PING_INTERVAL_MS = Number(process.env.PING_INTERVAL_MS ?? 60_000);

const myValidatorId = Number(process.env.VALIDATOR_ID);
const myLocation = process.env.LOCATION ?? "unknown";

const peerList = (process.env.PEERS ?? "")
  .split(",")
  .map((h) => h.trim())
  .filter((h) => h);

if (peerList.length === 0) {
  warn("No peers configured");
}

const validator = new Validator(myValidatorId);
validator.peers = peerList;

async function pollAndGossip() {
  let sites;
  try {
    sites = await prisma.website.findMany({ where: { paused: false } });
  } catch (err) {
    logError(`pollAndGossip: failed to fetch sites :${(err as Error).message}`);
    return;
  }

  if (sites.length === 0) {
    warn(`pollAndGossip: no active sites found`);
    return;
  }

  for (const { url } of sites) {
    try {
      
      const vote = await validator.checkWebsite(url);
      const timestamp = new Date().toISOString();

      
      await validator.gossip(url, vote.latency, timestamp, myLocation);

      info(
        `Validator ${myValidatorId} pinged ${url}: ${vote.vote.status} (${vote.latency}ms) @ ${myLocation}`
      );
    } catch (siteErr) {
      logError(
        `pollAndGossip: error processing ${url}: ${(siteErr as Error).message}`
      );
    }
  }
}

info("Starting immediate pollAndGossip run");
pollAndGossip();
setInterval(() => {
  info("Running scheduled pollAndGossip");
  pollAndGossip().catch((e) =>
    logError(`pollAndGossip interval caught error: ${(e as Error).message}`)
  );
}, PING_INTERVAL_MS);
