// src/utils/jwt.ts
import jwt from "jsonwebtoken";

type JwtPayload = { [k: string]: any };

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET must be set in env");
}

/**
 * Sign a JWT with the default configured expiry (JWT_EXPIRES_IN or 15m).
 * @param payload - object to embed in token (avoid very large objects)
 */
export const signJwt = (payload: JwtPayload): string =>
  jwt.sign(payload, JWT_SECRET as string, {
    expiresIn: process.env.JWT_EXPIRES_IN || "15m",
  });

/**
 * Sign a JWT with a custom expiry (e.g. "5m", "1h", "30s").
 * Useful for dev tokens or refresh-token issuance when you want a different TTL.
 * @param payload - object to embed in token
 * @param expiresIn - string or number accepted by jsonwebtoken, e.g. "5m", "1h", 60 (seconds)
 */
export const signJwtWithExpiry = (
  payload: JwtPayload,
  expiresIn: string | number = "5m"
): string => jwt.sign(payload, JWT_SECRET as string, { expiresIn });

/**
 * Verify a JWT and return the decoded payload.
 * Throws if verification fails / token expired.
 * @param token - the JWT string (no "Bearer " prefix)
 */
export const verifyJwt = (token: string): JwtPayload =>
  jwt.verify(token, JWT_SECRET as string) as JwtPayload;
