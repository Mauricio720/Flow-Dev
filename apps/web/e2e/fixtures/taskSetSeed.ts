import { createHash } from "node:crypto";
import type { Sql } from "postgres";

export type SeededFile = { path: string; content: string };

const TASKS_SKILL = "spec-to-tasks";
const CAPTURE_TRIGGER = "stop";
const FIRST_VERSION = 1;

export async function seedTaskSetFiles(sql: Sql, input: { taskId: string; projectId: string; files: SeededFile[] }) {
  for (const file of input.files) {
    const [artifact] = await sql`insert into task_artifacts (task_id, project_id, relative_path, latest_version) values (${input.taskId}, ${input.projectId}, ${file.path}, ${FIRST_VERSION}) returning id`;
    const sha256 = createHash("sha256").update(file.content).digest("hex");
    await sql`insert into task_artifact_versions (artifact_id, version, skill, content, sha256, byte_size, trigger) values (${artifact!.id}, ${FIRST_VERSION}, ${TASKS_SKILL}, ${file.content}, ${sha256}, ${Buffer.byteLength(file.content)}, ${CAPTURE_TRIGGER})`;
  }
}
