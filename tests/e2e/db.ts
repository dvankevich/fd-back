import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../generated/prisma/client.ts";

if (!process.env.TEST_DATABASE_URL) {
  throw new Error("TEST_DATABASE_URL is not set");
}

const adapter = new PrismaPg({
  connectionString: process.env.TEST_DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

export default prisma;
