import path from "node:path";

export type DisplayParts = { title: string; body: string };
export type DisplayRule = (input: Record<string, unknown>, cwd: string) => DisplayParts;

const BLOCK_SEPARATOR = "\n\n";
const BEFORE_LABEL = "Antes:";
const AFTER_LABEL = "Depois:";
const RUN_COMMAND_TITLE = "Rodar comando:";
const WEB_TITLE = "Buscar na web:";

function text(input: Record<string, unknown>, key: string): string {
  const value = input[key];
  return typeof value === "string" ? value : "";
}

function displayPath(filePath: string, cwd: string): string {
  if (!path.isAbsolute(filePath)) return filePath;
  const relative = path.relative(cwd, filePath);
  const isInside = relative.length > 0 && !relative.startsWith("..") && !path.isAbsolute(relative);
  return isInside ? relative : filePath;
}

function snippet(before: string, after: string): string {
  return [BEFORE_LABEL, before, "", AFTER_LABEL, after].join("\n");
}

const bash: DisplayRule = (input) => {
  const description = text(input, "description");
  const command = text(input, "command");
  return { title: RUN_COMMAND_TITLE, body: description ? `${command}${BLOCK_SEPARATOR}${description}` : command };
};

const edit: DisplayRule = (input, cwd) => ({
  title: `Editar ${displayPath(text(input, "file_path"), cwd)}`,
  body: snippet(text(input, "old_string"), text(input, "new_string")),
});

const multiEdit: DisplayRule = (input, cwd) => {
  const edits = Array.isArray(input.edits) ? (input.edits as Array<Record<string, unknown>>) : [];
  const pairs = edits.map((entry) => snippet(text(entry, "old_string"), text(entry, "new_string")));
  return { title: `Editar ${displayPath(text(input, "file_path"), cwd)}`, body: pairs.join(BLOCK_SEPARATOR) };
};

const write: DisplayRule = (input, cwd) => ({ title: `Criar ${displayPath(text(input, "file_path"), cwd)}`, body: text(input, "content") });
const webFetch: DisplayRule = (input) => ({ title: WEB_TITLE, body: text(input, "url") });
const webSearch: DisplayRule = (input) => ({ title: WEB_TITLE, body: text(input, "query") });

export const DISPLAY_RULES: Record<string, DisplayRule> = { Bash: bash, Edit: edit, MultiEdit: multiEdit, Write: write, WebFetch: webFetch, WebSearch: webSearch };

export function genericDisplay(toolName: string, input: Record<string, unknown>): DisplayParts {
  return { title: toolName, body: JSON.stringify(input, null, 2) };
}
