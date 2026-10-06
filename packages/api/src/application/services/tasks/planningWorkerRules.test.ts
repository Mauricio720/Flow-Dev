import { describe, expect, it } from "vitest";
import { isCurrentPlanningClaim, planningRetryDelay } from "./planningWorkerRules";

const now = new Date("2026-10-05T15:00:00.000Z");
const claim = { operationId: "o", executionId: "e", fence: 2, workerId: "w", leaseUntil: new Date(now.getTime() + 60_000), state: "running" };

describe("planning worker recovery rules", () => {
  it("UT-023 recognizes the current unexpired fenced claim", () => expect(isCurrentPlanningClaim(claim, claim, now)).toBe(true));
  it("UT-024 rejects stale, expired, and failed claims", () => {
    expect(isCurrentPlanningClaim({ ...claim, fence: 1 }, claim, now)).toBe(false);
    expect(isCurrentPlanningClaim(claim, { ...claim, leaseUntil: now }, now)).toBe(false);
    expect(isCurrentPlanningClaim(claim, { ...claim, state: "failed" }, now)).toBe(false);
  });
  it("UT-025 stops after the third dispatch", () => expect(planningRetryDelay({ attempts: 3, now, deadline: new Date(now.getTime() + 900_000) })).toEqual({ terminal: true, reason: "planning_provider_unavailable" }));
  it("UT-026 clamps Retry-After to the supported delay", () => {
    const deadline = new Date(now.getTime() + 900_000);
    expect(planningRetryDelay({ attempts: 1, now, deadline, retryAfterSeconds: 600 }).nextRunAt).toEqual(new Date(now.getTime() + 60_000));
    expect(planningRetryDelay({ attempts: 1, now, deadline, retryAfterSeconds: 1 }).nextRunAt).toEqual(new Date(now.getTime() + 5_000));
  });
  it("UT-076 does not dispatch without the full request deadline", () => expect(planningRetryDelay({ attempts: 1, now, deadline: new Date(now.getTime() + 239_999) })).toEqual({ terminal: true, reason: "planning_deadline" }));
});
