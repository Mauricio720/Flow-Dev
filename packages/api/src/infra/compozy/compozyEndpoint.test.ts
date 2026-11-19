import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { resolveCompozyBaseUrl } from "./compozyEndpoint";

let home: string | undefined;
afterEach(async () => { if (home) await rm(home, { recursive: true, force: true }); home = undefined; });

async function homeWithRecord(record?: unknown) {
  home = await mkdtemp(join(tmpdir(), "flow-dev-compozy-home-"));
  if (record !== undefined) await writeFile(join(home, "daemon.json"), JSON.stringify(record));
  return { COMPOZY_HOME: home };
}

describe("resolveCompozyBaseUrl", () => {
  it("prefers COMPOZY_URL and refuses addresses outside loopback", async () => {
    await expect(resolveCompozyBaseUrl({ COMPOZY_URL: "http://localhost:2200" })).resolves.toBe("http://localhost:2200");
    await expect(resolveCompozyBaseUrl({ COMPOZY_URL: "http://10.0.0.5:2123" })).rejects.toMatchObject({ reason: "compozy_unconfigured" });
  });

  it("reads the daemon record and dials loopback for a wildcard listener", async () => {
    await expect(resolveCompozyBaseUrl(await homeWithRecord({ pid: 1, port: 2300, http_host: "0.0.0.0" }))).resolves.toBe("http://127.0.0.1:2300");
  });

  it("refuses a daemon record that points outside loopback", async () => {
    await expect(resolveCompozyBaseUrl(await homeWithRecord({ pid: 1, port: 2300, http_host: "192.168.0.9" }))).rejects.toMatchObject({ reason: "compozy_unconfigured" });
  });

  it("falls back to the default local daemon address", async () => {
    await expect(resolveCompozyBaseUrl(await homeWithRecord())).resolves.toBe("http://127.0.0.1:2123");
  });
});
