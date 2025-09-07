import type { Request, Response, NextFunction } from "express";
import { logger } from "../lib/logger.js";
import crypto from "crypto";

const makeCorrelationId = (prefix = "req-") =>
  prefix + crypto.randomBytes(8).toString("hex");

export const requestLogger = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const start = process.hrtime.bigint();
  const correlationHeader = req.header("x-correlation-id");
  const correlationId = correlationHeader || makeCorrelationId();

  (req as any).correlationId = correlationId;

  // initial log
  logger.info("request:start", {
    correlationId,
    method: req.method,
    path: req.originalUrl || req.url,
    ip: req.ip || req.socket.remoteAddress,
    ua: req.header("user-agent") ?? undefined,
  });

  const onFinish = () => {
    try {
      const end = process.hrtime.bigint();
      const durationMs = Number(end - start) / 1_000_000;
      logger.info("request:finish", {
        correlationId,
        method: req.method,
        path: req.originalUrl || req.url,
        status: res.statusCode,
        durationMs: Math.round(durationMs * 100) / 100,
      });
    } catch (err) {
      logger.error("requestLogger:onFinish:error", { correlationId, err });
    }
  };

  res.once("finish", onFinish);
  res.once("close", onFinish);

  // convenience: attach a request-scoped logger helper
  (req as any).log = (fields: Record<string, unknown> = {}) => {
    const base = { correlationId, ...fields };
    return {
      info: (msg: string, meta?: Record<string, unknown>) =>
        logger.info(msg, { ...base, ...meta }),
      warn: (msg: string, meta?: Record<string, unknown>) =>
        logger.warn(msg, { ...base, ...meta }),
      error: (msg: string, meta?: Record<string, unknown>) =>
        logger.error(msg, { ...base, ...meta }),
      debug: (msg: string, meta?: Record<string, unknown>) =>
        logger.debug(msg, { ...base, ...meta }),
    };
  };

  next();
};
