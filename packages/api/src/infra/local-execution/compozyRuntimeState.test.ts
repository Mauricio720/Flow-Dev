import { execFile } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { afterEach, describe, expect, it } from "vitest";
import { isCompozyRuntimeState } from "./compozyRuntimeState";
import { checkoutState } from "./localNativeCommandAgent";

const run = promisify(execFile);
const dirs: string[] = [];
afterEach(async () => { await Promise.all(dirs.splice(0).map((path) => rm(path, { recursive: true, force: true }))); });

async function makeCheckout() {
  const checkout = await mkdtemp(join(tmpdir(), "flow-compozy-state-"));
  dirs.push(checkout);
  await run("git", ["init", checkout]);
  await writeFile(join(checkout, "AGENTS.md"), "No mandatory gates.\n");
  await mkdir(join(checkout, ".compozy", "tasks"), { recursive: true });
  return checkout;
}

describe("Compozy runtime state in a local checkout", () => {
  it("recognizes only the files the daemon owns", () => {
    expect(isCompozyRuntimeState(".compozy/compozy.db")).toBe(true);
    expect(isCompozyRuntimeState(".compozy/compozy.db-wal")).toBe(true);
    expect(isCompozyRuntimeState(".compozy/workspace.toml")).toBe(true);
    expect(isCompozyRuntimeState(".compozy/tasks/task_01.md")).toBe(false);
    expect(isCompozyRuntimeState("packages/.compozy/compozy.db")).toBe(false);
  });

  it("keeps the checkout digest stable when the daemon writes its database during a run", async () => {
    const checkout = await makeCheckout();
    const before = await checkoutState(checkout);
    await writeFile(join(checkout, ".compozy", "compozy.db"), "runtime state");
    await writeFile(join(checkout, ".compozy", "workspace.toml"), "id = \"workspace\"\n");
    const after = await checkoutState(checkout);
    expect(after.digest).toBe(before.digest);
    expect(after.files.has(".compozy/compozy.db")).toBe(false);
  });

  it("still detects other files written under .compozy", async () => {
    const checkout = await makeCheckout();
    const before = await checkoutState(checkout);
    await writeFile(join(checkout, ".compozy", "tasks", "task_01.md"), "# Task\n");
    const after = await checkoutState(checkout);
    expect(after.digest).not.toBe(before.digest);
  });
});
