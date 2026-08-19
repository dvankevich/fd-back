import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type Express } from "express";
import helmet from "helmet";
import { pinoHttp } from "pino-http";
import { API_MODULES } from "./app.module.ts";
import { env } from "./config/env.ts";
import type { ApiModule } from "./core/http/api-module.ts";
import { errorHandler } from "./core/http/error-handler.middleware.ts";
import { notFoundHandler } from "./core/http/not-found.middleware.ts";
import { TOTAL_COUNT_HEADER } from "./core/http/paginated-response.ts";
import logger from "./core/logger.ts";
import {
  DOCS_PATH,
  createDocsRouter,
  relaxDocsContentSecurityPolicy,
} from "./core/openapi/docs.routes.ts";
import { TIME_MS } from "./core/time.ts";
import { HEALTH_PATH } from "./modules/health/index.ts";

const allowedOrigins =
  env.ALLOWED_ORIGINS?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean) || [];

const isAllowedOrigin = (origin?: string): boolean =>
  !origin || allowedOrigins.includes("*") || allowedOrigins.includes(origin);

const corsOptions = {
  origin: (origin: string | undefined, callback: (err: null, allow: boolean) => void) => {
    if (!isAllowedOrigin(origin)) {
      logger.debug({ origin }, "CORS blocked origin");
    }
    callback(null, isAllowedOrigin(origin));
  },
  credentials: true,
  methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  exposedHeaders: [TOTAL_COUNT_HEADER],
  maxAge: TIME_MS.day / TIME_MS.second,
};

const requestLogging = pinoHttp({
  logger,
  autoLogging: {
    ignore: (req) => req.url === HEALTH_PATH.liveness || req.url === HEALTH_PATH.readiness,
  },
  serializers: {
    req: (req) => ({
      id: req.id,
      method: req.method,
      url: req.url,
    }),
    res: (res) => ({
      statusCode: res.statusCode,
    }),
  },
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "req.headers['set-cookie']",
      'res.headers["set-cookie"]',
    ],
    remove: true,
  },
});

export const createApp = (modules: readonly ApiModule[] = API_MODULES): Express => {
  const app = express();

  if (env.TRUST_PROXY_HOPS > 0) {
    app.set("trust proxy", env.TRUST_PROXY_HOPS);
  }

  app.use(cors(corsOptions));
  app.use(helmet());
  app.use([DOCS_PATH.reference, DOCS_PATH.swagger], relaxDocsContentSecurityPolicy);
  app.use(requestLogging);
  app.use(express.json());
  app.use(cookieParser());

  app.use(createDocsRouter());

  modules.forEach(({ path, router }) => {
    app.use(path, router);
  });

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};

export default createApp();
