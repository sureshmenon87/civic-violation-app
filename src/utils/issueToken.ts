// src/utils/issueToken.ts  (or wherever you keep it)
import { Response } from "express";
import { signJwt } from "./jwt.js";
import { generateRefreshToken } from "./refreshToken.js";
import { setRefreshCookie } from "./cookie.js";
import { IUserDocument } from "../models/User.js";

export const issueTokenAndRespond = async (
  res: Response,
  user: IUserDocument,
  req: any
) => {
  // short-lived access token
  const accessToken = signJwt({ sub: user._id.toString(), role: user.role });

  // long-lived refresh token (rotating)
  const { plain: refreshPlain, expiresAt } = await generateRefreshToken(
    user._id.toString(),
    {
      ip: req.ip,
      ua: req.get("user-agent") || undefined,
    }
  );

  // set HttpOnly refresh cookie
  setRefreshCookie(res, refreshPlain, expiresAt);

  // send access token + basic user profile in JSON
  res.json({
    token: accessToken,
    user: {
      id: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
  });
};
