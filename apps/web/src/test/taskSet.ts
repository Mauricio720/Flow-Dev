import type { SpecItem, TaskItem, TaskSetData, TaskSetView } from "@/features/issues/assigned-work/taskSetContract";

export const FOLDER = "docs/specs/login";
export const MANIFEST_ID = "00000000-0000-4000-8000-0000000000b0";

export function taskOf(number: string, patch: Partial<TaskItem> = {}): TaskItem {
  const id = `task_${number}`;
  return { id, number, title: `Tarefa ${number}`, type: "backend", complexity: "medium", dependsOn: [], status: "pending", miniDone: 0, miniTotal: 3, artifactId: `00000000-0000-4000-8000-0000000000c${number}`, path: `${FOLDER}/${id}.md`, ...patch };
}

export function setOf(tasks: TaskItem[], patch: Partial<TaskSetData> = {}): TaskSetData {
  return { folder: FOLDER, manifestArtifactId: MANIFEST_ID, manifestVersion: 1, problem: null, otherFolders: [], tasks, ...patch };
}

export function specOf(path = `${FOLDER}/spec.md`): SpecItem {
  return { artifactId: "00000000-0000-4000-8000-0000000000a1", path, updatedAt: "2026-11-23T10:00:00.000Z" };
}

export function viewOf(set: TaskSetData | null, specs: SpecItem[] = [specOf()]): TaskSetView {
  return { specs, set };
}
