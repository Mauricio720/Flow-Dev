import { chmod, mkdir, open, readFile, rename, rm } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { dirname } from "node:path";
import type { LocalProviderCatalogEntry } from "../../application/database/dao/localConnectorDao";
import { localProviderCatalogSchema } from "../../application/services/local-execution/localProtocol";
import { localLoopCatalogSchema } from "../../application/services/local-execution/localLoopCatalog";
import type { LoopDefinition } from "../../application/software/compozyControlGateway";

export type RegistryEntry = { handle: string; key: string; root: string; repository: string; label: string };
export type PendingPairing = { server: string; pairingId: string; pollingSecret: string; requestKey: string; expiresAt: string };
export type LocalMachineCredential = { server: string; machineId: string; label: string; token: string; expiresAt: string; credentialGeneration?: number; providerCatalogHash?: string };
export type PendingHeartbeat = { requestKey: string };
export type PendingRevocation = { server: string; machineId: string; token: string; requestKey: string };
export type PrivateRegistry = { version: 1; entries: RegistryEntry[]; pendingPairing?: PendingPairing; pendingRevocation?: PendingRevocation; pendingHeartbeat?: PendingHeartbeat; providerCatalog?: LocalProviderCatalogEntry[]; loopCatalog?: LoopDefinition[]; providerCatalogCheckedAt?: string; machine?: LocalMachineCredential };

export class PrivateRegistryStore {
  constructor(private readonly path: string) {}

  async read(): Promise<PrivateRegistry> {
    try {
      const value = JSON.parse(await readFile(this.path, "utf8")) as PrivateRegistry;
      if (!isRegistry(value)) throw new Error("registry_invalid");
      return value;
    } catch (error) {
      if (isMissing(error)) return { version: 1, entries: [] };
      throw new Error("registry_invalid", { cause: error });
    }
  }

  async write(value: PrivateRegistry): Promise<void> {
    await mkdir(dirname(this.path), { recursive: true, mode: 0o700 });
    const temporary = this.path + "." + randomUUID() + ".tmp";
    const handle = await open(temporary, "wx", 0o600);
    try {
      await handle.writeFile(JSON.stringify(value), "utf8");
      await handle.sync();
    } finally { await handle.close(); }
    await chmod(temporary, 0o600);
    await rename(temporary, this.path);
    const directory = await open(dirname(this.path), "r");
    try { await directory.sync(); } finally { await directory.close(); }
  }

  async remove(): Promise<void> { await rm(this.path, { force: true }); }
}

function isMissing(error: unknown) { return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT"; }
function isRegistry(value: unknown): value is PrivateRegistry {
  if (!value || typeof value !== "object" || !("version" in value) || value.version !== 1 || !("entries" in value) || !Array.isArray(value.entries)) return false;
  if (!(value.entries as unknown[]).every(isEntry)) return false;
  if ("providerCatalog" in value && value.providerCatalog !== undefined && !localProviderCatalogSchema.safeParse(value.providerCatalog).success) return false;
  if ("loopCatalog" in value && value.loopCatalog !== undefined && !localLoopCatalogSchema.safeParse(value.loopCatalog).success) return false;
  if ("providerCatalogCheckedAt" in value && value.providerCatalogCheckedAt !== undefined && !isString(value.providerCatalogCheckedAt)) return false;
  if ("machine" in value && value.machine !== undefined && !isMachine(value.machine)) return false;
  if ("pendingPairing" in value && value.pendingPairing !== undefined && !isPendingPairing(value.pendingPairing)) return false;
  if ("pendingRevocation" in value && value.pendingRevocation !== undefined && !isPendingRevocation(value.pendingRevocation)) return false;
  if ("pendingHeartbeat" in value && value.pendingHeartbeat !== undefined && (!isRecord(value.pendingHeartbeat) || !isString(value.pendingHeartbeat.requestKey))) return false;
  return true;
}
function isEntry(value: unknown): value is RegistryEntry { return isRecord(value) && isString(value.handle) && isString(value.key) && isString(value.root) && isString(value.repository) && isString(value.label); }
function isMachine(value: unknown): value is LocalMachineCredential { return isRecord(value) && isString(value.server) && isString(value.machineId) && isString(value.label) && isString(value.token) && isString(value.expiresAt) && (!("credentialGeneration" in value) || (typeof value.credentialGeneration === "number" && Number.isInteger(value.credentialGeneration) && value.credentialGeneration > 0)) && (!("providerCatalogHash" in value) || isString(value.providerCatalogHash)); }
function isPendingPairing(value: unknown): value is PendingPairing { return isRecord(value) && isString(value.server) && isString(value.pairingId) && isString(value.pollingSecret) && isString(value.requestKey) && isString(value.expiresAt); }
function isPendingRevocation(value: unknown): value is PendingRevocation { return isRecord(value) && isString(value.server) && isString(value.machineId) && isString(value.token) && isString(value.requestKey); }
function isRecord(value: unknown): value is Record<string, unknown> { return !!value && typeof value === "object" && !Array.isArray(value); }
function isString(value: unknown): value is string { return typeof value === "string" && value.length > 0; }
