// src/lib/logger.ts
import { createLogger, format, transports } from "winston";

const { combine, timestamp, printf, colorize, errors, json } = format;

const env = process.env.NODE_ENV ?? "development";
const isProd = env === "production";

// Human readable formatter for dev
const devFormat = printf(({ level, message, timestamp, stack, ...meta }) => {
  const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
  const msg = stack ? `${message}\n${stack}` : message;
  return `${timestamp} ${level}: ${msg}${metaStr}`;
});

export const logger = createLogger({
  level: process.env.LOG_LEVEL || (isProd ? "info" : "debug"),
  format: combine(
    timestamp(),
    errors({ stack: true }), // <-- captures stack in error objects
    isProd ? json() : combine(colorize(), devFormat)
  ),
  transports: [
    new transports.Console({
      handleExceptions: true,
    }),
    // you can add file transports or other transports here for production
  ],
  exitOnError: false,
});

// optional: stream for morgan or other libs
export const loggerStream = {
  write: (message: string) => {
    // morgan adds a newline - trim it
    logger.info(message.trim());
  },
};
