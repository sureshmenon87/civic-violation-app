import { Request, Response, NextFunction } from "express";
import { logger } from "../lib/logger.js";

export const errorHandler = (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  logger.error("Unhandled error", { err });
  const status = err.status || 500;
  const message =
    process.env.NODE_ENV === "production"
      ? "Internal server error"
      : err.message || "Error";
  res.status(status).json({ error: message });
};
