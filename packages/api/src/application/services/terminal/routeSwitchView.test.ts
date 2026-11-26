import { describe, expect, it } from "vitest";
import type { RouteSwitchRecord } from "../../database/dao/routeSwitchDao";
import { toDecidedRouteSwitchView, toRouteSwitchView } from "./routeSwitchView";

const record: RouteSwitchRecord = { id: "p1", taskId: "t1", planningDecisionId: "d1", sessionId: "s1", fromRoute: "prd", toRoute: "direct_execution", summary: "Resumo", reasons: ["Motivo"], status: "pending", decidedByUserId: null, decidedByName: null, decidedAt: null, decisionRequestKey: null, proposedAt: new Date("2026-11-25T10:00:00.000Z") };

describe("toRouteSwitchView", () => {
  it("V-02l calculates expiration and serializes proposal dates", () => {
    expect(toRouteSwitchView(record, "ended")).toEqual({ id: "p1", fromRoute: "prd", toRoute: "direct_execution", summary: "Resumo", reasons: ["Motivo"], state: "expired", decidedBy: null, decidedAt: null, proposedAt: "2026-11-25T10:00:00.000Z" });
  });
  it("V-02l returns confirmed state and the deciding user's name", () => {
    expect(toRouteSwitchView({ ...record, status: "confirmed", decidedByName: "Ana", decidedAt: new Date("2026-11-25T10:06:00.000Z") }, "waiting")).toMatchObject({ state: "confirmed", decidedBy: "Ana", decidedAt: "2026-11-25T10:06:00.000Z" });
  });
});

describe("toDecidedRouteSwitchView", () => {
  const decidedAt = new Date("2026-11-25T10:06:00.000Z");

  it("V-02l keeps the decided state and the deciding user without a session status", () => {
    expect(toDecidedRouteSwitchView({ ...record, status: "confirmed", decidedByName: "Ana", decidedAt })).toMatchObject({ state: "confirmed", decidedBy: "Ana", decidedAt: "2026-11-25T10:06:00.000Z" });
    expect(toDecidedRouteSwitchView({ ...record, status: "declined", decidedByName: "Ana", decidedAt })).toMatchObject({ state: "declined", decidedBy: "Ana", decidedAt: "2026-11-25T10:06:00.000Z" });
  });
});
