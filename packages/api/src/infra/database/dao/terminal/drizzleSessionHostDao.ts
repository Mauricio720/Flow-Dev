import { eq } from "drizzle-orm";
import type { HostBeat, SessionHostDao } from "../../../../application/terminal/sessionInteractionPorts";
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
}
