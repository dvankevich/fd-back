import { Router, type RequestHandler } from "express";
import { createAuthRateLimiter } from "../../../core/http/rate-limit.middleware.ts";
import { validateBody } from "../../../core/http/validate.middleware.ts";
import type { AuthConfig } from "../auth.config.ts";
import type { AuthController } from "./auth.controller.ts";
import { withUser } from "./authenticate.middleware.ts";
import { LoginSchema } from "./input-dto/login.input-dto.ts";
import { RefreshTokenBodySchema } from "./input-dto/refresh-token.input-dto.ts";
import { RegisterSchema } from "./input-dto/register.input-dto.ts";

type AuthRouterOptions = {
  controller: AuthController;
  authenticate: RequestHandler;
  rateLimit: AuthConfig["rateLimit"];
};

export const createAuthRouter = ({ controller, authenticate, rateLimit }: AuthRouterOptions): Router => {
  const router = Router();

  router.post(
    "/register",
    createAuthRateLimiter(rateLimit),
    validateBody(RegisterSchema),
    controller.register,
  );
  router.post("/login", createAuthRateLimiter(rateLimit), validateBody(LoginSchema), controller.login);
  router.post("/refresh", validateBody(RefreshTokenBodySchema), controller.refresh);
  router.post(
    "/logout",
    authenticate,
    validateBody(RefreshTokenBodySchema),
    withUser(controller.logout),
  );

  return router;
};
