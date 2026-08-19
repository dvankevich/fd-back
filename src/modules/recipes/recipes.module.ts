import type { RequestHandler } from "express";
import prisma from "../../core/database/prisma.client.ts";
import type { PrismaClient } from "../../core/database/prisma.ts";
import { API_PREFIX, type ApiModule } from "../../core/http/api-module.ts";
import { areasModule } from "../areas/index.ts";
import { authModule } from "../auth/index.ts";
import { categoriesModule } from "../categories/index.ts";
import { ingredientsModule } from "../ingredients/index.ts";
import { mediaModule, type ImageStorage } from "../media/index.ts";
import { FavoritesController } from "./api/favorites.controller.ts";
import { RecipesController } from "./api/recipes.controller.ts";
import { createRecipesRouter } from "./api/recipes.routes.ts";
import { FavoriteMarker } from "./application/favorite-marker.ts";
import { FavoritesService } from "./application/favorites.service.ts";
import { RecipesService } from "./application/recipes.service.ts";
import type { AreaResolver, CategoryResolver, IngredientChecker } from "./domain/recipes.port.ts";
import { PrismaFavoritesRepository } from "./infrastructure/favorites.repository.ts";
import { PrismaRecipesRepository } from "./infrastructure/recipes.repository.ts";
import "./api/recipes.openapi.ts";

export type RecipesModule = ApiModule & { service: RecipesService; favorites: FavoritesService };

type RecipesModuleOptions = {
  client?: PrismaClient;
  categories?: CategoryResolver;
  areas?: AreaResolver;
  ingredients?: IngredientChecker;
  images?: ImageStorage;
  authenticate?: RequestHandler;
  optionalAuthenticate?: RequestHandler;
};

export const createRecipesModule = ({
  client = prisma,
  categories = categoriesModule.service,
  areas = areasModule.service,
  ingredients = ingredientsModule.service,
  images = mediaModule.imageStorage,
  authenticate = authModule.authenticate,
  optionalAuthenticate = authModule.optionalAuthenticate,
}: RecipesModuleOptions = {}): RecipesModule => {
  const recipes = new PrismaRecipesRepository(client);
  const favoritesRepository = new PrismaFavoritesRepository(client);
  const service = new RecipesService({
    recipes,
    favorites: new FavoriteMarker(favoritesRepository),
    categories,
    areas,
    ingredients,
    images,
  });
  const favorites = new FavoritesService({ favorites: favoritesRepository, recipes });

  return {
    path: `${API_PREFIX}/recipes`,
    router: createRecipesRouter({
      controller: new RecipesController(service),
      favorites: new FavoritesController(favorites),
      authenticate,
      optionalAuthenticate,
    }),
    service,
    favorites,
  };
};

export const recipesModule = createRecipesModule();
