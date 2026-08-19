import { Prisma } from "../../generated/prisma/client.ts";
import { PRISMA_ERROR_CODE } from "../constants/prisma.ts";

export const isUniqueViolation = (err: unknown): err is Prisma.PrismaClientKnownRequestError =>
  err instanceof Prisma.PrismaClientKnownRequestError &&
  err.code === PRISMA_ERROR_CODE.uniqueViolation;
