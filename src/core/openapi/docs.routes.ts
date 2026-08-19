import { Router, type Request, type Response, type NextFunction } from "express";
import swaggerUi from "swagger-ui-express";
import { apiReference } from "@scalar/express-api-reference";
import { generateOpenApiDocument } from "./document.ts";

export const DOCS_PATH = {
  document: "/api-docs.json",
  swagger: "/api-docs",
  reference: "/reference",
} as const;

const CDN_ORIGIN = "https://cdn.jsdelivr.net";

const DOCS_CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' ${CDN_ORIGIN}`,
  `style-src 'self' 'unsafe-inline' ${CDN_ORIGIN}`,
  "img-src 'self' data: blob: https:",
  `font-src 'self' ${CDN_ORIGIN} data:`,
  "connect-src 'self'",
  "worker-src 'self' blob:",
].join("; ");

export const relaxDocsContentSecurityPolicy = (_req: Request, res: Response, next: NextFunction) => {
  res.setHeader("Content-Security-Policy", DOCS_CONTENT_SECURITY_POLICY);
  next();
};

export const createDocsRouter = (): Router => {
  const router = Router();
  const document = generateOpenApiDocument();

  router.get(DOCS_PATH.document, (_req, res) => {
    res.json(document);
  });

  router.use(DOCS_PATH.swagger, swaggerUi.serve, swaggerUi.setup(document));

  router.use(
    DOCS_PATH.reference,
    apiReference({
      spec: { content: document },
      theme: "default",
    }),
  );

  return router;
};
