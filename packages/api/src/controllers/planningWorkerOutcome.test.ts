import { describe, expect, it } from "vitest";
import { PlanningDomainError } from "../application/services/tasks/planningContracts";
import { TaskError } from "../application/services/tasks/taskErrors";
import { AgentRunError } from "../application/agents/localAgentRunner";
import { classifyPlanningError } from "./planningWorkerOutcome";

const now = new Date("2026-10-05T12:00:00.000Z");
const claim = { attempts: 1, deadline: new Date(now.getTime() + 900_000) };

describe("classifyPlanningError", () => {
  it("abandons only a stale execution silently", () => {
    expect(classifyPlanningError(new TaskError("stale_execution"), claim, now)).toEqual({ kind: "abandon", stale: true });
  });

  it("abandons unknown errors as unclassified", () => {
    expect(classifyPlanningError(new TypeError("boom"), claim, now)).toEqual({ kind: "abandon", stale: false });
  });

  it("fails invalid stored content immediately", () => {
    expect(classifyPlanningError(new TaskError("invalid_stored_content"), claim, now)).toEqual({ kind: "fail", reason: "invalid_stored_content" });
  });

  it.each(["publication_required", "planning_input_limit"] as const)("fails a domain error with its own reason %s", (reason) => {
    expect(classifyPlanningError(new PlanningDomainError(reason), claim, now)).toEqual({ kind: "fail", reason });
  });

  it("V-03k treats the local agent unavailable and invalid settings as terminal and keeps the detail", () => {
    const unavailable = new TaskError("planning_local_agent_unavailable", undefined, new AgentRunError("not_signed_in", "Codex: rode `codex login`"));
    expect(classifyPlanningError(unavailable, claim, now)).toEqual({ kind: "fail", reason: "planning_local_agent_unavailable|Codex: rode `codex login`" });
    expect(classifyPlanningError(new TaskError("planning_agent_settings_invalid"), claim, now)).toEqual({ kind: "fail", reason: "planning_agent_settings_invalid" });
  });

  it("V-03k keeps the provider unavailable and rate limited failures transient", () => {
    expect(classifyPlanningError(new TaskError("planning_provider_unavailable"), claim, now)).toMatchObject({ kind: "requeue" });
    expect(classifyPlanningError(new TaskError("planning_rate_limited"), claim, now)).toMatchObject({ kind: "requeue" });
  });

  it("names the provider when a usage limit exhausts the attempts", () => {
    const limited = new TaskError("planning_rate_limited", undefined, new AgentRunError("usage_limit", "Codex"));
    const last = { attempts: 3, deadline: new Date(now.getTime() + 900_000) };
    expect(classifyPlanningError(limited, last, now)).toEqual({ kind: "fail", reason: "planning_rate_limited|Codex" });
  });
});
