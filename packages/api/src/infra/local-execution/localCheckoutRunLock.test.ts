import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { acquireLocalCheckoutRunLock, releaseLocalCheckoutRunLock } from "./localCheckoutRunLock";

const roots: string[] = [];
afterEach(async () => { await Promise.all(roots.splice(0).map((path) => rm(path, { recursive: true, force: true }))); });

describe("local checkout run lock", () => {
  it("retains an unknown run's lock across recovery and releases only its owner", async () => {
    const root = await mkdtemp(join(tmpdir(), "flow-checkout-lock-"));
    roots.push(root);
    await acquireLocalCheckoutRunLock(root, "canonical-checkout", "run-one");
    await acquireLocalCheckoutRunLock(root, "canonical-checkout", "run-one");
    await expect(acquireLocalCheckoutRunLock(root, "canonical-checkout", "run-two")).rejects.toMatchObject({ reason: "checkout_busy" });
    await releaseLocalCheckoutRunLock(root, "canonical-checkout", "run-two");
    await expect(acquireLocalCheckoutRunLock(root, "canonical-checkout", "run-two")).rejects.toMatchObject({ reason: "checkout_busy" });
    await releaseLocalCheckoutRunLock(root, "canonical-checkout", "run-one");
    await acquireLocalCheckoutRunLock(root, "canonical-checkout", "run-two");
  });
});
