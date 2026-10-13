import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { DAEMON_LOG, daemonFailureDetail } from "./compozyDaemonLog";

const roots: string[] = [];
afterEach(async () => { await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))); });

describe("Compozy daemon diagnostics", () => {
  it("reads the last error from the bounded log tail", async () => {
    const root = await mkdtemp(join(tmpdir(), "flow-daemon-log-"));
    roots.push(root);
    await writeFile(join(root, DAEMON_LOG), `${"ordinary progress\n".repeat(3000)}ERROR fan-out collection unavailable\nshutdown complete\n`);
    expect(await daemonFailureDetail(root)).toBe("ERROR fan-out collection unavailable");
  });

  it("prefers the failure over a later warning that only mentions an error", async () => {
    const root = await mkdtemp(join(tmpdir(), "flow-daemon-log-"));
    roots.push(root);
    const failure = '{"level":"ERROR","msg":"daemon: execute loop action run","error":"quota_exceeded"}';
    const teardown = '{"level":"WARN","msg":"daemon: relay Goal session outbox","error":"context deadline exceeded"}';
    await writeFile(join(root, DAEMON_LOG), `${failure}\n${teardown}\n`);
    expect(await daemonFailureDetail(root)).toBe(failure);
  });

  it("returns no detail when the daemon did not report an error", async () => {
    const root = await mkdtemp(join(tmpdir(), "flow-daemon-log-"));
    roots.push(root);
    await writeFile(join(root, DAEMON_LOG), "daemon started\n");
    expect(await daemonFailureDetail(root)).toBeNull();
  });
});
