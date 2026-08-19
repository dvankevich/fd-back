import { Router, type RequestHandler } from "express";
import { createSingleFileUpload } from "../../../core/http/upload.middleware.ts";
import { validateQuery } from "../../../core/http/validate.middleware.ts";
import { withUser } from "../../auth/index.ts";
import type { FavoritesController } from "./favorites.controller.ts";
import type { RecipesController } from "./recipes.controller.ts";
import { PaginationQuerySchema } from "./input-dto/pagination-query.input-dto.ts";
import { RecipesQuerySchema } from "./input-dto/recipes-query.input-dto.ts";

type RecipesRouterOptions = {
  controller: RecipesController;
  favorites: FavoritesController;
  authenticate: RequestHandler;
  optionalAuthenticate: RequestHandler;
};

const uploadThumb = createSingleFileUpload("thumb");

export const createRecipesRouter = ({
  controller,
  favorites,
  authenticate,
  optionalAuthenticate,
}: RecipesRouterOptions): Router => {
  const router = Router();

  router.get("/", optionalAuthenticate, validateQuery(RecipesQuerySchema), controller.search);
  router.get(
    "/popular",
    optionalAuthenticate,
    validateQuery(PaginationQuerySchema),
    controller.popular,
  );

  router.get("/own", authenticate, validateQuery(PaginationQuerySchema), withUser(controller.listOwn));
  router.get("/favorites", authenticate, validateQuery(PaginationQuerySchema), withUser(favorites.list));

  router.post("/", authenticate, uploadThumb, withUser(controller.create));

  router.post("/:id/favorite", authenticate, withUser(favorites.add));
  router.delete("/:id/favorite", authenticate, withUser(favorites.remove));

  router.get("/:id", optionalAuthenticate, controller.getDetail);
  router.delete("/:id", authenticate, withUser(controller.delete));

  return router;
};
