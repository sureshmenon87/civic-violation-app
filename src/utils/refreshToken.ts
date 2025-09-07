// src/utils/refreshToken.ts
import crypto from "crypto";
import { RefreshTokenModel } from "../models/RefreshToken.js";
import ms from "ms";
import { logger } from "../lib/logger.js";
import { Types } from "mongoose";
import { createHash } from "crypto";

const DAYS = Number(process.env.REFRESH_TOKEN_EXPIRES_DAYS ?? 30);

const hashToken = (token: string) => {
  return createHash("sha256").update(token).digest("hex");
};

export const generateRefreshToken = async (
  userId: string,
  opts?: { ip?: string; ua?: string; fingerprint?: string }
) => {
  // random token returned to client (store only hash in DB)
  const plain = crypto.randomBytes(64).toString("hex"); // 128 chars
  const tokenHash = hashToken(plain);
  const expiresAt = new Date(Date.now() + DAYS * 24 * 60 * 60 * 1000); // DAYS days
  const doc = await RefreshTokenModel.create({
    userId: new Types.ObjectId(userId),
    tokenHash,
    expiresAt,
    ip: opts?.ip ?? null,
    userAgent: opts?.ua ?? null,
    fingerprint: opts?.fingerprint ?? null,
  });
  logger.debug("Generated refresh token record", {
    id: doc._id.toString(),
    userId,
  });
  return { plain, tokenHash, expiresAt };
};

export const findRefreshTokenByPlain = async (plainToken: string) => {
  const tokenHash = hashToken(plainToken);
  return RefreshTokenModel.findOne({ tokenHash });
};

export const revokeRefreshTokenByHash = async (
  tokenHash: string,
  replacedByTokenHash?: string | null
) => {
  await RefreshTokenModel.updateOne(
    { tokenHash },
    { $set: { revoked: true, replacedByToken: replacedByTokenHash ?? null } }
  );
};

export const rotateRefreshToken = async (
  oldPlain: string,
  userId: string,
  opts?: { ip?: string; ua?: string; fingerprint?: string }
) => {
  // validate old token exists and not revoked and not expired
  const oldHash = hashToken(oldPlain);
  const existing = await RefreshTokenModel.findOne({ tokenHash: oldHash });
  if (!existing) return { ok: false, reason: "not_found" };
  if (existing.revoked) return { ok: false, reason: "revoked" };
  if (existing.expiresAt < new Date()) return { ok: false, reason: "expired" };
  if (existing.userId.toString() !== userId)
    return { ok: false, reason: "user_mismatch" };

  // generate a new one
  const {
    plain: newPlain,
    tokenHash: newHash,
    expiresAt,
  } = await generateRefreshToken(userId, opts);

  // mark old as revoked and link to new
  await existing.updateOne({
    $set: { revoked: true, replacedByToken: newHash },
  });

  return { ok: true, newPlain, newHash, expiresAt };
};
