import { eq } from "drizzle-orm";
import type { HostBeat, SessionHostDao } from "../../../../application/terminal/sessionInteractionPorts";
import type { CodexStatus } from "../../../../application/terminal/codexCatalog";
import type { Database } from "../../client";
import { terminalSessionHosts } from "../../schema";

export class DrizzleSessionHostDao implements SessionHostDao {
  constructor(private readonly database: Database) {}

  async beat(input: HostBeat) {
    const values = { hostId: input.hostId, workerId: input.workerId, heartbeatAt: input.heartbeatAt };
    await this.database.insert(terminalSessionHosts).values(values).onConflictDoUpdate({ target: terminalSessionHosts.hostId, set: { workerId: input.workerId, heartbeatAt: input.heartbeatAt } });
  }

  async lastBeat(hostId: string): Promise<HostBeat | null> {
    const [row] = await this.database.select().from(terminalSessionHosts).where(eq(terminalSessionHosts.hostId, hostId)).limit(1);
    return row ?? null;
  }

  async codexStatus(hostId: string): Promise<CodexStatus | null> {
    const [row] = await this.database.select({ status: terminalSessionHosts.codexStatus }).from(terminalSessionHosts).where(eq(terminalSessionHosts.hostId, hostId)).limit(1);
    return row ? row.status as CodexStatus | null : null;
  }

  async publishCodexStatus(input: { hostId: string; status: CodexStatus }) {
    await this.database.update(terminalSessionHosts).set({ codexStatus: input.status }).where(eq(terminalSessionHosts.hostId, input.hostId));
  }
}
