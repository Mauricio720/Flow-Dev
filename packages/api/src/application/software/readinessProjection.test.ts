import { describe, expect, it } from "vitest";
import { canAuthorizeNewStart, projectReadiness } from "./readinessProjection";

const NOW = new Date("2026-10-06T12:00:00Z");
const ready = { state: "ready" } as const;

describe("readiness projection", () => {
  it("IT-009 treats malformed or contradictory checks as unknown, never ready", () => {
    const projection = projectReadiness({
      application: ready,
      account: { state: "ready", reasonCode: "auth_required" },
      runtime: { state: "green" as never },
      host: undefined,
      checkedAt: NOW,
      now: NOW,
    });
    expect(projection.layers.application.state).toBe("ready");
    expect(projection.layers.account).toMatchObject({ state: "unknown", reasonCode: "check_contradictory" });
    expect(projection.layers.runtime).toMatchObject({ state: "unknown", reasonCode: "check_malformed" });
    expect(projection.layers.host).toMatchObject({ state: "unknown", reasonCode: "check_missing" });
    expect(canAuthorizeNewStart(projection)).toBe(false);
  });

  it("authorizes a start only when every layer is ready and fresh", () => {
    const input = { application: ready, account: ready, runtime: ready, host: ready, checkedAt: NOW };
    expect(canAuthorizeNewStart(projectReadiness({ ...input, now: NOW }))).toBe(true);
    const later = new Date(NOW.getTime() + 61_000);
    const stale = projectReadiness({ ...input, now: later });
    expect(stale.stale).toBe(true);
    expect(canAuthorizeNewStart(stale)).toBe(false);
  });
});
