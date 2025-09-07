import { Request, Response, NextFunction } from "express";
import {
  findRefreshTokenByPlain,
  rotateRefreshToken,
  revokeRefreshTokenByHash,
} from "../utils/refreshToken.js";
import { signJwt } from "../utils/jwt.js";
import { setRefreshCookie, clearRefreshCookie } from "../utils/cookie.js";
import { logger } from "../lib/logger.js";
import { serializeError } from "../utils/serializeError.js";
import crypto from "crypto";
/**
 * Helper: promise timeout wrapper
 */
const withTimeout = <T>(p: Promise<T>, ms: number, label = "op") =>
  Promise.race([
    p,
    new Promise<T>((_res, rej) =>
      setTimeout(() => rej(new Error(`${label} timeout after ${ms}ms`)), ms)
    ),
  ]);

const COOKIE_NAME = process.env.REFRESH_COOKIE_NAME || "rtk";

export const refreshTokenHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const start = Date.now();
  try {
    logger.info("refreshTokenHandler: entry", { ip: req.ip });

    const cookie =
      req.cookies?.[COOKIE_NAME] || req.header("x-refresh-token") || null;
    logger.debug("refreshTokenHandler: cookiePresent", {
      cookiePresent: !!cookie,
    });

    if (!cookie) {
      logger.warn("refreshTokenHandler: no cookie provided");
      return res.status(401).json({ error: "No refresh token provided" });
    }

    // Find token (wrap with timeout in case DB is hanging)
    logger.info("refreshTokenHandler: finding token in DB (start)");
    let tokenDoc;
    try {
      tokenDoc = await withTimeout(
        findRefreshTokenByPlain(cookie),
        5000,
        "findRefreshTokenByPlain"
      );
    } catch (err) {
      logger.error("refreshTokenHandler: DB lookup failed or timed out", {
        err: serializeError(err),
      });
      return res.status(504).json({
        error: "Database timeout or error while looking up refresh token",
      });
    }
    logger.info("refreshTokenHandler: find token result", {
      found: !!tokenDoc,
      elapsedMs: Date.now() - start,
    });

    if (!tokenDoc)
      return res.status(401).json({ error: "Invalid refresh token" });
    if (tokenDoc.revoked)
      return res.status(401).json({ error: "Refresh token revoked" });
    if (tokenDoc.expiresAt < new Date())
      return res.status(401).json({ error: "Refresh token expired" });

    const userId = tokenDoc.userId.toString();

    // Rotate token (wrap with timeout)
    logger.info("refreshTokenHandler: rotating token (start)", { userId });
    let rotated;
    try {
      rotated = await withTimeout(
        rotateRefreshToken(cookie, userId, {
          ip: req.ip,
          ua: req.get("user-agent") || undefined,
          fingerprint: req.header("x-device-id") || undefined,
        }),
        5000,
        "rotateRefreshToken"
      );
    } catch (err) {
      logger.error("refreshTokenHandler: rotate failed or timed out", {
        err: serializeError(err),
      });
      // As a precaution revoke token in DB if we have its hash
      try {
        const revHash = crypto
          .createHash("sha256")
          .update(cookie)
          .digest("hex");
        await revokeRefreshTokenByHash(revHash);
      } catch (e) {
        logger.error("refreshTokenHandler: revoke attempt failed", {
          err: serializeError(e),
        });
      }
      return res.status(504).json({ error: "Failed to rotate refresh token" });
    }

    if (!rotated.ok) {
      logger.warn("refreshTokenHandler: rotate returned not ok", {
        reason: rotated.reason,
      });
      return res.status(401).json({
        error: "Failed to rotate refresh token",
        reason: rotated.reason,
      });
    }

    // Sign new access token
    const accessToken = signJwt({ sub: userId });

    // set new refresh cookie
    setRefreshCookie(res, rotated.newPlain, rotated.expiresAt);

    logger.info("refreshTokenHandler: success", {
      userId,
      elapsedMs: Date.now() - start,
    });
    return res.json({ accessToken });
  } catch (err) {
    logger.error("refreshTokenHandler: unexpected error", {
      err: serializeError(err),
    });
    return next(err);
  }
};

export const logoutHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const cookie = req.cookies?.[COOKIE_NAME] || null;
    if (cookie) {
      const tokenHash = crypto
        .createHash("sha256")
        .update(cookie)
        .digest("hex");
      await revokeRefreshTokenByHash(tokenHash);
    }
    clearRefreshCookie(res);
    res.json({ ok: true });
  } catch (err) {
    logger.error("logoutHandler failed", { err: serializeError(err) });
    next(err);
  }
};
