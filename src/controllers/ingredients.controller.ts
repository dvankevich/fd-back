import type { Request, Response } from "express";
import prisma from "../../prisma/client.ts";
import logger from "../logger.ts";

export const getIngredients = async (_req: Request, res: Response) => {
  logger.debug("Get ingredients list");

  const ingredients = await prisma.ingredient.findMany({
    select: {
      id: true,
      name: true,
      description: true,
      img: true,
    },
    orderBy: {
      name: "asc",
    },
  });

  res.status(200).json(ingredients);
};
