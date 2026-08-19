import { defineConfig } from "@playwright/test";
import "dotenv/config";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
if (!testDatabaseUrl) {
  throw new Error("TEST_DATABASE_URL is not set");
}

const port = process.env.E2E_PORT || "3000";
const baseURL = process.env.E2E_BASE_URL || `http://localhost:${port}`;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false, // shared DB
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [
    ["list"],
    ["html", { open: "never" }],
  ],
  timeout: 30_000,

  use: {
    baseURL,
    extraHTTPHeaders: {
      Accept: "application/json",
    },
  },

  // Start API before tests (on test DB)
  webServer: {
    command: "npx tsx index.ts",
    url: `http://localhost:${port}/api-docs`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    env: {
      ...process.env,
      DATABASE_URL: testDatabaseUrl,
      NODE_ENV: "test",
      JWT_SECRET: process.env.JWT_SECRET || "e2e-test-jwt-secret-that-is-at-least-32-chars",
      PORT: port,
    },
  },

  globalSetup: "./tests/e2e/globalSetup.ts",
});
