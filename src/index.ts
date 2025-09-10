// src/index.ts
import "dotenv/config";
import express from "express";
import path from "path";
import cookieParser from "cookie-parser";
import cors from "cors";
import passport from "passport";
import swaggerRouter from "./docs/swagger.js"; // your swagger router
import authRouter from "./routes/auth.js";
import apiRouter from "./routes/api.js";
import uploadRouter from "./routes/upload.js"; // GridFS-based uploads (POST /api/v1/uploads)
import s3UploadRouter from "./routes/s3Upload.js"; // presign endpoints (POST /api/v1/uploads/s3/presign)
import gcsUploadRouter from "./routes/gcsUpload.js"; // presign endpoints (POST /api/v1/uploads/gcs/presign)
import connectDb from "./utils/connectDb.js"; // your DB connect helper
import { logger } from "./lib/logger.js";
import reportRoutes from "./routes/reportRoutes.js";
import "./passport/strategies.js";
console.log(
  "Registered strategies:",
  Object.keys((passport as any)._strategies)
);

const PORT = Number(process.env.PORT || 4000);
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "http://localhost:3000";

const app = express();

async function start() {
  try {
    // 1) Connect DB before mounting DB-reliant routes
    await connectDb();
    logger.info("Connected to MongoDB");

    // 2) App-level middleware (order matters)
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use(cookieParser());

    // CORS configuration (allow credentials if frontend uses cookies)
    app.use(
      cors({
        origin: FRONTEND_ORIGIN,
        credentials: true,
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      })
    );

    // Passport init (ensure strategies are registered somewhere at import time)
    app.use(passport.initialize());

    app.use("/auth", authRouter); // /auth/google, /auth/refresh, /auth/logout ...

    // Optional: a lightweight request logger
    app.use((req, _res, next) => {
      logger.info("request:start", {
        method: req.method,
        url: req.originalUrl,
      });
      next();
    });

    // 3) Serve swagger oauth2 redirect page (needed for swagger OAuth popup)
    app.get("/docs/oauth2-redirect.html", (_req, res) => {
      // Use createRequire if ESM environment needs to resolve node_modules file
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { createRequire } = require("module");
      const requireCJS = createRequire(import.meta.url);
      const file = requireCJS.resolve("swagger-ui-dist/oauth2-redirect.html");
      res.sendFile(file);
    });

    // 4) Optional: serve a local 'uploads' folder only if you actually store local files
    // To enable: set SERVE_LOCAL_UPLOADS=true in .env and ensure 'uploads' folder exists.
    if (process.env.SERVE_LOCAL_UPLOADS === "true") {
      const uploadsPath = path.resolve(process.cwd(), "uploads");
      app.use("/static/uploads", express.static(uploadsPath)); // avoids clashing with API paths
      logger.info("Serving local uploads via /static/uploads");
    }

    // 5) Mount routers (clear, distinct paths)

    // Upload routes:
    // - GridFS direct upload POST /api/v1/uploads (uploadRouter)
    // - S3 presign endpoints POST /api/v1/uploads/s3/...
    // - GCS presign endpoints POST /api/v1/uploads/gcs/...
    app.use("/api/v1/uploads", uploadRouter); // GridFS upload + download
    console.log("Mounted uploadRouter -> /api/v1/uploads");
    app.use("/api/v1/uploads/s3", s3UploadRouter); // S3 presign endpoints
    app.use("/api/v1/uploads/gcs", gcsUploadRouter); // GCS presign endpoints

    app.use("/api/v1", apiRouter); // all your API routes (profile, reports, etc.)
    app.use("/api/v1/reports", reportRoutes);

    // 6) Swagger (docs) - keep protected in production if needed
    // We mount swagger at /docs — ensure this is after auth if you protect docs with requireAuth
    if (process.env.NODE_ENV !== "production") {
      app.use("/docs", swaggerRouter);
    } else {
      // production: mount read-only docs or protect them behind auth/basic
      app.use("/docs", swaggerRouter); // or wrap with requireAuth() as appropriate
    }

    // 7) Health & fallback
    app.get("/health", (_req, res) => res.json({ ok: true }));
    app.use((_req, res) => res.status(404).json({ error: "Not found" }));

    // 8) Global error handler (simple)
    // put after all routes
    app.use(
      (
        err: any,
        _req: express.Request,
        res: express.Response,
        _next: express.NextFunction
      ) => {
        logger.error("global error", { err: err?.message || err });
        res.status(500).json({ error: "Internal server error" });
      }
    );

    app.listen(PORT, () => {
      logger.info("Server started", { port: PORT });
      /* eslint-disable no-console */
      console.log(`Server listening on http://localhost:${PORT}`);
    });
  } catch (err) {
    logger.error("Failed to start server", { err });
    process.exit(1);
  }
}

start();
