import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PrivateRegistryStore } from "../infra/local-execution/privateRegistry";
import type { LocalCatalog } from "../infra/local-execution/localProviderCatalog";
import { LocalConnectorClient } from "./localConnector";

const roots: string[] = [];
const accepted = () => new Response(JSON.stringify({ credentialGeneration: 1, credentialExpiresAt: new Date(Date.now() + 60_000).toISOString() }), { status: 200 });
const keyOf = (call: unknown[] | undefined) => JSON.parse(String((call?.[1] as { body: string }).body)).requestKey as string;
const LOOP: LocalCatalog["loops"][number] = { name: "review-and-fix", version: "1", source: "marketplace", enabled: true, description: "Review", inputs: [], runtimeRoles: ["main"], runtimeLocked: false, requires: [] };

afterEach(async () => { await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))); });

async function pairedStore() {
  const directory = await mkdtemp(join(tmpdir(), "flow-cli-heartbeat-key-"));
  roots.push(directory);
  const store = new PrivateRegistryStore(join(directory, "registry.json"));
  await store.write({ version: 1, entries: [], machine: { server: "https://flow.test", machineId: "machine-1", label: "Laptop", token: "token", expiresAt: new Date(Date.now() + 60_000).toISOString(), credentialGeneration: 1 } });
  return store;
}

describe("heartbeat request key", () => {
  it("sends a fresh key when the catalog changed after a heartbeat whose answer was lost", async () => {
    const store = await pairedStore();
    const catalog: LocalCatalog = { providers: [], loops: [] };
    const fetcher = vi.fn().mockRejectedValueOnce(new Error("network dropped")).mockImplementation(async () => accepted());
    const client = new LocalConnectorClient(fetcher, async () => catalog);
    await expect(client.heartbeat(store)).rejects.toThrow("connector_unavailable");
    catalog.loops = [LOOP];
    await store.write({ ...(await store.read()), providerCatalogCheckedAt: new Date(0).toISOString() });
    await client.heartbeat(store);
    expect(keyOf(fetcher.mock.calls[1])).not.toBe(keyOf(fetcher.mock.calls[0]));
    expect((await store.read()).pendingHeartbeat).toBeUndefined();
  });

  it("replaces a pending key that does not record the payload it was created for", async () => {
    const store = await pairedStore();
    await store.write({ ...(await store.read()), pendingHeartbeat: { requestKey: "stuck-key" } });
    const fetcher = vi.fn(async () => accepted());
    await new LocalConnectorClient(fetcher, async () => ({ providers: [], loops: [] })).heartbeat(store);
    expect(keyOf(fetcher.mock.calls[0])).not.toBe("stuck-key");
  });
});
