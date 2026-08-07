import "dotenv/config";
import { execSync } from "node:child_process";

export default async function globalSetup() {
  if (!process.env.TEST_DATABASE_URL) {
    throw new Error("TEST_DATABASE_URL is not set in environment");
  }

  console.log("Running migrations on test database...");

  execSync("npx prisma migrate deploy", {
    stdio: "inherit",
    env: {
      ...process.env,
      DATABASE_URL: process.env.TEST_DATABASE_URL,
    },
  });

  console.log("Test database is ready");
}
