import type { Request, Response } from "express";
import createHttpError from "http-errors";
import prisma from "../../prisma/client.ts";
import type {
  RecipesQuery,
  CreateRecipeBody,
} from "../validators/recipes.validator.ts";
import logger from "../logger.ts";

const recipeListSelect = {
  id: true,
  title: true,
  description: true,
  thumb: true,
  preview: true,
  time: true,
  category: { select: { id: true, name: true } },
  area: { select: { id: true, name: true } },
  owner: { select: { id: true, name: true, avatar: true } },
} as const;

// ---------- Public ----------

export const getRecipes = async (req: Request, res: Response) => {
  const { category, area, ingredient, page, limit } =
    res.locals.query as RecipesQuery;

  const skip = (page - 1) * limit;

  const where: any = {};

  if (category) {
    where.category = { name: { equals: category, mode: "insensitive" } };
  }
  if (area) {
    where.area = { name: { equals: area, mode: "insensitive" } };
  }
  if (ingredient) {
    where.ingredients = {
      some: {
        OR: [
          { ingredientId: ingredient },
          { ingredient: { name: { equals: ingredient, mode: "insensitive" } } },
        ],
      },
    };
  }

  const [data, total] = await Promise.all([
    prisma.recipe.findMany({
      where,
      select: recipeListSelect,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.recipe.count({ where }),
  ]);

  res.setHeader("X-Total-Count", String(total));
  res.status(200).json({ data, total, page, limit });
};

export const getPopularRecipes = async (req: Request, res: Response) => {
  const page = Number(req.query.page) || 1;
  const limit = Math.min(Number(req.query.limit) || 10, 50);
  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    prisma.recipe.findMany({
      select: {
        ...recipeListSelect,
        _count: { select: { favorites: true } },
      },
      orderBy: {
        favorites: { _count: "desc" },
      },
      skip,
      take: limit,
    }),
    prisma.recipe.count(),
  ]);

  res.setHeader("X-Total-Count", String(total));
  res.status(200).json({ data, total, page, limit });
};

export const getRecipeById = async (req: Request, res: Response) => {
  const id = String(req.params.id);

  const recipe = await prisma.recipe.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      description: true,
      thumb: true,
      preview: true,
      time: true,
      instructions: true,
      category: { select: { id: true, name: true } },
      area: { select: { id: true, name: true } },
      owner: { select: { id: true, name: true, avatar: true } },
      ingredients: {
        select: {
          measure: true,
          ingredient: {
            select: { id: true, name: true, img: true },
          },
        },
      },
    },
  });

  if (!recipe) {
    throw createHttpError(404, "Recipe not found");
  }

  const result = {
    ...recipe,
    ingredients: recipe.ingredients.map((ri) => ({
      id: ri.ingredient.id,
      name: ri.ingredient.name,
      img: ri.ingredient.img,
      measure: ri.measure,
    })),
  };

  res.status(200).json(result);
};

// ---------- Private ----------

export const createRecipe = async (req: Request, res: Response) => {
  const userId = req.user!.sub;
  const body = req.body as CreateRecipeBody;

  logger.debug({ userId, title: body.title }, "Create recipe attempt");

  const [category, area] = await Promise.all([
    prisma.category.findFirst({
      where: { name: { equals: body.category, mode: "insensitive" } },
    }),
    prisma.area.findFirst({
      where: { name: { equals: body.area, mode: "insensitive" } },
    }),
  ]);

  if (!category) throw createHttpError(400, "Category not found");
  if (!area) throw createHttpError(400, "Area not found");

  const ingredientIds = body.ingredients.map((i) => i.id);
  const existingIngredients = await prisma.ingredient.findMany({
    where: { id: { in: ingredientIds } },
    select: { id: true },
  });

  if (existingIngredients.length !== ingredientIds.length) {
    throw createHttpError(400, "One or more ingredients not found");
  }

  const recipe = await prisma.recipe.create({
    data: {
      title: body.title,
      instructions: body.instructions,
      description: body.description,
      time: body.time,
      ownerId: userId,
      categoryId: category.id,
      areaId: area.id,
      ingredients: {
        create: body.ingredients.map((i) => ({
          ingredientId: i.id,
          measure: i.measure,
        })),
      },
    },
    select: {
      ...recipeListSelect,
      instructions: true,
    },
  });

  logger.info({ userId, recipeId: recipe.id }, "Recipe created");

  res.status(201).json(recipe);
};

export const deleteRecipe = async (req: Request, res: Response) => {
  const userId = req.user!.sub;
  const id = String(req.params.id);

  const recipe = await prisma.recipe.findUnique({
    where: { id },
    select: { ownerId: true },
  });

  if (!recipe) throw createHttpError(404, "Recipe not found");
  if (recipe.ownerId !== userId) {
    throw createHttpError(403, "You can delete only your own recipes");
  }

  await prisma.recipe.delete({ where: { id } });

  logger.info({ userId, recipeId: id }, "Recipe deleted");

  res.status(204).end();
};

export const getOwnRecipes = async (req: Request, res: Response) => {
  const userId = req.user!.sub;
  const page = Number(req.query.page) || 1;
  const limit = Math.min(Number(req.query.limit) || 10, 50);
  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    prisma.recipe.findMany({
      where: { ownerId: userId },
      select: recipeListSelect,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.recipe.count({ where: { ownerId: userId } }),
  ]);

  res.setHeader("X-Total-Count", String(total));
  res.status(200).json({ data, total, page, limit });
};

export const getFavoriteRecipes = async (req: Request, res: Response) => {
  const userId = req.user!.sub;
  const page = Number(req.query.page) || 1;
  const limit = Math.min(Number(req.query.limit) || 10, 50);
  const skip = (page - 1) * limit;

  const [favorites, total] = await Promise.all([
    prisma.favorite.findMany({
      where: { userId },
      select: {
        recipe: { select: recipeListSelect },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.favorite.count({ where: { userId } }),
  ]);

  const data = favorites.map((f) => f.recipe);

  res.setHeader("X-Total-Count", String(total));
  res.status(200).json({ data, total, page, limit });
};

export const addFavorite = async (req: Request, res: Response) => {
  const userId = req.user!.sub;
  const recipeId = String(req.params.id);

  const recipe = await prisma.recipe.findUnique({
    where: { id: recipeId },
    select: { id: true },
  });

  if (!recipe) throw createHttpError(404, "Recipe not found");

  try {
    await prisma.favorite.create({
      data: { userId, recipeId },
    });
  } catch (err: any) {
    if (err.code === "P2002") {
      throw createHttpError(409, "Recipe already in favorites");
    }
    throw err;
  }

  res.status(201).json({ message: "Added to favorites" });
};

export const removeFavorite = async (req: Request, res: Response) => {
  const userId = req.user!.sub;
  const recipeId = String(req.params.id);

  const deleted = await prisma.favorite.deleteMany({
    where: { userId, recipeId },
  });

  if (deleted.count === 0) {
    throw createHttpError(404, "Recipe not found in favorites");
  }

  res.status(204).end();
};
