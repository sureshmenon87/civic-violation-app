import express from "express";
import {
  refreshTokenHandler,
  logoutHandler,
} from "../controllers/refreshController.js";

const router = express.Router();

// rotate refresh -> new access token
router.post("/refresh", refreshTokenHandler);

// logout (revoke & clear cookie)
router.post("/logout", logoutHandler);

export default router;
