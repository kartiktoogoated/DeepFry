import express, { Request, Response } from "express";
import { WebSocketServer } from "ws";
import { Validator } from "../../../core/Validator";
import { info, warn, error as logError } from "../../../../utils/logger";
import prisma from "../../../prismaClient";

export default function createStatusRouter(ws: WebSocketServer) {
  const router = express.Router();

  router.get("/", async (req: Request, res: Response): Promise<any> => {
    info("Received /api/status request"); 
    try {
      const validators = await prisma.validator.findMany({ where: { id: { not: 0 } } });
      if (!validators || validators.length === 0) {
        return res.status(404).json({
          success: false,
          message: "No real validators found in database"
        });
      }
      const website = await prisma.website.findFirst({ where: { paused: false } });
      const targetUrl = website ? website.url : null;

      return res.json({
        success: true,
        validators: validators.map(v => ({ id: v.id, location: v.location })),
        url: targetUrl,
        // status: vote?.vote.status, 
        // weight: vote?.vote.weight, 
      });
    } catch (err: any) {
      logError(`Status error: ${err.stack || err}`);
      return res
        .status(500)
        .json({ success: false, message: err.message || "Unknown error" });
    }
  });

  return router;
}
