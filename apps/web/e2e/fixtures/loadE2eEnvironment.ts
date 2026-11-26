import { existsSync } from "node:fs";
import { join } from "node:path";

export const E2E_ENV_FILE = join(__dirname, "..", "..", ".env.e2e");

if (existsSync(E2E_ENV_FILE)) process.loadEnvFile(E2E_ENV_FILE);
