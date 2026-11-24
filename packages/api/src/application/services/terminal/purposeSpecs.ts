import type { CapturedSpec, TaskSetReadDao } from "../../database/dao/taskSetReadDao";
import { TaskError } from "../tasks/taskErrors";

export async function findSpec(source: Pick<TaskSetReadDao, "specs">, input: { taskId: string; specArtifactId?: string }): Promise<CapturedSpec> {
  const specs = [...(await source.specs(input.taskId))].sort((left, right) => right.capturedAt.getTime() - left.capturedAt.getTime() || left.path.localeCompare(right.path));
  const spec = input.specArtifactId === undefined ? specs[0] : specs.find((candidate) => candidate.artifactId === input.specArtifactId);
  if (!spec) throw new TaskError("spec_not_found");
  return spec;
}
