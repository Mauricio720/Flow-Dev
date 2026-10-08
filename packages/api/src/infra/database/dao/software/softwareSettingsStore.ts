import { eq } from "drizzle-orm";
import type { SettingsRecord, SettingsStore, SettingsUpdate } from "../../../../application/database/dao/softwareDao";
import type { Database } from "../../client";
import { softwareSettings } from "../../schema";

const SINGLETON_ID = 1;

type Row = typeof softwareSettings.$inferSelect;

function toRecord(row: Row): SettingsRecord {
  const { revision, enabled, docsProxyUrl, maxActiveActions, updatedAt } = row;
  return { revision, enabled, docsProxyUrl, maxActiveActions, updatedAt };
}

export class SoftwareSettingsStore implements SettingsStore {
  constructor(private readonly database: Database) {}

  async read() {
    const [row] = await this.database.select().from(softwareSettings).where(eq(softwareSettings.id, SINGLETON_ID));
    return toRecord(row!);
  }

  async lock() {
    const [row] = await this.database.select().from(softwareSettings).where(eq(softwareSettings.id, SINGLETON_ID)).for("update");
    return toRecord(row!);
  }

  async update(input: SettingsUpdate) {
    const [row] = await this.database.update(softwareSettings)
      .set({ ...input.values, revision: input.expectedRevision + 1, updatedBy: input.actorId, updatedAt: new Date() })
      .where(eq(softwareSettings.id, SINGLETON_ID)).returning();
    return toRecord(row!);
  }
}
