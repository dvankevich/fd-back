import fs from "fs/promises";
import type { Request, Response } from "express";
import type { ParamsDictionary } from "express-serve-static-core";
import { BadRequestError } from "../../../core/exceptions/errors.ts";
import { HTTP_STATUS } from "../../../core/http/http-status.ts";
import { sendPaginated } from "../../../core/http/paginated-response.ts";
import type { Paginated } from "../../../core/paginator.ts";
import type { AuthenticatedHandler } from "../../auth/index.ts";
import type { RecipesService } from "../application/recipes.service.ts";
import type {
  CreatedRecipeView,
  PopularRecipeView,
  RecipeDetailView,
  RecipeListItemView,
} from "../domain/recipe.view.ts";
import { RECIPES_MESSAGE } from "../domain/recipes.messages.ts";
import { parseCreateRecipeBody } from "./input-dto/create-recipe.input-dto.ts";
import type { PaginationQuery } from "./input-dto/pagination-query.input-dto.ts";
import type { RecipeIdParam } from "./input-dto/recipe-id.param.input-dto.ts";
import type { RecipesQuery } from "./input-dto/recipes-query.input-dto.ts";

type RecipesPage = Paginated<RecipeListItemView>;

export class RecipesController {
  constructor(private readonly recipes: RecipesService) {}

  search = async (
    _req: Request,
    res: Response<RecipesPage, { query: RecipesQuery }>,
  ): Promise<void> => {
    const { page, limit, ...filter } = res.locals.query;

    sendPaginated(res, await this.recipes.search({ filter, page: { page, limit } }));
  };

  popular = async (
    _req: Request,
    res: Response<Paginated<PopularRecipeView>, { query: PaginationQuery }>,
  ): Promise<void> => {
    sendPaginated(res, await this.recipes.listPopular(res.locals.query));
  };

  getDetail = async (
    req: Request<RecipeIdParam, RecipeDetailView>,
    res: Response<RecipeDetailView>,
  ): Promise<void> => {
    res.status(HTTP_STATUS.ok).json(await this.recipes.getDetail(req.params.id));
  };

  listOwn: AuthenticatedHandler<ParamsDictionary, RecipesPage, unknown, { query: PaginationQuery }> =
    async (req, res) => {
      sendPaginated(res, await this.recipes.listOwn({ ownerId: req.user.sub, page: res.locals.query }));
    };

  create: AuthenticatedHandler<ParamsDictionary, CreatedRecipeView> = async (req, res) => {
    const { file } = req;

    if (!file) {
      throw new BadRequestError(RECIPES_MESSAGE.thumbRequired);
    }

    try {
      const recipe = await this.recipes.create({
        input: parseCreateRecipeBody(req.body),
        ownerId: req.user.sub,
        imagePath: file.path,
      });

      res.status(HTTP_STATUS.created).json(recipe);
    } finally {
      await fs.unlink(file.path).catch(() => {});
    }
  };

  delete: AuthenticatedHandler<RecipeIdParam, void> = async (req, res) => {
    await this.recipes.delete({ recipeId: req.params.id, ownerId: req.user.sub });

    res.status(HTTP_STATUS.noContent).end();
  };
}
