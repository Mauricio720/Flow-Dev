import { afterEach, describe, expect, it } from "vitest";
import { DrizzleAgentAccountDao } from "../src/infra/database/dao/agent-accounts/drizzleAgentAccountDao";
import { DrizzleTerminalSessionDao } from "../src/infra/database/dao/terminal/drizzleTerminalSessionDao";
import { closeTaskFixture } from "./task-api-support";
import { sessionValues, world } from "./terminal-tracking-support";

afterEach(closeTaskFixture);

describe("terminal session account reference", () => {
  it("V-14c persists the selected account and defaults older sessions to null", async () => {
    const { setup, decisionId } = await world();
    const account = await new DrizzleAgentAccountDao(setup.database).insert({ ownerUserId: setup.ownerId, hostId: "host-h", provider: "claude", label: "Pessoal" });
    const sessionDao = new DrizzleTerminalSessionDao(setup.database);
    const base = sessionValues(setup, decisionId) as never;
    const withAccount = await sessionDao.create({ ...base, requestKey: crypto.randomUUID(), agentAccountId: account.id });
    const withoutAccount = await sessionDao.create({ ...base, requestKey: crypto.randomUUID() });
    expect((await sessionDao.findById(withAccount.session.id))?.agentAccountId).toBe(account.id);
    expect((await sessionDao.findById(withoutAccount.session.id))?.agentAccountId).toBeNull();
  });
});
