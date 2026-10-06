import type { SpecClaim } from "../../database/dao/taskSpecWorkerDao";
import type { SavedAnswer } from "../../spec/specRetryContext";
import { SPEC_INITIAL_CONTEXT_MAX_BYTES } from "./specLimits";
import { specTextByteLength } from "./specTextRules";
import { TaskError } from "../tasks/taskErrors";

const SKILL_BY_STAGE = { prd: "flow-spec-prd", tech_spec: "flow-spec-techspec", tasks: "flow-spec-tasks" } as const;
export const INPUTS_DIRECTORY = "inputs";
export const OUTPUT_DIRECTORY = "candidate";

export type PromptInputs = { claim: SpecClaim; answers: SavedAnswer[]; inputFiles: string[] };

export function inlineContext(input: PromptInputs) {
  const { claim } = input;
  return JSON.stringify({ issue: claim.input.publication, planningUncertainties: claim.input.planningUncertainties, adjustment: claim.input.adjustment, answers: [...(claim.input.retryContext?.answers ?? []), ...input.answers], unavailableAnswers: claim.input.retryContext?.unavailable ?? [], route: claim.input.selectedRoute });
}

export function buildSpecPrompt(input: PromptInputs) {
  const context = inlineContext(input);
  if (specTextByteLength(context) > SPEC_INITIAL_CONTEXT_MAX_BYTES) throw new TaskError("context_limit");
  const references = input.inputFiles.map((path) => `- ${INPUTS_DIRECTORY}/${path}`).join("\n");
  const lines = [`Use the ${SKILL_BY_STAGE[input.claim.stage]} skill for stage ${input.claim.stage}.`, `Write only the stage documents under ${OUTPUT_DIRECTORY}/ and stop at this stage.`, "The pinned project is available read-only under repository/.", "Complete approved inputs are read-only files; read them in full:", references || "- (none)", "Retained context (JSON):", context];
  return lines.join("\n");
}
