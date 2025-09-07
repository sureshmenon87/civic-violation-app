import type { Request, Response, NextFunction } from "express";
import { verifyJwt } from "../utils/jwt.js";
import { findRefreshTokenByPlain } from "../utils/refreshToken.js";
import { UserModel } from "../models/User.js";
import { logger } from "../lib/logger.js";

const COOKIE_NAME = process.env.REFRESH_COOKIE_NAME || "rtk";

const withTimeout = <T>(p: Promise<T>, ms = 5000, label = "op") =>
  Promise.race([
    p,
    new Promise<T>((_res, rej) =>
      setTimeout(() => rej(new Error(`${label} timeout after ${ms}ms`)), ms)
    ),
  ]);

const extractBearer = (req: Request) => {
  const h = req.get("Authorization") || req.get("authorization") || "";
  const parts = h.split(" ");
  console.log(parts);
  if (parts.length === 2 && /^Bearer$/i.test(parts[0])) return parts[1];
  return null;
};

export const requireAuth = (requiredRole?: string | string[]) => {
  console.log("In require Auth");
  const roles =
    typeof requiredRole === "string"
      ? [requiredRole]
      : Array.isArray(requiredRole)
      ? requiredRole
      : undefined;

  return async (req: Request, res: Response, next: NextFunction) => {
    const debugId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    logger.info("[requireAuth] start", { debugId, path: req.path });

    try {
      // 1) Bearer token path
      const bearer = extractBearer(req);
      console.log("After extractBearer....");
      logger.info("[requireAuth] bearer present", {
        debugId,
        hasBearer: !!bearer,
      });
      console.log("[requireAuth] bearer present", bearer);
      if (bearer) {
        try {
          const payload = verifyJwt(bearer); // can throw
          logger.info("[requireAuth] bearer verified", {
            debugId,
            sub: payload.sub,
          });
          if (!payload?.sub)
            return res.status(401).json({ error: "Invalid token (no sub)" });

          // load user doc (with timeout)
          logger.info("[requireAuth] loading user (by id)", {
            debugId,
            id: payload.sub,
          });
          const user = await withTimeout(
            UserModel.findById(payload.sub)
              .select("_id email name role")
              .lean(),
            5000,
            "UserModel.findById"
          );
          if (!user) return res.status(401).json({ error: "User not found" });
          req.auth = payload;
          req.userDoc = user;

          if (roles && !roles.includes(String(payload.role || "")))
            return res.status(403).json({ error: "Forbidden" });
          logger.info("[requireAuth] done (bearer success)", { debugId });
          return next();
        } catch (err: any) {
          logger.warn(
            "[requireAuth] bearer verify/load failed, falling back to cookie",
            { debugId, err: err?.message || err }
          );
          // fall through to cookie fallback
        }
      }

      // 2) Cookie fallback: validate refresh token record
      const cookieVal =
        req.cookies?.[COOKIE_NAME] || req.header("x-refresh-token") || null;
      logger.info("[requireAuth] cookiePresent", {
        debugId,
        cookiePresent: !!cookieVal,
      });

      if (cookieVal) {
        // find token doc (with timeout)
        let tokenDoc;
        try {
          tokenDoc = await withTimeout(
            findRefreshTokenByPlain(cookieVal),
            5000,
            "findRefreshTokenByPlain"
          );
        } catch (err: any) {
          logger.error("[requireAuth] DB lookup error", {
            debugId,
            err: err?.message || err,
          });
          return res.status(504).json({
            error: "Database timeout or error while looking up refresh token",
          });
        }
        if (!tokenDoc)
          return res.status(401).json({ error: "Invalid session" });
        if (tokenDoc.revoked)
          return res.status(401).json({ error: "Session revoked" });
        if (tokenDoc.expiresAt < new Date())
          return res.status(401).json({ error: "Session expired" });

        logger.info("[requireAuth] token doc ok, loading user", {
          debugId,
          userId: tokenDoc.userId.toString(),
        });
        const user = await withTimeout(
          UserModel.findById(tokenDoc.userId.toString())
            .select("_id email name role")
            .lean(),
          5000,
          "UserModel.findById"
        );
        if (!user)
          return res.status(401).json({ error: "User not found for session" });

        req.auth = { sub: user._id.toString(), role: (user as any).role };
        req.userDoc = user;
        if (roles && !roles.includes(String(user.role || "")))
          return res.status(403).json({ error: "Forbidden" });

        logger.info("[requireAuth] done (cookie success)", { debugId });
        return next();
      }

      logger.info("[requireAuth] no credentials found", { debugId });
      return res.status(401).json({ error: "Unauthorized" });
    } catch (err: any) {
      logger.error("[requireAuth] unexpected error", {
        debugId,
        err: err?.message || err,
      });
      return res.status(500).json({ error: "Internal error" });
    }
  };
};

export default requireAuth;
