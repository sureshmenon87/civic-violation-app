// src/utils/cookie.ts
import { Response } from "express";

const COOKIE_NAME = process.env.REFRESH_COOKIE_NAME || "rtk";
const isProd = process.env.NODE_ENV === "production";

export const setRefreshCookie = (
  res: Response,
  token: string,
  expiresAt: Date
) => {
  const cookieOptions: Record<string, any> = {
    httpOnly: process.env.REFRESH_COOKIE_HTTP_ONLY !== "false", // default true
    secure: process.env.REFRESH_COOKIE_SECURE !== "false" && isProd, // secure in prod
    sameSite: (process.env.REFRESH_COOKIE_SAME_SITE as any) || "lax",
    expires: expiresAt,
    path: "/",
  };
  res.cookie(COOKIE_NAME, token, cookieOptions);
};

export const clearRefreshCookie = (res: Response) => {
  res.clearCookie(COOKIE_NAME, { path: "/" });
};
