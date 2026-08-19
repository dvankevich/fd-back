import type { Express } from "express";
import type { Server } from "node:http";
import { env } from "./config/env.ts";
import prisma from "./core/database/prisma.client.ts";
import logger from "./core/logger.ts";
import { TIME_MS } from "./core/time.ts";

const FORCED_SHUTDOWN_AFTER_MS = 10 * TIME_MS.second;

const closeDatabase = async (): Promise<void> => {
  try {
    await prisma.$disconnect();
    logger.info("Database connection closed");
  } catch (err) {
    logger.error({ err }, "Error while disconnecting from database");
  }
};

const shutdownOn = (server: Server) => async (signal: string) => {
  logger.info(`${signal} received. Starting graceful shutdown...`);

  server.close(async (err) => {
    if (err) {
      logger.error({ err }, "Error while closing HTTP server");
      process.exit(1);
    }

    await closeDatabase();

    logger.info("Graceful shutdown completed");
    process.exit(0);
  });

  setTimeout(() => {
    logger.error("Could not close connections in time, forcing shutdown");
    process.exit(1);
  }, FORCED_SHUTDOWN_AFTER_MS).unref();
};

const watchProcessErrors = (): void => {
  process.on("uncaughtException", (err) => {
    logger.fatal({ err }, "Uncaught exception");
    process.exit(1);
  });

  process.on("unhandledRejection", (reason) => {
    logger.fatal({ err: reason }, "Unhandled rejection");
    process.exit(1);
  });
};

export const bootstrap = (app: Express): Server => {
  const server = app.listen(env.PORT, () => {
    logger.info(`Server is running on port ${env.PORT}`);
    logger.info(`Environment: ${env.NODE_ENV}`);
  });

  const shutdown = shutdownOn(server);
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  watchProcessErrors();

  return server;
};
