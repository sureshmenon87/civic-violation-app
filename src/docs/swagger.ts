import express from "express";
import swaggerUi from "swagger-ui-express";
import fs from "fs";
import path from "path";
import { logger } from "../lib/logger.js";

const router = express.Router();
const file = path.resolve(process.cwd(), "src/docs/openapi.json");

let doc: any = {};
try {
  const raw = fs.readFileSync(file, "utf-8");
  doc = JSON.parse(raw);
  const base = (process.env.BASE_URL || "http://localhost:4000").replace(
    /\/+$/,
    ""
  );
  doc.servers = [{ url: base }];
  logger.info("Swagger loaded, server set to", { base });
} catch (err) {
  logger.error("Failed to load OpenAPI document", { err });
  doc = {
    openapi: "3.0.0",
    info: { title: "Missing OpenAPI", version: "0.0.0" },
    paths: {},
  };
}

const base = (process.env.BASE_URL || "http://localhost:4000").replace(
  /\/+$/,
  ""
);
const oauth2Redirect = `${base}/docs/oauth2-redirect.html`;

const swaggerUiOptions = {
  swaggerOptions: {
    oauth2RedirectUrl: oauth2Redirect,
    oauth: {
      // supply only clientId — do NOT put client_secret here
      clientId:
        process.env.SWAGGER_OAUTH_CLIENT_ID ||
        process.env.GOOGLE_CLIENT_ID ||
        "",
      usePkceWithAuthorizationCodeGrant: true,
      appName: "Civic Violation API - Docs",
    },
    requestInterceptor: (req) => {
      // ensure browser sends cookies (fetch will use credentials)
      req.credentials = "include"; // swagger-ui supports this
      return req;
    },
  },
};

router.use("/", swaggerUi.serve, swaggerUi.setup(doc, swaggerUiOptions));

export default router;
