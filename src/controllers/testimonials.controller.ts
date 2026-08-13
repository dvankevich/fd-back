import type { Request, Response } from "express";
import prisma from "../../prisma/client.ts";
import logger from "../logger.ts";

export const getTestimonials = async (_req: Request, res: Response) => {
  logger.debug("Get testimonials list");

  const testimonials = await prisma.testimonial.findMany({
    select: {
      id: true,
      testimonial: true,
      owner: {
        select: {
          name: true,
          avatar: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  res.status(200).json(testimonials);
};
