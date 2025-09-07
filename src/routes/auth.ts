import express from "express";
import passport from "passport";
import { issueTokenAndRespond } from "../controllers/authController.js";
import { logger } from "../lib/logger.js";

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
  passport.authenticate("google", {
    session: false,
    failureRedirect: "/auth/failure",
  }),
  async (req, res) => {
    try {
      // req.user should be the user document (from strategy)
      await issueTokenAndRespond(res, req.user, req as any);
    } catch (err) {
      logger.error("google callback error", { err });
      res.status(500).json({ error: "OAuth callback error" });
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

export default router;
