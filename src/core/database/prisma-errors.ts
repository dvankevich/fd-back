import { Prisma } from "./prisma.ts";

export const PRISMA_ERROR_CODE = {
  uniqueViolation: "P2002",
  foreignKeyViolation: "P2003",
  notFound: "P2025",
} as const;

export const isUniqueViolation = (err: unknown): err is Prisma.PrismaClientKnownRequestError =>
  err instanceof Prisma.PrismaClientKnownRequestError &&
  err.code === PRISMA_ERROR_CODE.uniqueViolation;
