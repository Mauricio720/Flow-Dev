import { createHash } from "node:crypto";
import { access, chmod, copyFile, mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

const PRIVATE_DIRECTORY_MODE = 0o700;
const PRIVATE_FILE_MODE = 0o600;
const OPAQUE_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CREDENTIAL_FILES = ["auth.json", ".credentials.json"];
const REVISION_FILE = "revision.json";

export function assertOpaqueId(value: string) {
  if (!OPAQUE_ID_PATTERN.test(value)) throw new Error("invalid_opaque_id");
}

export function fingerprintAccount(accountId: string) {
  return createHash("sha256").update(accountId).digest("hex");
}

export class CredentialHomes {
  constructor(private readonly root: string) {}

  async ensureRoot() {
    await mkdir(this.root, { recursive: true, mode: PRIVATE_DIRECTORY_MODE });
  }

  activeHome(connectionId: string) {
    assertOpaqueId(connectionId);
    return join(this.root, "connections", connectionId);
  }

  stagingHome(operationId: string) {
    assertOpaqueId(operationId);
    return join(this.root, "staging", operationId);
  }

  async createStaging(operationId: string) {
    const home = this.stagingHome(operationId);
    await mkdir(home, { recursive: true, mode: PRIVATE_DIRECTORY_MODE });
    return home;
  }

  async promote(input: { operationId: string; connectionId: string }) {
    const active = this.activeHome(input.connectionId);
    const backup = this.backupHome(input.operationId);
    await mkdir(join(this.root, "connections"), { recursive: true, mode: PRIVATE_DIRECTORY_MODE });
    await mkdir(join(this.root, "backups"), { recursive: true, mode: PRIVATE_DIRECTORY_MODE });
    await rm(backup, { recursive: true, force: true });
    const hadPrevious = await this.exists(active);
    await this.writeBackupState(input.operationId, { hadPrevious, state: "prepared" });
    if (hadPrevious) {
      await rename(active, backup);
      await this.writeBackupState(input.operationId, { hadPrevious, state: "backed_up" });
    }
    try {
      await rename(this.stagingHome(input.operationId), active);
      await this.writeBackupState(input.operationId, { hadPrevious, state: "promoted" });
    } catch (error) {
      if (await this.exists(backup)) await rename(backup, active);
      await rm(this.backupStatePath(input.operationId), { force: true });
      throw error;
    }
  }

  async rollbackPromotion(input: { operationId: string; connectionId: string }) {
    const active = this.activeHome(input.connectionId);
    const backup = this.backupHome(input.operationId);
    const state = await this.readBackupState(input.operationId);
    if (!state) return;
    if (state.state === "prepared" && state.hadPrevious && !(await this.exists(backup))) {
      await rm(this.backupStatePath(input.operationId), { force: true });
      return;
    }
    await rm(active, { recursive: true, force: true });
    if (await this.exists(backup)) await rename(backup, active);
    await rm(this.backupStatePath(input.operationId), { force: true });
  }

  async completePromotion(operationId: string) {
    await rm(this.backupHome(operationId), { recursive: true, force: true });
    await rm(this.backupStatePath(operationId), { force: true });
  }

  async remove(connectionId: string, operationId = connectionId) {
    const active = this.activeHome(connectionId);
    const backup = this.backupHome(`disconnect-${operationId}`);
    await mkdir(join(this.root, "backups"), { recursive: true, mode: PRIVATE_DIRECTORY_MODE });
    await rm(backup, { recursive: true, force: true });
    if (await this.exists(active)) await rename(active, backup);
  }

  async rollbackRemoval(connectionId: string, operationId = connectionId) {
    const active = this.activeHome(connectionId);
    const backup = this.backupHome(`disconnect-${operationId}`);
    await rm(active, { recursive: true, force: true });
    if (await this.exists(backup)) await rename(backup, active);
  }

  async completeRemoval(connectionId: string, operationId = connectionId) {
    await rm(this.backupHome(`disconnect-${operationId}`), { recursive: true, force: true });
  }

  async createGrant(input: { connectionId: string; attemptId: string }) {
    assertOpaqueId(input.attemptId);
    const grant = join(this.root, "grants", input.attemptId);
    await mkdir(grant, { recursive: true, mode: PRIVATE_DIRECTORY_MODE });
    const present = await this.presentCredentialFiles(input.connectionId);
    if (present.length === 0) throw new Error("auth_required");
    for (const file of present) {
      await copyFile(join(this.activeHome(input.connectionId), file), join(grant, file));
      await chmod(join(grant, file), PRIVATE_FILE_MODE);
    }
    return grant;
  }

  async releaseGrant(attemptId: string) {
    assertOpaqueId(attemptId);
    await rm(join(this.root, "grants", attemptId), { recursive: true, force: true });
  }

  async hasCredentials(connectionId: string) {
    return (await this.presentCredentialFiles(connectionId)).length > 0;
  }

  private async presentCredentialFiles(connectionId: string) {
    const checks = await Promise.all(CREDENTIAL_FILES.map((file) => access(join(/*turbopackIgnore: true*/ this.activeHome(connectionId), file)).then(() => file, () => null)));
    return checks.filter((file): file is string => file !== null);
  }

  async discardStaging(operationId: string) {
    await rm(this.stagingHome(operationId), { recursive: true, force: true });
  }

  async readRevision(connectionId: string) {
    try {
      const parsed = JSON.parse(await readFile(join(this.activeHome(connectionId), REVISION_FILE), "utf8"));
      return Number.isInteger(parsed.revision) ? (parsed.revision as number) : 0;
    } catch {
      return 0;
    }
  }

  async writeRevision(input: { home: string; revision: number }) {
    const body = JSON.stringify({ revision: input.revision });
    await writeFile(join(input.home, REVISION_FILE), body, { mode: PRIVATE_FILE_MODE });
  }

  private backupHome(operationId: string) { return join(this.root, "backups", operationId); }

  private backupStatePath(operationId: string) { return `${this.backupHome(operationId)}.json`; }

  private async writeBackupState(operationId: string, state: { hadPrevious: boolean; state: string }) {
    await writeFile(this.backupStatePath(operationId), JSON.stringify(state), { mode: PRIVATE_FILE_MODE });
  }

  private async readBackupState(operationId: string): Promise<{ hadPrevious: boolean; state: string } | null> {
    try { return JSON.parse(await readFile(this.backupStatePath(operationId), "utf8")); } catch { return null; }
  }

  private exists(path: string) { return access(path).then(() => true, () => false); }
}
