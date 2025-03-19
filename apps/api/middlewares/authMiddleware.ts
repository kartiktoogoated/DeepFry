import type { NextFunction, Response, Request } from "express";
import jwt from "jsonwebtoken";
import { JWT_PUBLIC_KEY } from "../config";

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
    const token = req.headers["authorization"];

    if (!token) {
        res.status(401).json({ error: "Unauthorized" });
        return;
    }

    try {
        const decoded = jwt.verify(token, JWT_PUBLIC_KEY) as jwt.JwtPayload;

        if (!decoded || !decoded.sub) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }

        req.userId = decoded.sub as string;
        next(); 
    } catch (error) {
        res.status(401).json({ error: "Invalid Token" });
    }
}
