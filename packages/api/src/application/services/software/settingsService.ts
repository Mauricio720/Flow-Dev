import type { SessionPrincipal } from "../../../context";
import type { SettingsRecord, SettingsValues, SoftwareDao } from "../../database/dao/softwareDao";
import { assertSettingsValues, requestHash } from "./settingsRules";
import { replayedAudit, requireAdmin } from "./softwareAccess";
import { SoftwareError } from "./softwareErrors";

export type SaveSettingsInput = { values: SettingsValues; expectedRevision: number; idempotencyKey: string };
export type SettingsView = { revision: number; settings: SettingsValues };

const SETTINGS_SAVED_EVENT = "settings.saved";

function view(record: SettingsRecord): SettingsView {
  const { revision, enabled, docsProxyUrl, maxActiveActions } = record;
  return { revision, settings: { enabled, docsProxyUrl, maxActiveActions } };
}

export class SettingsService {
  constructor(private readonly dao: SoftwareDao) {}

  async get(actor: SessionPrincipal) {
    await requireAdmin(this.dao, actor);
    const record = await this.dao.settings.read();
    return { ...view(record), updatedAt: record.updatedAt };
  }

  async save(actor: SessionPrincipal, input: SaveSettingsInput): Promise<SettingsView> {
    await requireAdmin(this.dao, actor);
    assertSettingsValues(input.values);
    return this.dao.transaction((dao) => new SettingsService(dao).saveLocked(actor, input));
  }

  private async saveLocked(actor: SessionPrincipal, input: SaveSettingsInput): Promise<SettingsView> {
    const current = await this.dao.settings.lock();
    const hash = requestHash({ values: input.values, expectedRevision: input.expectedRevision });
    const replay = await replayedAudit(this.dao, { idempotencyKey: input.idempotencyKey, requestHash: hash });
    if (replay) return replay.diff.after as SettingsView;
    if (current.revision !== input.expectedRevision) throw new SoftwareError("plan_version_changed", undefined, { revision: current.revision });
    const saved = view(await this.dao.settings.update({ values: input.values, actorId: actor.userId, expectedRevision: input.expectedRevision }));
    await this.dao.audit.append({ actorId: actor.userId, event: SETTINGS_SAVED_EVENT, diff: { before: view(current), after: saved }, idempotencyKey: input.idempotencyKey, requestHash: hash });
    return saved;
  }
}
