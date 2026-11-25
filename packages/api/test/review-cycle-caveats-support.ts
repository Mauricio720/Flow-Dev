import type { ScriptStep } from "../src/infra/terminal/scriptedSessionSteps";
import { reviewCycleWorkerWorld } from "./review-cycle-world";
import { cycleRow } from "./review-cycle-rounds-support";
import { tickUntil } from "./review-cycle-sessions-support";
import { FOLDER } from "./plan-support";

export const REPORT_004 = `${FOLDER}/reviews/review-004.md`;
export const REPORT_005 = `${FOLDER}/reviews/review-005.md`;
const STAGE_PATH = `${FOLDER}/reviews/etapa.md`;
const REPORT_CONTENT = "Relatório de ressalvas";
const ROUND_THREE_QUESTION: ScriptStep = { kind: "ask", questions: [{ question: "Revisar agora?", header: "Revisão", options: [{ label: "Sim", description: "Continuar" }] }] };
const WRITE_EXECUTE_STAGE: ScriptStep[] = [
  { kind: "write_file", path: REPORT_004, content: "Reprovado" },
  { kind: "write_file", path: STAGE_PATH, content: `etapa: execute\nrelatorio: ${REPORT_004}\n` },
  { kind: "end_turn" },
  { kind: "wait_message" },
];
export const REVIEW_TO_CAVEATS: ScriptStep[] = [
  ...WRITE_EXECUTE_STAGE,
  { kind: "write_file", path: REPORT_005, content: REPORT_CONTENT },
  { kind: "write_file", path: STAGE_PATH, content: `etapa: ressalvas\nrelatorio: ${REPORT_005}\n` },
  { kind: "end_turn" },
  { kind: "wait_message" },
  ROUND_THREE_QUESTION,
];
export const EXECUTION_TWICE: ScriptStep[] = [
  { kind: "write_file", path: STAGE_PATH, content: "etapa: review\n" },
  { kind: "end_turn" },
  { kind: "wait_message" },
  { kind: "write_file", path: STAGE_PATH, content: "etapa: review\n" },
  { kind: "end_turn" },
  { kind: "wait_message" },
];
export const CAVEATS_ONCE: ScriptStep[] = [
  { kind: "write_file", path: REPORT_004, content: REPORT_CONTENT },
  { kind: "write_file", path: STAGE_PATH, content: `etapa: ressalvas\nrelatorio: ${REPORT_004}\n` },
  { kind: "end_turn" },
];

export async function caveatsRoundTwoWorld() {
  const world = await reviewCycleWorkerWorld(REVIEW_TO_CAVEATS, EXECUTION_TWICE);
  await tickUntil(world, (current) => current.state === "caveats" && current.round === 2);
  return world;
}

export async function requestAction(world: Awaited<ReturnType<typeof caveatsRoundTwoWorld>>, action: "accept" | "fix") {
  const current = await cycleRow(world);
  await world.service.request({ taskId: world.setup.taskId, cycleId: current.id, revision: current.revision, action, by: world.setup.ownerId, at: world.worker.clock.now() });
}
