import { defineConfig, devices } from "@playwright/test";
import { sessionScriptDirectory } from "./e2e/fixtures/sessionScript";
import { terminalStateDirectory } from "./e2e/fixtures/sessionFiles";

const baseURL = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000";
const terminalEnvironment = {
  FLOW_DEV_TERMINAL_ENABLED: "true",
  FLOW_DEV_SESSION_FAKE_SCRIPT: sessionScriptDirectory,
  XDG_STATE_HOME: terminalStateDirectory,
};

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/sessionWorkerSetup.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  reporter: "list",
  use: { baseURL, trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: { command: "pnpm dev", url: baseURL, reuseExistingServer: !process.env.CI, env: { ...(process.env as Record<string, string>), ...terminalEnvironment } },
});
