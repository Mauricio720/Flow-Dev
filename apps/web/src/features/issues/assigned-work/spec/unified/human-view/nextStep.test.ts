import { describe, expect, it } from "vitest";
import { packageOf } from "@/test/taskFlow";
import { nextStepOf, type NextStepInput } from "./nextStep";

const latest = packageOf({ id: "k2", version: 2 });
const base: NextStepInput = { selected: latest, latest, canAct: true, generating: false, missingPoints: 0 };

describe("nextStepOf", () => {
  it("asks the operator to confirm open points before approving", () => {
    expect(nextStepOf({ ...base, missingPoints: 2 })).toEqual({ text: "Confirme os 2 pontos em aberto e aprove a versão 2.", toApproval: true });
  });

  it("points to the approval of the current version when nothing is open", () => {
    expect(nextStepOf(base)).toEqual({ text: "Revise esta versão e aprove para liberar a criação das tarefas.", toApproval: true });
  });

  it("tells readers who is expected to act and offers them no approval", () => {
    expect(nextStepOf({ ...base, canAct: false })).toEqual({ text: "Aguardando a pessoa operadora revisar e aprovar esta versão.", toApproval: false });
  });

  it("follows the real state of older, generating and approved versions", () => {
    expect(nextStepOf({ ...base, selected: packageOf({ id: "k1", version: 1, status: "superseded" }) }).text).toBe("Esta é uma versão anterior. A versão atual é a v2.");
    expect(nextStepOf({ ...base, generating: true }).toApproval).toBe(false);
    const approved = packageOf({ id: "k2", version: 2, status: "approved", approvedAt: "2026-10-15T12:00:00.000Z" });
    expect(nextStepOf({ ...base, selected: approved, latest: approved }).text).toBe("Spec aprovada. O próximo passo é criar as tarefas, na etapa Tarefas.");
  });
});
