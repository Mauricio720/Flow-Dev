import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const TEST_TOKEN_KEY = "0".repeat(64);
const TEST_OAUTH_ENV = { GITHUB_REPOSITORY_TOKEN_KEY: TEST_TOKEN_KEY, GITHUB_REPOSITORY_CLIENT_ID: "integration-client-id", GITHUB_REPOSITORY_CLIENT_SECRET: "integration-client-secret" };

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("../../apps/web/src", import.meta.url)), "@flow-dev/api/server": fileURLToPath(new URL("./src/server.ts", import.meta.url)) } },
  test: { include: ["test/**/*.test.ts"], globalSetup: ["./test/databaseTemplate.ts"], env: TEST_OAUTH_ENV, testTimeout: 15000, hookTimeout: 15000 },
});
