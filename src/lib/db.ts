import mongoose from "mongoose";
import { logger } from "./logger.js";

export const connectDb = async () => {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error("MONGO_URI is missing in env");

  await mongoose.connect(uri, {
    dbName: process.env.MONGO_DB_NAME || undefined,
  });
  logger.info("Connected to MongoDB");
};
