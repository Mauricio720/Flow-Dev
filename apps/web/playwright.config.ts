import "./e2e/fixtures/loadE2eEnvironment";
import { defineConfig, devices } from "@playwright/test";
import { e2eServerEnvironment } from "./e2e/fixtures/serverEnvironment";

const DEFAULT_BASE_URL = "http://127.0.0.1:3100";
const baseURL = process.env.E2E_BASE_URL ?? DEFAULT_BASE_URL;
const { port } = new URL(baseURL);

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/globalSetup.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  reporter: "list",
  use: { baseURL, trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: { command: `pnpm exec next dev -p ${port} -H 127.0.0.1`, url: baseURL, reuseExistingServer: !process.env.CI, env: { ...(process.env as Record<string, string>), ...e2eServerEnvironment(baseURL) } },
});
