import { defineConfig } from "@playwright/test";
import "dotenv/config";

if (!process.env.TEST_DATABASE_URL) {
  throw new Error("TEST_DATABASE_URL is not set");
}

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
    baseURL: process.env.E2E_BASE_URL || "http://localhost:3000",
    extraHTTPHeaders: {
      Accept: "application/json",
    },
  },

  // Start API before tests (on test DB)
  webServer: {
    command: "npx tsx index.ts",
    url: "http://localhost:3000/api-docs",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    env: {
      ...process.env,
      DATABASE_URL: process.env.TEST_DATABASE_URL!,
      NODE_ENV: "test",
      JWT_SECRET: process.env.JWT_SECRET || "e2e-test-jwt-secret",
      PORT: "3000",
    },
  },

  globalSetup: "./tests/e2e/global-setup.ts",
});
