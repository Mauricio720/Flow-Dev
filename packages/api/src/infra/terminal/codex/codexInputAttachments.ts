import path from "node:path";
import type { CodexUserInput } from "../../../application/services/terminal/codex/codexTurnInput";

export function codexInputAttachments(input: CodexUserInput[]) {
  return input.map((item) => item.type === "localImage" ? { ...item, path: path.resolve(item.path) } : item);
}
