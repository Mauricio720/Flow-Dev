import { mkdir, mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { CATALOG_DIRECTORY_PREFIX, sweepStaleCatalogDaemons } from "./catalogDaemonCleanup";

const SIX_MINUTES_MS = 6 * 60_000;
const roots: string[] = [];
const exists = (path: string) => stat(path).then(() => true, () => false);

afterEach(async () => { await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))); });

describe("catalog daemon cleanup", () => {
  it("removes catalog folders left behind long ago and keeps a discovery that is still in flight", async () => {
    const root = await mkdtemp(join(tmpdir(), "flow-catalog-sweep-"));
    roots.push(root);
    const leftover = join(root, `${CATALOG_DIRECTORY_PREFIX}old`);
    const unrelated = join(root, "another-tool");
    await mkdir(join(leftover, ".compozy"), { recursive: true });
    await mkdir(unrelated);
    await sweepStaleCatalogDaemons(root);
    expect(await exists(leftover)).toBe(true);
    await sweepStaleCatalogDaemons(root, Date.now() + SIX_MINUTES_MS);
    expect(await exists(leftover)).toBe(false);
    expect(await exists(unrelated)).toBe(true);
  });
});
