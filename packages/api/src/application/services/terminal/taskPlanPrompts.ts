import { TaskError } from "../tasks/taskErrors";
import { EXECUTION_REQUEST, EXECUTION_RULES, GENERATION_REQUEST, GENERATION_REVIEW_NOTE, ROOT_FOLDER_LOCATION, SPEC_TO_TASKS_COMMAND } from "./terminalPromptCopy";

const PARENT_SEGMENT_PATTERN = /(^|\/)\.\.(\/|$)/;
const PATH_SEPARATOR = ", ";

export type ExecutionPromptInput = { folder: string; taskPaths: string[] };

function requireRelativePath(path: string) {
  const unsafe = path === "" || path.startsWith("/") || path.includes("\\") || PARENT_SEGMENT_PATTERN.test(path);
  if (unsafe) throw new TaskError("invalid_path");
  return path;
}

function requireInside(folder: string, path: string) {
  const prefix = folder === "" ? "" : `${folder}/`;
  if (!path.startsWith(prefix)) throw new TaskError("invalid_path");
  return path;
}

export function buildGenerationPrompt(specPath: string) {
  return `${SPEC_TO_TASKS_COMMAND} ${GENERATION_REQUEST} ${requireRelativePath(specPath)}. ${GENERATION_REVIEW_NOTE}`;
}

export function buildExecutionPrompt(input: ExecutionPromptInput) {
  const folder = input.folder === "" ? "" : requireRelativePath(input.folder);
  if (input.taskPaths.length === 0) throw new TaskError("invalid_path");
  const paths = input.taskPaths.map((path) => requireInside(folder, requireRelativePath(path))).join(PATH_SEPARATOR);
  const location = folder === "" ? ROOT_FOLDER_LOCATION : `de ${folder}`;
  return `${EXECUTION_REQUEST} ${paths} ${location}. ${EXECUTION_RULES}`;
}
