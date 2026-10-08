import { isAbsolute, relative, sep } from "node:path";
import type { RunActivity } from "../../application/database/dao/taskFlowTypes";

const PREVIEW_LIMIT = 1200;
const LABEL_LIMIT = 100;
const FILE_LIMIT = 256;
const SECRET_MIN_LENGTH = 8;
const SECRET_PATTERN = /(?:gh[pousr]_[A-Za-z0-9_]{20,}|sk-[A-Za-z0-9_-]{20,}|https?:\/\/[^\s/@]+:[^\s/@]+@)/gi;
const UNSAFE_TEXT = /[\u0000-\u001f\u007f]|<[^>]*>|(?:\/home\/|\/Users\/|[A-Z]:\\Users\\)/i;
type Input = { activity: RunActivity; root: string; environment: NodeJS.ProcessEnv };

function safeText(value: string, input: Input) {
  let text = value.split(input.root).join("[local checkout]").replace(SECRET_PATTERN, "[redacted]").replace(/[\r\n\t]+/g, " ");
  const secrets = Object.values(input.environment).filter((candidate): candidate is string => Boolean(candidate && candidate.length >= SECRET_MIN_LENGTH)).sort((first, second) => second.length - first.length);
  for (const secret of secrets) text = text.split(secret).join("[redacted]");
  return UNSAFE_TEXT.test(text) ? null : text;
}

function relativeFile(value: string, root: string) {
  const candidate = isAbsolute(value) ? relative(root, value) : value;
  if (!candidate || isAbsolute(candidate) || candidate.split(/[\\/]/).some((part) => !part || part === ".." || part === ".env" || part.startsWith(".env."))) return null;
  return candidate.split(sep).join("/").slice(0, FILE_LIMIT);
}

export function runtimeActivityPayload(input: Input) {
  const summary = safeText(input.activity.preview, input)?.slice(0, PREVIEW_LIMIT);
  if (!summary) return null;
  const source = input.activity.source ? relativeFile(input.activity.source, input.root) : null;
  const tool = input.activity.tool ? safeText(input.activity.tool, input)?.slice(0, LABEL_LIMIT) ?? null : null;
  const status = input.activity.status ? safeText(input.activity.status, input)?.slice(0, LABEL_LIMIT) ?? null : null;
  const at = Number.isFinite(Date.parse(input.activity.at)) ? new Date(input.activity.at).toISOString() : undefined;
  return { summary, relativeFiles: source ? [source] : [], kind: input.activity.kind, tool, status, ...(at ? { at } : {}) };
}
