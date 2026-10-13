import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { claimConnectorInstance, ConnectorAlreadyRunningError } from "./localConnectorInstance";

const OTHER_PID = 424242;
const roots: string[] = [];
afterEach(async () => { await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))); });

async function pidFile(recorded?: string) {
  const root = await mkdtemp(join(tmpdir(), "flow-connector-instance-"));
  roots.push(root);
  const path = join(root, "state", "connector.pid");
  if (recorded !== undefined) {
    await claimConnectorInstance(path);
    await writeFile(path, recorded);
  }
  return path;
}

describe("claimConnectorInstance", () => {
  it("records this process when no connector holds the machine", async () => {
    const path = await pidFile();
    await claimConnectorInstance(path);
    expect(await readFile(path, "utf8")).toBe(`${process.pid}\n`);
  });

  it("refuses to start while another connector keeps running", async () => {
    const path = await pidFile(`${OTHER_PID}\n`);
    const probe = { isConnector: vi.fn(async () => true), wait: vi.fn(async () => {}) };
    await expect(claimConnectorInstance(path, probe)).rejects.toBeInstanceOf(ConnectorAlreadyRunningError);
    expect(probe.isConnector).toHaveBeenCalledWith(OTHER_PID);
    expect(await readFile(path, "utf8")).toBe(`${OTHER_PID}\n`);
  });

  it("takes over once the previous connector finishes shutting down", async () => {
    const path = await pidFile(`${OTHER_PID}\n`);
    const probe = { isConnector: vi.fn().mockResolvedValueOnce(true).mockResolvedValue(false), wait: vi.fn(async () => {}) };
    await claimConnectorInstance(path, probe);
    expect(probe.wait).toHaveBeenCalledTimes(1);
    expect(await readFile(path, "utf8")).toBe(`${process.pid}\n`);
  });

  it("replaces a record left by a process that is gone or unreadable", async () => {
    const path = await pidFile("not-a-pid");
    await claimConnectorInstance(path, { isConnector: async () => true, wait: async () => {} });
    expect(await readFile(path, "utf8")).toBe(`${process.pid}\n`);
  });
});
