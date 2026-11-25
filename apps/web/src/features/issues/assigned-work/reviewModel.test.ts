import { describe, expect, it } from "vitest";
import { cycleOf } from "@/test/review";
import type { ReviewState } from "./reviewContract";
import { reviewActions, reviewHeadline, reviewTabState } from "./reviewModel";

const ASKING_STEP = { role: "review", sessionId: "s1", sessionStatus: "asking" } as const;

describe("reviewTabState", () => {
  it("V-12b is pending without a cycle and when the last cycle was stopped", () => {
    expect(reviewTabState(null)).toBe("pending");
    expect(reviewTabState(cycleOf({ state: "stopped" }))).toBe("pending");
  });

  it.each([["reviewing", "current"], ["executing", "current"], ["caveats", "yours"], ["failed", "failed"], ["approved", "done"], ["accepted", "done"]] as [ReviewState, string][])("V-12b maps %s to %s", (state, expected) => {
    expect(reviewTabState(cycleOf({ state }))).toBe(expected);
  });

  it("V-12b asks for the operator when the session of the turn has a pending question", () => {
    expect(reviewTabState(cycleOf({ state: "reviewing", step: ASKING_STEP }))).toBe("yours");
    expect(reviewTabState(cycleOf({ state: "executing", step: { ...ASKING_STEP, role: "execute" } }))).toBe("yours");
  });
});

describe("reviewHeadline", () => {
  const headline = (patch: Parameters<typeof cycleOf>[0], reader = false) => reviewHeadline(cycleOf(patch), reader);

  it("V-11f names the step and the choice of the turn", () => {
    expect(headline({ state: "reviewing", round: 2 })).toBe("Rodada 2 · Revisando com Claude Code · Opus · Máximo");
    expect(headline({ state: "executing", round: 2 })).toBe("Rodada 2 · Executando com Claude Code · Opus · Máximo");
  });

  it("V-11f words the waiting and final states", () => {
    expect(headline({ state: "approved", round: 2 })).toBe("Aprovada na rodada 2");
    expect(headline({ state: "caveats", round: 2 })).toBe("Aprovada com ressalvas na rodada 2. Aceite as ressalvas ou peça mais uma correção.");
    expect(headline({ state: "accepted", round: 2 })).toBe("Ressalvas aceitas na rodada 2");
  });

  it("V-11f words the stops and the failure with their reason", () => {
    expect(headline({ state: "stopped", round: 3, stopReason: null })).toBe("Parada por você na rodada 3");
    expect(headline({ state: "stopped", round: 3, stopReason: "Você não opera mais este trabalho." })).toBe("Parada na rodada 3: Você não opera mais este trabalho.");
    expect(headline({ state: "failed", round: 3, failure: "A sessão foi interrompida ou encerrada antes de terminar a etapa." })).toBe("Parada por falha na rodada 3: A sessão foi interrompida ou encerrada antes de terminar a etapa.");
  });

  it("V-11f words the pending answer for the operator and for readers", () => {
    expect(headline({ round: 2, step: ASKING_STEP })).toBe("Rodada 2 · Aguardando sua resposta na conversa");
    expect(headline({ round: 2, step: ASKING_STEP }, true)).toBe("Rodada 2 · Aguardando a pessoa operadora");
  });

  it("says the review has not started when there is no cycle", () => {
    expect(reviewHeadline(null, true)).toBe("A revisão ainda não começou.");
  });
});

describe("reviewActions", () => {
  it.each([["reviewing", ["stop"]], ["executing", ["stop"]], ["caveats", ["accept", "fix"]], ["failed", ["retry", "stop"]], ["approved", []], ["accepted", []], ["stopped", []]] as [ReviewState, string[]][])("V-11a offers %s the actions of the spec", (state, expected) => {
    expect(reviewActions(cycleOf({ state }))).toEqual(expected);
  });

  it("V-11a offers nothing while an action waits for the service", () => {
    expect(reviewActions(cycleOf({ state: "reviewing", pendingAction: "stop" }))).toEqual([]);
  });
});
