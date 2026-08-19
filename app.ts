import { env } from "./src/config/env.ts";
import express from "express";
import type { Request, Response } from "express";
import { TIME_MS } from "./src/core/time.ts";
import cors from "cors";
import helmet from "helmet";
import swaggerUi from "swagger-ui-express";
import cookieParser from "cookie-parser";
import { pinoHttp } from "pino-http";
import { errorHandler } from "./src/core/http/error-handler.middleware.ts";
import logger from "./src/core/logger.ts";

import authRouter from "./src/routes/auth.routes.ts";
import usersRouter from "./src/routes/users.routes.ts";
import categoriesRouter from "./src/routes/categories.routes.ts";
import areasRouter from "./src/routes/areas.routes.ts";
import ingredientsRouter from "./src/routes/ingredients.routes.ts";
import testimonialsRouter from "./src/routes/testimonials.routes.ts";
import recipesRouter from "./src/routes/recipes.routes.ts";

import { apiReference } from "@scalar/express-api-reference";
import { generateOpenApiDocument } from "./src/core/openapi/document.ts";
import prisma from "./src/core/database/prisma.client.ts";

const app = express();

if (env.TRUST_PROXY_HOPS > 0) {
  app.set("trust proxy", env.TRUST_PROXY_HOPS);
}

const allowedOrigins =
  env.ALLOWED_ORIGINS?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean) || [];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes("*") || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        logger.debug({ origin }, "CORS blocked origin");
        callback(null, false);
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    exposedHeaders: ["X-Total-Count"],
    maxAge: TIME_MS.day / TIME_MS.second,
  }),
);

app.use(helmet());

// Для docs — послабити CSP
app.use(["/reference", "/api-docs"], (req, res, next) => {
  res.setHeader(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
      "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
      "img-src 'self' data: blob: https:",
      "font-src 'self' https://cdn.jsdelivr.net data:",
      "connect-src 'self'",
      "worker-src 'self' blob:",
    ].join("; "),
  );
  next();
});

app.use(
  pinoHttp({
    logger,
    autoLogging: {
      ignore: (req) =>
        req.url === "/healthz" || req.url === "/readyz",
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
  }),
);

app.use(express.json());
app.use(cookieParser());

// ---------- Health checks  ----------

// Liveness — процес живий, Event Loop відповідає
app.get("/healthz", (_req: Request, res: Response) => {
  res.status(200).json({
    status: "ok",
    uptime: process.uptime(),
  });
});

// Readiness — готовий приймати трафік (перевіряємо БД)
app.get("/readyz", async (_req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ status: "ready" });
  } catch (err) {
    logger.warn({ err }, "Readiness check failed");
    res.status(503).json({ status: "not ready" });
  }
});

const openApiDocument = generateOpenApiDocument();
app.get("/api-docs.json", (_req, res) => {
  res.json(openApiDocument);
});
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(openApiDocument));
// Scalar
app.use(
  "/reference",
  apiReference({
    spec: {
      content: openApiDocument,
    },
    theme: "default", // або "purple", "moon", "saturn", "bluePlanet" тощо
  }),
);

app.use("/api/auth", authRouter);
app.use("/api/users", usersRouter);
app.use("/api/categories", categoriesRouter);
app.use("/api/areas", areasRouter);
app.use("/api/ingredients", ingredientsRouter);
app.use("/api/testimonials", testimonialsRouter);
app.use("/api/recipes", recipesRouter);

// 404 Not Found handler
app.use((req: Request, res: Response) => {
  logger.debug({ method: req.method, url: req.url }, "Route not found");
  res.status(404).json({ error: "Not found" });
});

// Error handling middleware
app.use(errorHandler);

export default app;