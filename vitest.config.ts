import { defineConfig } from "vitest/config";
import path from "node:path";

const TEST_ENV = {
  NODE_ENV: "test",
  JWT_SECRET: "test-secret-key-at-least-32-characters-long",
  DATABASE_URL: "postgresql://test:test@localhost:5432/testdb",
} as const;

export default defineConfig({
  test: {
    globals: true,
    env: TEST_ENV,
    include: ["tests/**/*.test.ts"],
    exclude: ["**/node_modules/**", "**/dist/**", "**/tests/e2e/**", "**/tests/integration/**"],
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
});
