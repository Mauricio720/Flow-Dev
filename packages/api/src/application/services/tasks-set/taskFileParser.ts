import { readFlatFrontmatter } from "./flatFrontmatter";
import { readFrontmatter } from "./frontmatter";
import { countMiniTasks } from "./miniTaskCount";
import type { TaskStatus } from "./taskSetTypes";

const STATUS_BY_VALUE = new Map<string, TaskStatus>([
  ["pending", "pending"],
  ["in_progress", "in_progress"],
  ["completed", "completed"],
  ["done", "completed"],
  ["finished", "completed"],
]);

export type ParsedTaskFile = {
  title: string | null;
  type: string | null;
  complexity: string | null;
  status: TaskStatus;
  miniDone: number;
  miniTotal: number;
};

function textOf(value: unknown) {
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

function statusOf(value: unknown): TaskStatus {
  return (typeof value === "string" ? STATUS_BY_VALUE.get(value) : undefined) ?? "unknown";
}

export function parseTaskFile(content: string): ParsedTaskFile {
  const frontmatter = readFrontmatter(content) ?? readFlatFrontmatter(content);
  const data = frontmatter?.data ?? {};
  const mini = countMiniTasks(frontmatter?.body ?? content);
  return {
    title: textOf(data.title),
    type: textOf(data.type),
    complexity: textOf(data.complexity),
    status: statusOf(data.status),
    miniDone: mini.done,
    miniTotal: mini.total,
  };
}
