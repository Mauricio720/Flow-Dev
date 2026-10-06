const SECRET_KEY = /authorization|token|secret|password|api[_-]?key|credential|cookie|bearer/i;
const BEARER_VALUE = /\b(authorization\s*[:=]\s*\S+(\s+\S+)?|bearer\s+[A-Za-z0-9._~+/=-]+)/gi;
const TOKEN_VALUE = /\b(?:gh[pousr]_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,}|sk-[A-Za-z0-9_-]{20,}|AKIA[A-Z0-9]{16}|[A-Z][A-Z0-9_]*(?:TOKEN|SECRET|KEY|PASSWORD)\s*=\s*[^\s"']+)/g;
const ABSOLUTE_PATH = /(?:^|[\s"'(=])((?:\/[^\s"')]*)|(?:[A-Za-z]:\\[^\s"')]*))/g;
const OMITTED_PATH = "[caminho omitido]";
const OMITTED_SECRET = "[omitido]";

export type RedactionResult<T> = { value: T; omitted: string[] };

export function redactText(text: string, workspaceRoot: string | null, omitted: string[] = []) {
  let result = text.replace(BEARER_VALUE, () => { omitted.push("secret"); return OMITTED_SECRET; });
  result = result.replace(TOKEN_VALUE, () => { omitted.push("secret"); return OMITTED_SECRET; });
  result = result.replace(ABSOLUTE_PATH, (match, path: string) => replacePath(match, path, { workspaceRoot, omitted }));
  return result;
}

function replacePath(match: string, path: string, context: { workspaceRoot: string | null; omitted: string[] }) {
  const { workspaceRoot, omitted } = context;
  const prefix = match.slice(0, match.length - path.length);
  if (workspaceRoot && path.startsWith(`${workspaceRoot}/`)) return `${prefix}${path.slice(workspaceRoot.length + 1)}`;
  omitted.push("host_path");
  return `${prefix}${OMITTED_PATH}`;
}

export function redactValue(value: unknown, workspaceRoot: string | null, omitted: string[]): unknown {
  if (typeof value === "string") return redactText(value, workspaceRoot, omitted);
  if (Array.isArray(value)) return value.map((item) => redactValue(item, workspaceRoot, omitted));
  if (!value || typeof value !== "object") return value;
  const entries = Object.entries(value as Record<string, unknown>).map(([key, entry]) => {
    if (!SECRET_KEY.test(key)) return [key, redactValue(entry, workspaceRoot, omitted)] as const;
    omitted.push("secret");
    return [key, OMITTED_SECRET] as const;
  });
  return Object.fromEntries(entries);
}
