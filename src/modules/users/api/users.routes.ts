import { Router, type RequestHandler } from "express";
import { createSingleFileUpload } from "../../../core/http/upload.middleware.ts";
import { validateParams } from "../../../core/http/validate.middleware.ts";
import { withUser } from "../../auth/index.ts";
import type { UsersController } from "./users.controller.ts";
import { UserIdParamSchema } from "./input-dto/user-id.param.input-dto.ts";

type UsersRouterOptions = { controller: UsersController; authenticate: RequestHandler };

const uploadAvatar = createSingleFileUpload("avatar");

export const createUsersRouter = ({ controller, authenticate }: UsersRouterOptions): Router => {
  const router = Router();

  router.use(authenticate);

  router.get("/me", withUser(controller.getCurrent));
  router.get("/following", withUser(controller.getFollowing));
  router.patch("/avatar", uploadAvatar, withUser(controller.updateAvatar));

  router.get("/:id", validateParams(UserIdParamSchema), withUser(controller.getById));
  router.get("/:id/followers", validateParams(UserIdParamSchema), withUser(controller.getFollowers));
  router.post("/:id/follow", validateParams(UserIdParamSchema), withUser(controller.follow));
  router.delete("/:id/follow", validateParams(UserIdParamSchema), withUser(controller.unfollow));

  return router;
};
