import { describe, expect, it } from "vitest";
import type { AgentAccountRecord } from "../../agent-accounts/agentAccountTypes";
import type { AgentAccountDao } from "../../agent-accounts/agentAccountDao";
import type { AgentAccountHome } from "../../agent-accounts/agentAccountHome";
import { AgentAccountVerification, verifiedStatus } from "./agentAccountVerification";

const account = (id: string): AgentAccountRecord => ({ id, ownerUserId: "owner", hostId: "host", provider: "claude", label: id, status: "pending_login", identity: null, plan: null, codexCatalog: null, checkedAt: null, removedAt: null, version: 1, createdAt: new Date("2026-11-25T00:00:00.000Z") });

describe("agent account verification", () => {
  it("V-02k preserves pending state on logged out and applies the other inspection transitions", () => {
    expect(verifiedStatus("pending_login", "logged_out")).toBe("pending_login");
    expect(verifiedStatus("logged_in", "logged_out")).toBe("logged_out");
    expect(verifiedStatus("pending_login", "check_failed")).toBe("check_failed");
  });

  it("V-15b limits concurrent inspections to four and verifies all accounts", async () => {
    let active = 0;
    let maximum = 0;
    const saved: string[] = [];
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const saveCheck: AgentAccountDao["saveCheck"] = async ({ id, status, checkedAt }) => { saved.push(id); return { ...account(id), status, checkedAt }; };
    const home: AgentAccountHome = { ensure: async ({ id }) => id, pathOf: ({ id }) => id, logoutAndDelete: async () => ({ logout: "ok" }) };
    const verification = new AgentAccountVerification({
      accounts: { saveCheck } as unknown as AgentAccountDao,
      home,
      inspector: { inspect: async () => { active += 1; maximum = Math.max(maximum, active); if (active === 4) release(); await gate; active -= 1; return { status: "logged_in" as const, identity: "ana@exemplo.com", plan: "max", detail: null }; } },
      now: () => new Date("2026-11-25T00:00:00.000Z"),
    });
    await verification.refresh(Array.from({ length: 10 }, (_, index) => account(`account-${index}`)));
    expect(maximum).toBe(4);
    expect(saved).toHaveLength(10);
  });
});
