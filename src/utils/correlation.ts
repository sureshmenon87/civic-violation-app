// src/utils/correlation.ts
import crypto from "crypto";

export const makeCorrelationId = (prefix = "") =>
  prefix + crypto.randomBytes(8).toString("hex");
