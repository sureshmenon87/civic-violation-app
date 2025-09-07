import "dotenv/config";
import swaggerRouter from "./docs/swagger.js";
import express from "express";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import passport from "passport";
import path from "path";
import { logger } from "./lib/logger.js";
import { connectDb } from "./lib/db.js";
import authRouter from "./routes/auth.js";
import apiRouter from "./routes/api.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import "./passport/strategies";
import { requestLogger } from "./middlewares/requestLogger.js";
import { serializeError } from "./utils/serializeError.js";
import tokenRouter from "./routes/tokenRoutes.js";
import requireAuth from "./middlewares/auth.js";
const googleOrigins = [
  "https://accounts.google.com",
  "https://oauth2.googleapis.com",
  "https://lh3.googleusercontent.com", // google avatars / images
];

const githubOrigins = [
  "https://github.com",
  "https://avatars.githubusercontent.com",
];
const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use("/auth", tokenRouter);
app.use(requestLogger);
app.use(passport.initialize());

app.use(
  rateLimit({
    windowMs: 60 * 1000,
    max: 60,
  })
);
app.use((req, res, next) => {
  console.log(
    `[REQ] ${new Date().toISOString()} ${req.method} ${
      req.originalUrl
    } -- headers: ${JSON.stringify({
      authorization: req.headers.authorization,
      cookie: req.headers.cookie,
    })}`
  );
  next();
});
// Routes
app.use("/auth", authRouter);

app.use("/api/v1", apiRouter);

// serve uploaded images
app.use("/uploads", express.static(path.resolve(process.cwd(), "uploads")));

app.use("/docs", swaggerRouter);

// Health
app.get("/health", (_req, res) => res.json({ status: "ok" }));
app.get("/api/v1/admin", requireAuth("admin"), (req, res) => {
  res.json({ secret: "admin data" });
});

// Error handler (last)
app.use(errorHandler);

const start = async () => {
  try {
    await connectDb();
    app.listen(PORT, () => {
      logger.info("Server started", { port: PORT });
    });
  } catch (rawErr) {
    const err = serializeError(rawErr);
    logger.error("Failed to start server", { err });
    process.exit(1);
  }
};

start();
