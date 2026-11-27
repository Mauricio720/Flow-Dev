import type { AgentChoice } from "../../terminal/sessionAgentCatalog";
import type { PlanItemDraft, StoredPlanItem } from "./planTypes";
import type { TaskSet, TaskSetTask, TaskStatus } from "./taskSetTypes";

export const OPUS_MAX: AgentChoice = { agent: "claude", model: "opus", effort: "max" };
export const SONNET_HIGH: AgentChoice = { agent: "claude", model: "sonnet", effort: "high" };

type SetInput = { ids: string[]; edges?: Array<[string, string]>; statuses?: Record<string, TaskStatus> };

export function taskSetOf(input: SetInput): TaskSet {
  const tasks: TaskSetTask[] = input.ids.map((id) => ({
    id,
    number: id.slice("task_".length),
    title: `Tarefa ${id}`,
    type: "backend",
    complexity: "medium",
    dependsOn: (input.edges ?? []).filter(([, to]) => to === id).map(([from]) => from),
    status: input.statuses?.[id] ?? "pending",
    miniDone: 0,
    miniTotal: 1,
    artifactId: `artifact-${id}`,
    path: `docs/specs/login/${id}.md`,
  }));
  return { folder: "docs/specs/login", manifestArtifactId: "manifest", manifestVersion: 1, problem: null, otherFolders: [], tasks };
}

export function draftOf(taskIds: string[], overrides: Partial<PlanItemDraft> = {}): PlanItemDraft {
  return { taskIds, choice: OPUS_MAX, after: [], ...overrides };
}

export function storedItem(overrides: Partial<StoredPlanItem> & { id: string; taskIds: string[] }): StoredPlanItem {
  return { position: 1, choice: OPUS_MAX, after: [], forced: null, started: false, latestSession: null, ...overrides };
}
