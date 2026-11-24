import { mkdir, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import type { RuntimeHandlers } from "../../application/terminal/agentSessionRuntime";
import { sessionHook } from "./syntheticHooks";

export type FileStepContext = { cwd: string; claudeSessionId: string; handlers: Pick<RuntimeHandlers, "onHook"> };
type FileStep = { path: string; content: string };

const PARENT_SEGMENT = "..";
const WRITE_TOOL = "Write";

function insideClone(cwd: string, target: string) {
  const path = relative(cwd, target);
  return path !== "" && !path.startsWith(PARENT_SEGMENT) && !isAbsolute(path);
}

export async function writeFileStep(step: FileStep, context: FileStepContext) {
  const target = resolve(context.cwd, step.path);
  if (!insideClone(context.cwd, target)) throw new Error(`O roteiro tentou gravar fora do clone: ${step.path}`);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, step.content);
  const toolInput = { file_path: target, content: step.content };
  const toolResponse = { type: "create", filePath: target, content: step.content };
  context.handlers.onHook(sessionHook(context, { hook_event_name: "PostToolUse", tool_name: WRITE_TOOL, tool_input: toolInput, tool_response: toolResponse }));
}
