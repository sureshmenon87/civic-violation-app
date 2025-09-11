// src/middlewares/rateLimiter.ts
import rateLimit from "express-rate-limit";

export const downloadLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // max 30 downloads per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, slow down" },
});
