import { execFile } from "node:child_process";
import { mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { afterEach, describe, expect, it } from "vitest";
import { checkoutState } from "./localCheckoutState";

const run = promisify(execFile);
const directories: string[] = [];

afterEach(async () => {
  await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

async function makeCheckout() {
  const directory = await mkdtemp(join(tmpdir(), "flow-checkout-state-"));
  directories.push(directory);
  await run("git", ["init", directory]);
  return directory;
}

describe("checkoutState", () => {
  it("accepts a tracked file deletion and includes the change in the digest", async () => {
    const checkout = await makeCheckout();
    await writeFile(join(checkout, "old.md"), "Old content\n");
    await run("git", ["-C", checkout, "add", "old.md"]);
    const before = await checkoutState(checkout);
    await rm(join(checkout, "old.md"));
    await writeFile(join(checkout, "new.md"), "Replacement\n");
    const after = await checkoutState(checkout);
    expect(after.files.has("old.md")).toBe(false);
    expect(after.files.has("new.md")).toBe(true);
    expect(after.digest).not.toBe(before.digest);
    expect(after.dirty).toBe(true);
  });

  it("still rejects a symlink outside the checkout", async () => {
    const checkout = await makeCheckout();
    const outsideDirectory = await mkdtemp(join(tmpdir(), "flow-checkout-outside-"));
    directories.push(outsideDirectory);
    const outside = join(outsideDirectory, "secret.md");
    await writeFile(outside, "Outside content\n");
    await symlink(outside, join(checkout, "link.md"));
    await expect(checkoutState(checkout)).rejects.toMatchObject({ reason: "path_not_allowed" });
  });
});
