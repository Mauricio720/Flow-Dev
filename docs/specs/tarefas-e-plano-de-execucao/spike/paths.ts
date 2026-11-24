import { tmpdir } from "node:os";
import { join } from "node:path";

const HERE = import.meta.dirname;
export const OUT_DIR = join(HERE, "out");
export const SCRATCH = process.env.SPIKE_TMP ?? tmpdir();
export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
