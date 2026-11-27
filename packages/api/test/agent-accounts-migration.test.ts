import { afterEach, describe, expect, it } from "vitest";
import { applyMigration, testDatabase } from "./database";

describe("0057 agent accounts migration", () => {
  let close: (() => Promise<void>) | undefined;
  afterEach(async () => close?.());

  it("V-14a applies nullable session account column and rolls the feature schema back", async () => {
    const setup = await testDatabase(false, "0057_agent_accounts");
    close = setup.close;
    await applyMigration(setup.client, "0057_agent_accounts");
    const [schema] = await setup.client`
      select to_regclass('agent_accounts') as accounts,
        to_regclass('task_agent_accounts') as choices,
        (select is_nullable from information_schema.columns where table_name = 'task_terminal_sessions' and column_name = 'agent_account_id') as nullable
    `;
    expect(schema).toEqual({ accounts: "agent_accounts", choices: "task_agent_accounts", nullable: "YES" });
    await applyMigration(setup.client, "0057_agent_accounts_rollback");
    const [rolledBack] = await setup.client`
      select to_regclass('agent_accounts') as accounts,
        to_regclass('task_agent_accounts') as choices,
        (select count(*)::int from information_schema.columns where table_name = 'task_terminal_sessions' and column_name = 'agent_account_id') as account_columns
    `;
    expect(rolledBack).toEqual({ accounts: null, choices: null, account_columns: 0 });
    const [sessions] = await setup.client`select count(*)::int as count from task_terminal_sessions`;
    expect(sessions?.count).toBe(0);
    await applyMigration(setup.client, "0057_agent_accounts");
  });
});
