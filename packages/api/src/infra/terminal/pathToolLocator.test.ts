import { chmod, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { PathToolLocator } from "./pathToolLocator";

const directories: string[] = [];
afterEach(async () => {
  await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

async function toolDirectory(name: string, mode: number) {
  const directory = await mkdtemp(join(tmpdir(), "tools-"));
  directories.push(directory);
  await writeFile(join(directory, name), "#!/bin/sh\n");
  await chmod(join(directory, name), mode);
  return directory;
}

describe("PathToolLocator", () => {
  it("finds an executable file in a PATH directory", async () => {
    const directory = await toolDirectory("claude", 0o755);
    expect(await new PathToolLocator({ PATH: `/nonexistent:${directory}` }).has("claude")).toBe(true);
  });

  it("does not find a missing binary or a file without the execute bit", async () => {
    const directory = await toolDirectory("claude", 0o644);
    const locator = new PathToolLocator({ PATH: directory });
    expect(await locator.has("claude")).toBe(false);
    expect(await locator.has("ferramenta-inexistente")).toBe(false);
  });

  it("locates the full path of the first PATH directory that has the binary", async () => {
    const first = await toolDirectory("claude", 0o755);
    const second = await toolDirectory("claude", 0o755);
    const locator = new PathToolLocator({ PATH: `/nonexistent:${first}:${second}` });
    expect(await locator.locate("claude")).toBe(join(first, "claude"));
    expect(await locator.locate("ferramenta-inexistente")).toBeNull();
  });

  it("finds nothing when PATH is empty", async () => {
    expect(await new PathToolLocator({}).has("claude")).toBe(false);
  });
});
