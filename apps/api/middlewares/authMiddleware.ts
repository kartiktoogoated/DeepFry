import type { NextFunction, Response, Request } from "express";
export function authMiddleware(req: Request, res: Response, next: NextFunction){
    const authHeader = req.headers['authorization'];

    req.userId ="1";
    next()
}