import type { Request, Response } from "express";
import prisma from "../core/database/prisma.client.ts";
import logger from "../core/logger.ts";

export const getCategories = async (_req: Request, res: Response) => {
  logger.debug("Get categories list");

  const categories = await prisma.category.findMany({
    select: {
      id: true,
      name: true,
    },
    orderBy: {
      name: "asc",
    },
  });

  res.status(200).json(categories);
};
