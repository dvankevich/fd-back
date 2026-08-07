import { execSync } from "node:child_process";
import "dotenv/config";

async function globalSetup() {
  if (!process.env.TEST_DATABASE_URL) {
    throw new Error("TEST_DATABASE_URL is not set");
  }

  console.log("E2E: running migrations on test database...");

  execSync("npx prisma migrate deploy", {
    stdio: "inherit",
    env: {
      ...process.env,
      DATABASE_URL: process.env.TEST_DATABASE_URL,
    },
  });

  console.log("E2E: test database ready");
}

export default globalSetup;
