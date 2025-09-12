import { Router, Request, Response } from "express";
import prisma from "../../../prismaClient";

export default function createLogsRouter(): Router {
  const router = Router();

  router.get("/", async (_req: Request, res: Response) => {
    try {
      
      const logs = await prisma.validatorLog.findMany({
        include: {
          validator: {
            select: { location: true },
          },
        },
        orderBy: { timestamp: "desc" },
      });

      res.json({
        success: true,
        logs: logs.map((log) => ({
          id:          log.id,
          validatorId: log.validatorId,
          region:      log.validator?.location ?? "aggregator",
          site:        log.site,
          status:      log.status,
          latency:     (log as any).latency ?? null,
          timestamp:   log.timestamp,
        })),
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  return router;
}
