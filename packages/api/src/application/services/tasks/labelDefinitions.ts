import { TASK_LABEL_COLOR, TASK_LABEL_DESCRIPTION, type TaskLabel } from "../../../schemas/taskLabels";
import type { GitHubIssueLabelGateway, LabelDefinitionOutcome } from "../../github/issueGateway";

export type LabelDefinitionAction = LabelDefinitionOutcome | "failed";
export type LabelDefinitionResult = { label: TaskLabel; action: LabelDefinitionAction };
type LabelDestination = { owner: string; name: string; token: string };
type DefinitionInput = { destination: LabelDestination; labels: readonly TaskLabel[]; overwrite: boolean };

export async function defineTaskLabels(github: GitHubIssueLabelGateway, input: DefinitionInput): Promise<LabelDefinitionResult[]> {
  const results: LabelDefinitionResult[] = [];
  for (const label of new Set(input.labels)) results.push({ label, action: await defineTaskLabel(github, input, label) });
  return results;
}

async function defineTaskLabel(github: GitHubIssueLabelGateway, input: DefinitionInput, label: TaskLabel): Promise<LabelDefinitionAction> {
  try { return await github.define({ ...input.destination, label, color: TASK_LABEL_COLOR[label], description: TASK_LABEL_DESCRIPTION[label], overwrite: input.overwrite }); }
  catch { return "failed"; }
}
