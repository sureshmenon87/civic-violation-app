// src/utils/connectDb.ts
import mongoose from "mongoose";
import { logger } from "../lib/logger.js";

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/civic";

const connectDb = async (): Promise<typeof mongoose> => {
  try {
    mongoose.set("strictQuery", true); // optional
    const conn = await mongoose.connect(MONGO_URI);
    logger.info("MongoDB connected", { uri: MONGO_URI });
    return conn;
  } catch (err) {
    logger.error("MongoDB connection error", { err });
    throw err;
  }
};

export default connectDb;
