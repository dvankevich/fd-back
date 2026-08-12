import type { Request, Response } from "express";
import prisma from "../../prisma/client.ts";
import logger from "../logger.ts";

export const getAreas = async (_req: Request, res: Response) => {
  logger.debug("Get areas list");

  const areas = await prisma.area.findMany({
    select: {
      id: true,
      name: true,
    },
    orderBy: {
      name: "asc",
    },
  });

  res.status(200).json(areas);
};
