import { tmpdir } from "node:os";
import { join } from "node:path";

const HERE = import.meta.dirname;
export const REPO_ROOT = join(HERE, "..", "..", "..", "..");
export const OUT_DIR = join(HERE, "out");
export const SCRATCH = process.env.SPIKE_TMP ?? tmpdir();
export const SKILLS = ["spec-writer", "spec-to-tasks", "direct-executor", "spec-conformance"];
export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
