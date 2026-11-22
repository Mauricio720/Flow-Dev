import { fileURLToPath } from "node:url";

export const FAKE_CLI = fileURLToPath(new URL("./fakeCli.mjs", import.meta.url));
export const FIXTURES_DIRECTORY = fileURLToPath(new URL("./", import.meta.url));
