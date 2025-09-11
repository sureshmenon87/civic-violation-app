import express from "express";
import passport from "passport";
import { issueTokenAndRespond } from "../controllers/authController.js";
import { logger } from "../lib/logger.js";
import {
  refreshTokenHandler,
  logoutHandler,
} from "../controllers/refreshController.js";

const router = express.Router();

/**
 * Start Google OAuth (server-side). This route initiates passport-google-oauth flow.
 * The user will be redirected to Google.
 */
router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false,
  })
);

/**
 * Google callback - passport sets req.user then we issue tokens.
 * Note: passport.authenticate will invoke strategy and set req.user (we use session:false).
 */
router.get(
  "/google/callback",
  passport.authenticate("google", { session: false }),
  async (req, res) => {
    try {
      const user = (req as any).user;
      // set cookie & get token info (no response sent here)
      await issueTokenAndRespond(res, user, req);

      // Now redirect to frontend callback. Do NOT send other body after this.
      const frontendCallback = process.env.FRONTEND_ORIGIN
        ? `${process.env.FRONTEND_ORIGIN}/callback`
        : `${
            process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
          }/callback`;

      return res.redirect(frontendCallback);
    } catch (err) {
      logger.error("google callback error", {
        err: (err as any).message || err,
      });
      return res.status(500).json({ error: "OAuth flow failed" });
    }
  }
);

/**
 * Start GitHub OAuth
 */
router.get(
  "/github",
  passport.authenticate("github", {
    scope: ["user:email"],
    session: false,
  })
);

/**
 * GitHub callback
 */
router.get(
  "/github/callback",
  passport.authenticate("github", {
    session: false,
    failureRedirect: "/auth/failure",
  }),
  async (req, res) => {
    try {
      await issueTokenAndRespond(res, req.user, req as any);
    } catch (err) {
      logger.error("github callback error", { err });
      res.status(500).json({ error: "OAuth callback error" });
    }
  }
);

/**
 * Simple failure handler route (renders JSON; update to redirect to UI if desired)
 */
router.get("/failure", (_req, res) => {
  res.status(401).json({ error: "Authentication failed" });
});

// rotate refresh -> new access token
router.post("/refresh", refreshTokenHandler);

// logout (revoke & clear cookie)
router.post("/logout", logoutHandler);
export default router;
