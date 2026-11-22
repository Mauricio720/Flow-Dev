import { and, eq } from "drizzle-orm";
import type { Database } from "../../client";
import { projectAgentSettings } from "../../schema";
import type { AgentSettingsDao, SaveAgentSettingInput, StoredAgentSetting } from "../../../../application/database/dao/agentSettingsDao";
import type { AgentKind } from "../../../../application/agents/agentTypes";

type Row = typeof projectAgentSettings.$inferSelect;

function toStored(row: Row): StoredAgentSetting {
  return { ...row, agent: row.agent as AgentKind, provider: row.provider as StoredAgentSetting["provider"], effort: row.effort as StoredAgentSetting["effort"] };
}

export class DrizzleAgentSettingsDao implements AgentSettingsDao {
  constructor(private readonly database: Database) {}

  async list(projectId: string) {
    const rows = await this.database.select().from(projectAgentSettings).where(eq(projectAgentSettings.projectId, projectId));
    return rows.map(toStored);
  }

  async find(projectId: string, agent: AgentKind) {
    const filter = and(eq(projectAgentSettings.projectId, projectId), eq(projectAgentSettings.agent, agent));
    const [row] = await this.database.select().from(projectAgentSettings).where(filter).limit(1);
    return row ? toStored(row) : null;
  }

  async save(input: SaveAgentSettingInput) {
    return input.expectedVersion === 0 ? this.insertFirst(input) : this.updateVersioned(input);
  }

  private async insertFirst(input: SaveAgentSettingInput) {
    const values = { projectId: input.projectId, agent: input.agent, provider: input.provider, model: input.model, effort: input.effort, version: 1, updatedBy: input.updatedBy };
    const [row] = await this.database.insert(projectAgentSettings).values(values).onConflictDoNothing().returning();
    return row ? toStored(row) : null;
  }

  private async updateVersioned(input: SaveAgentSettingInput) {
    const filter = and(eq(projectAgentSettings.projectId, input.projectId), eq(projectAgentSettings.agent, input.agent), eq(projectAgentSettings.version, input.expectedVersion));
    const changes = { provider: input.provider, model: input.model, effort: input.effort, version: input.expectedVersion + 1, updatedBy: input.updatedBy, updatedAt: new Date() };
    const [row] = await this.database.update(projectAgentSettings).set(changes).where(filter).returning();
    return row ? toStored(row) : null;
  }
}
