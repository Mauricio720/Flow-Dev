import { join } from "node:path";
import { defineConfig, devices } from "@playwright/test";
import { terminalStateDirectory } from "./e2e/fixtures/terminalLaunch";

const baseURL = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000";
const terminalEnvironment = {
  FLOW_DEV_TERMINAL_ENABLED: "true",
  FLOW_DEV_TERMINAL_FAKE_LAUNCH_FILE: join(terminalStateDirectory, "launch.json"),
  XDG_STATE_HOME: terminalStateDirectory,
};

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  reporter: "list",
  use: { baseURL, trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: { command: "pnpm dev", url: baseURL, reuseExistingServer: !process.env.CI, env: { ...(process.env as Record<string, string>), ...terminalEnvironment } },
});
