import { Router } from "express";
import type { RequestHandler } from "express";
import {
  getCurrentUser,
  getUserById,
  updateAvatar,
  getFollowers,
  getFollowing,
  followUser,
  unfollowUser,
} from "../controllers/users.controller.ts";
import authenticate from "../middleware/authenticate.ts";
import { validateParams } from "../middleware/validate.ts";
import { UserIdParamSchema } from "../validators/users.validator.ts";
import { upload } from "../middleware/upload.ts";

const router = Router();

router.use(authenticate);

router.get("/me", getCurrentUser as RequestHandler);
router.get("/following", getFollowing as RequestHandler);
router.patch(
  "/avatar",
  upload.single("avatar"),
  updateAvatar as RequestHandler,
);

router.get(
  "/:id",
  validateParams(UserIdParamSchema) as RequestHandler,
  getUserById as RequestHandler,
);

router.get(
  "/:id/followers",
  validateParams(UserIdParamSchema) as RequestHandler,
  getFollowers as RequestHandler,
);

router.post(
  "/:id/follow",
  validateParams(UserIdParamSchema) as RequestHandler,
  followUser as RequestHandler,
);

router.delete(
  "/:id/follow",
  validateParams(UserIdParamSchema) as RequestHandler,
  unfollowUser as RequestHandler,
);

export default router;
