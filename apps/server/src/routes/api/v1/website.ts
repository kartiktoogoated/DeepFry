import { Response, Router } from "express";
import prisma from "../../../prismaClient";
import {
  authMiddleware,
  AuthenticatedRequest,
} from "../../../middlewares/authMiddleware";

const websiteRouter = Router();

// Post /api/websites - Add new website for monitoring
websiteRouter.post(
  "/websites",
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    const user = req.user;
    const { url, description } = req.body;

    if (!url) {
      return res.status(400).json({ message: "URL is required" });
    }

    try {
      const existing = await prisma.website.findUnique({ where: { url } });
      if (existing) {
        return res.status(400).json({ message: "Website already added" });
      }

      const website = await prisma.website.create({
        data: {
          url,
          description,
          userId: user!.id,
        },
      });

      return res.status(201).json({ message: "Website added", website });
    } catch (error: any) {
      return res
        .status(500)
        .json({ message: "Internal server error", error: error.message });
    }
  }
);

// GET /api/websites - list
websiteRouter.get(
  "/websites",
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    const userId = req.user?.id;

    try {
      const websites = await prisma.website.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
      });
      return res.json({ websites });
    } catch (error: any) {
      return res
        .status(500)
        .json({ message: "Could not fetch websites", error: error.message });
    }
  }
);

// PUT /api/websites/:id
websiteRouter.put(
  "/websites/:id",
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    const { id } = req.params;
    const { url } = req.body;
    const userId = req.user?.id;

    try {
      const website = await prisma.website.findUnique({ where: { id } });
      if (!website || website.userId !== userId) {
        return res
          .status(403)
          .json({ message: "Not allowed to edit this website" });
      }

      const updated = await prisma.website.update({
        where: { id },
        data: { url },
      });
      return res.json({ message: "Website updated", updated });
    } catch (error: any) {
      return res
        .status(500)
        .json({ message: "Update failed", error: error.message });
    }
  }
);

// DELETE /api/websites/:id
websiteRouter.delete(
  "/websites/:id",
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    const { id } = req.params;
    const userId = req.user?.id;

    try {
      const website = await prisma.website.findUnique({ where: { id } });
      if (!website || website.userId !== userId) {
        return res.status(403).json({ message: "Not authorized" });
      }

      await prisma.website.delete({ where: { id } });
      return res.json({ message: "Website deleted" });
    } catch (error: any) {
      return res
        .status(500)
        .json({ message: "Delete failed", error: error.message });
    }
  }
);

// GET /api/websites/:id/history
websiteRouter.get(
  "/websites/:id/history",
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    const { id } = req.params;
    const userId = req.user!.id;
    const limit = Math.min(Number(req.query.limit) || 50, 100);
    const page = Math.max(Number(req.query.page) || 1, 1);
    const skip = (page - 1) * limit;

    try {
      // ownership check
      const website = await prisma.website.findUnique({ where: { id } });
      if (!website || website.userId !== userId) {
        return res
          .status(403)
          .json({ message: "Not authorized to view this website's history" });
      }

      const [logs, total] = await Promise.all([
        prisma.validatorLog.findMany({
          where: { site: website.url },
          orderBy: { timestamp: "desc" },
          skip,
          take: limit,
        }),
        prisma.validatorLog.count({ where: { site: website.url } }),
      ]);

      return res.json({
        url: website.url,
        total,
        page,
        pageSize: limit,
        totalPages: Math.ceil(total / limit),
        logs,
      });
    } catch (error: any) {
      return res
        .status(500)
        .json({ message: "Failed to fetch history", error: error.message });
    }
  }
);

// PUT /api/websites/:id/pause
websiteRouter.put(
  "/websites/:id/pause",
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    const { id } = req.params;
    const userId = req.user!.id;
    const { paused } = req.body;

    if (typeof paused !== "boolean") {
      return res.status(400).json({ message: "Invalid paused state" });
    }

    try {
      const website = await prisma.website.findUnique({ where: { id } });
      if (!website || website.userId !== userId) {
        return res.status(403).json({ message: "Not authorized" });
      }

      const updated = await prisma.website.update({
        where: { id },
        data: { paused },
      });
      return res.json({
        message: `Monitoring ${paused ? "paused" : "resumed"}`,
        website: updated,
      });
    } catch (error: any) {
      return res
        .status(500)
        .json({ message: "Failed to update state", error: error.message });
    }
  }
);

// GET /api/websites/:id/summary
websiteRouter.get(
    "/websites/:id/summary",
    authMiddleware,
    async (req: AuthenticatedRequest, res: Response): Promise<any> => {
      const { id } = req.params
      const userId = req.user!.id
  
      try {
        const website = await prisma.website.findUnique({ where: { id } })
        if (!website || website.userId !== userId) {
          return res.status(403).json({ message: "Not authorized" })
        }
  
        // ✅ Remove validatorId filter so we pick up the actual last ping
        const [ latestLog, totalLogs, upLogs ] = await Promise.all([
          prisma.validatorLog.findFirst({
            where: { site: website.url },
            orderBy: { timestamp: "desc" },
          }),
          prisma.validatorLog.count({ where: { site: website.url } }),
          prisma.validatorLog.count({ where: { site: website.url, status: "UP" } }),
        ])
  
        const uptimePercent =
          totalLogs > 0 ? ((upLogs / totalLogs) * 100).toFixed(2) : "N/A"
  
        return res.json({
          url:         website.url,
          status:      latestLog?.status ?? "N/A",
          lastChecked: latestLog?.timestamp,             // ← real timestamp
          uptime:      uptimePercent,                  
          latency:     (latestLog as any)?.latency ?? 0, // ← real ms
          paused:      website.paused,
        })
      } catch (error: any) {
        return res
          .status(500)
          .json({ message: "Failed to fetch summary", error: error.message })
      }
    }
  );

// GET /api/validators/:id/meta
websiteRouter.get(
  "/validators/:id/meta",
  async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    const validatorId = Number(req.params.id);
    if (isNaN(validatorId)) {
      return res.status(400).json({ message: "Invalid validator ID" });
    }

    try {
      const meta = await prisma.validatorMeta.findUnique({
        where: { validatorId },
      });
      if (!meta) {
        return res.status(404).json({ message: "Validator not found" });
      }

      return res.json({
        validatorId,
        correctVotes: meta.correctVotes,
        totalVotes: meta.totalVotes,
        accuracy:
          meta.totalVotes > 0
            ? (meta.correctVotes / meta.totalVotes).toFixed(2)
            : "0",
        averageLatency: meta.averageLatency.toFixed(2),
        uptime: meta.uptimePercent.toFixed(2),
        weight: meta.weight.toFixed(3),
        lastUpdated: meta.updatedAt,
      });
    } catch (error: any) {
      return res
        .status(500)
        .json({ message: "Internal error", error: error.message });
    }
  }
);

export default websiteRouter;
