import { describe, expect, it } from "vitest";
import { effectiveRoute, evaluateProposal, routeSwitchState, type ProposalFacts } from "./routeSwitchRules";

const eligible: ProposalFacts = { purpose: "route", sessionRoute: "prd", sessionStatus: "waiting", hasConfirmedSwitch: false, hasCapturedSpec: false, hasPendingProposal: false, lastDeclinedAt: null, lastAnsweredAt: null };

describe("route switch rules", () => {
  it.each(["prd", "tech_spec"] as const)("V-02a accepts an eligible %s session", (sessionRoute) => {
    expect(evaluateProposal({ ...eligible, sessionRoute })).toEqual({ kind: "accept" });
  });
  it.each([["hasConfirmedSwitch", "already_switched"], ["hasCapturedSpec", "spec_exists"]] as const)("V-02b/V-02c discards when %s is true", (key, reason) => {
    expect(evaluateProposal({ ...eligible, [key]: true })).toEqual({ kind: "discard", reason });
  });
  it("V-02d ignores a duplicate while one proposal is pending", () => {
    expect(evaluateProposal({ ...eligible, hasPendingProposal: true })).toEqual({ kind: "ignore" });
  });
  it.each([{ purpose: "generate_tasks" as const }, { sessionRoute: "direct_execution" as const }, { sessionStatus: "ended" as const }])("V-02e ignores an ineligible session", (override) => {
    expect(evaluateProposal({ ...eligible, ...override })).toEqual({ kind: "ignore" });
  });
  it("V-02f accepts the first proposal without a question response", () => {
    expect(evaluateProposal(eligible)).toEqual({ kind: "accept" });
  });
  it.each([null, new Date("2026-11-25T09:55:00Z")])("V-02g discards after decline without a newer answer", (lastAnsweredAt) => {
    expect(evaluateProposal({ ...eligible, lastDeclinedAt: new Date("2026-11-25T10:00:00Z"), lastAnsweredAt })).toEqual({ kind: "discard", reason: "declined_without_answer" });
  });
  it("V-02g accepts after an answer newer than the decline", () => {
    expect(evaluateProposal({ ...eligible, lastDeclinedAt: new Date("2026-11-25T10:00:00Z"), lastAnsweredAt: new Date("2026-11-25T10:03:00Z") })).toEqual({ kind: "accept" });
  });
  it("V-02h treats interrupted sessions as active", () => {
    expect(evaluateProposal({ ...eligible, sessionStatus: "interrupted" })).toEqual({ kind: "accept" });
    expect(routeSwitchState("pending", "interrupted")).toBe("pending");
  });
  it.each([["pending", "ended", "expired"], ["pending", "launch_failed", "expired"], ["confirmed", "ended", "confirmed"], ["declined", "ended", "declined"]] as const)("V-02i calculates %s proposal state for %s session", (status, sessionStatus, expected) => {
    expect(routeSwitchState(status, sessionStatus)).toBe(expected);
  });
  it("V-02j uses a confirmed switch only for the current decision", () => {
    expect(effectiveRoute({ approvedRoute: "prd", currentDecisionId: "d1", confirmedSwitch: null })).toBe("prd");
    expect(effectiveRoute({ approvedRoute: "prd", currentDecisionId: "d1", confirmedSwitch: { planningDecisionId: "d1" } })).toBe("direct_execution");
  });
  it("V-02k ignores a switch from an older decision", () => {
    expect(effectiveRoute({ approvedRoute: "prd", currentDecisionId: "d2", confirmedSwitch: { planningDecisionId: "d1" } })).toBe("prd");
  });
});
