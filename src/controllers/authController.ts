import type { Request, Response, NextFunction } from "express";
import { signJwt } from "../utils/jwt.js";
import { generateRefreshToken } from "../utils/refreshToken.js";
import { setRefreshCookie } from "../utils/cookie.js";
import { logger } from "../lib/logger.js";
import { serializeError } from "../utils/serializeError.js";
import type mongoose from "mongoose";
import { UserModel } from "../models/User.js";

/**
 * Minimal user shape returned to client (avoid leaking sensitive fields)
 */
const serializeUserForClient = (user: any) => ({
  id: user._id?.toString?.() ?? user._id,
  email: user.email,
  name: user.name,
  avatar: user.avatar,
  role: user.role,
  provider: user.provider,
});

/**
 * issueTokenAndRespond
 * - signs an access token (JWT)
 * - generates a rotating refresh token, stores its hash in DB and sets a HttpOnly cookie
 * - responds with { token, user }
 *
 * Usage: called after passport authenticate middleware where req.user is populated.
 */
export const issueTokenAndRespond = async (
  res: Response,
  userDoc: any,
  req: Request
) => {
  try {
    if (!userDoc) {
      logger.warn("issueTokenAndRespond called without user");
      return res.status(400).json({ error: "No user to issue token for" });
    }

    // Access token (short-lived)
    const accessToken = signJwt({
      sub: userDoc._id.toString(),
      role: userDoc.role,
    });

    // Generate refresh token (plain returned, hash saved inside)
    const { plain: refreshPlain, expiresAt } = await generateRefreshToken(
      userDoc._id.toString(),
      {
        ip: req.ip,
        ua: req.get("user-agent") || undefined,
        fingerprint: req.header("x-device-id") || undefined,
      }
    );

    // Set HttpOnly refresh cookie (path=/)
    setRefreshCookie(res, refreshPlain, expiresAt);

    // Respond with access token + safe user object
    const safeUser = serializeUserForClient(userDoc);
    return { accessToken, user: safeUser };
  } catch (err) {
    logger.error("issueTokenAndRespond:error", { err: serializeError(err) });
    // in callback handlers we usually call next(err) but here we return 500
    res.status(500).json({ error: "Failed to issue tokens" });
  }
};

/**
 * Optional helper: endpoint to return current user (used after OAuth redirect if you prefer to redirect client)
 * Example: if your OAuth callback wants to redirect to a frontend route, you can call this to check session.
 */
export const getProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const auth = (req as any).auth;
    if (!auth?.sub) return res.status(401).json({ error: "Unauthorized" });

    const user = await UserModel.findById(auth.sub)
      .select("email name avatar role provider")
      .lean();
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ user });
  } catch (err) {
    logger.error("getProfile:error", { err: serializeError(err) });
    next(err);
  }
};
