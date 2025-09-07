// src/routes/testToken.ts
import express from "express";
import { signJwtWithExpiry } from "../utils/jwt.js"; // we added this earlier
import { requireAuth } from "../middlewares/auth.js";
import { logger } from "../lib/logger.js";

const router = express.Router();

// Dev-only: create a JWT for testing.
// Access control: requireAuth so only logged-in devs can request tokens.
// Also disabled in production.
router.get("/issue", requireAuth, (req, res) => {
  if (process.env.NODE_ENV === "production") {
    return res.status(403).json({ error: "Disabled in production" });
  }
  const auth = (req as any).auth;
  if (!auth || !auth.sub)
    return res.status(401).json({ error: "Unauthorized" });

  // payload — keep minimal to match your app's expectations
  const payload = { sub: auth.sub, role: auth.role };
  const token = signJwtWithExpiry(
    payload,
    process.env.DEV_TOKEN_EXPIRES_IN || "60m"
  ); // adjust TTL
  logger.info("Dev token issued", { sub: auth.sub });
  res.json({ token, expiresIn: process.env.DEV_TOKEN_EXPIRES_IN || "60m" });
});

export default router;
