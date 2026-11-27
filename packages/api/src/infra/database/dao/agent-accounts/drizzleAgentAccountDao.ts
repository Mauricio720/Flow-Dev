import type { AgentAccountDao, CreateAgentAccountInput, SaveAgentAccountCheckInput } from "../../../../application/agent-accounts/agentAccountDao";
import type { Database } from "../../client";
import { agentAccounts } from "../../schema";
import { countAgentAccountSessions, findAgentAccount, listAgentAccounts, listLoggedInCodexAccounts } from "./agentAccountReads";
import { insertAgentAccount, markAgentAccountRemoved, markAgentAccountRemovedIfIdle, renameAgentAccount, saveAgentAccountCheck } from "./agentAccountWrites";

export class DrizzleAgentAccountDao implements AgentAccountDao {
  constructor(private readonly database: Database) {}
  insert(input: CreateAgentAccountInput) { return insertAgentAccount(this.database, input); }
  listActive(input: { ownerUserId: string; hostId: string }) { return listAgentAccounts(this.database, input.ownerUserId, input.hostId); }
  listLoggedInCodex(hostId: string) { return listLoggedInCodexAccounts(this.database, hostId); }
  findById(id: string) { return findAgentAccount(this.database, id); }
  rename(input: { id: string; label: string; version: number }) { return renameAgentAccount(this.database, input); }
  saveCheck(input: SaveAgentAccountCheckInput) { return saveAgentAccountCheck(this.database, input); }
  markRemoved(input: { id: string; at: Date }) { return markAgentAccountRemoved(this.database, input); }
  markRemovedIfIdle(input: { id: string; at: Date }) { return markAgentAccountRemovedIfIdle(this.database, input); }
  countOpenSessions(id: string) { return countAgentAccountSessions(this.database, id); }
}
