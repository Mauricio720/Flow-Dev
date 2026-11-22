import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { taskIssueClaims, taskPlanningDecisions, tasks } from "../src/infra/database/schema";
import { terminalHarness, type HarnessOptions } from "./terminal-harness";
import { approvedWork, gitClone, linkClone } from "./terminal-support";

export async function readySetup(options: HarnessOptions = {}) {
  const setup = await approvedWork();
  const clone = await gitClone();
  await linkClone(setup, clone);
  return { setup, clone, harness: await terminalHarness(setup, options) };
}

export async function fingerprint(folder: string): Promise<string[]> {
  const entries = await readdir(folder, { withFileTypes: true, recursive: true }).catch(() => []);
  const lines = await Promise.all(entries.filter((entry) => entry.isFile()).map(async (entry) => {
    const path = join(entry.parentPath, entry.name);
    return `${path}:${createHash("sha256").update(await readFile(path)).digest("hex")}`;
  }));
  return lines.sort();
}

export async function rowsOf(setup: Awaited<ReturnType<typeof approvedWork>>) {
  const db = setup.database;
  return JSON.stringify([await db.select().from(tasks), await db.select().from(taskPlanningDecisions), await db.select().from(taskIssueClaims)]);
}

