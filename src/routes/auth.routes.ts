import { Router } from "express";
import {
  register,
  login,
  refresh,
  logout,
} from "../controllers/auth.controller.ts";
import { AUTH_CONFIG } from "../config/auth.ts";
import { createAuthRateLimiter } from "../middleware/rateLimit.ts";
import { validateBody } from "../middleware/validate.ts";
import {
  RegisterSchema,
  LoginSchema,
  RefreshTokenBodySchema,
} from "../validators/auth.validator.ts";
import authenticate, { withUser } from "../middleware/authenticate.ts";

const router = Router();

const registerRateLimiter = createAuthRateLimiter(AUTH_CONFIG.rateLimit);
const loginRateLimiter = createAuthRateLimiter(AUTH_CONFIG.rateLimit);

router.post("/register", registerRateLimiter, validateBody(RegisterSchema), register);
router.post("/login", loginRateLimiter, validateBody(LoginSchema), login);
router.post("/refresh", validateBody(RefreshTokenBodySchema), refresh);
router.post("/logout", authenticate, validateBody(RefreshTokenBodySchema), withUser(logout));

export default router;
