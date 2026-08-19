import type { ParamsDictionary } from "express-serve-static-core";
import { HTTP_STATUS } from "../../../core/http/http-status.ts";
import { sendPaginated } from "../../../core/http/paginated-response.ts";
import type { Paginated } from "../../../core/paginator.ts";
import type { AuthenticatedHandler } from "../../auth/index.ts";
import type { FavoritesService } from "../application/favorites.service.ts";
import type { MessageView, RecipeListItemView } from "../domain/recipe.view.ts";
import { RECIPES_MESSAGE } from "../domain/recipes.messages.ts";
import type { PaginationQuery } from "./input-dto/pagination-query.input-dto.ts";
import type { RecipeIdParam } from "./input-dto/recipe-id.param.input-dto.ts";

export class FavoritesController {
  constructor(private readonly favorites: FavoritesService) {}

  list: AuthenticatedHandler<
    ParamsDictionary,
    Paginated<RecipeListItemView>,
    unknown,
    { query: PaginationQuery }
  > = async (req, res) => {
    sendPaginated(res, await this.favorites.list({ userId: req.user.sub, page: res.locals.query }));
  };

  add: AuthenticatedHandler<RecipeIdParam, MessageView> = async (req, res) => {
    await this.favorites.add({ userId: req.user.sub, recipeId: req.params.id });

    res.status(HTTP_STATUS.created).json({ message: RECIPES_MESSAGE.addedToFavorites });
  };

  remove: AuthenticatedHandler<RecipeIdParam, void> = async (req, res) => {
    await this.favorites.remove({ userId: req.user.sub, recipeId: req.params.id });

    res.status(HTTP_STATUS.noContent).end();
  };
}
