import { createHash } from "node:crypto";
import { LocalExecutionError } from "./localExecutionErrors";

export type GateDeclaration = { id: string; label: string; argv: string[]; cwd: string; timeoutMs?: number; sourcePath: string; sourceText: string; kind: "command" | "playwright"; serviceUrls?: string[]; environmentKeys?: string[] };
export type GateManifest = { actionKind: string; sources: Array<{ path: string; sha256: string }>; requiredGates: Array<{ id: string; label: string; argv: string[]; cwd: string; timeoutMs: number; kind: GateDeclaration["kind"]; commandDigest: string; serviceUrls: string[]; environmentKeys: string[] }>; hash: string };

const DEFAULT_TIMEOUT_MS = 15 * 60 * 1000;
const MAX_TIMEOUT_MS = 60 * 60 * 1000;

export function resolveGateManifest(input: { actionKind: string; declarations: GateDeclaration[]; sources?: Array<{ path: string; text: string }> }): GateManifest {
  if (input.declarations.length > 64) throw new LocalExecutionError("gate_policy_unresolved");
  const declarations = [...parseRequiredGateDeclarations(input.sources ?? []), ...input.declarations].map(validateDeclaration);
  if (declarations.length > 64) throw new LocalExecutionError("gate_policy_unresolved");
  if (new Set(declarations.map((gate) => gate.id)).size !== declarations.length) throw new LocalExecutionError("gate_policy_unresolved");
  const sourceMap = new Map((input.sources ?? []).map(({ path, text }) => [path, text]));
  for (const gate of declarations) sourceMap.set(gate.sourcePath, gate.sourceText);
  const sources = [...sourceMap].map(([path, text]) => ({ path, sha256: digest(text) })).sort((a, b) => a.path.localeCompare(b.path));
  const requiredGates = declarations.map((gate) => ({
    id: gate.id,
    label: gate.label.slice(0, 80),
    argv: gate.argv,
    cwd: gate.cwd,
    timeoutMs: Math.min(gate.timeoutMs ?? DEFAULT_TIMEOUT_MS, MAX_TIMEOUT_MS),
    kind: gate.kind,
    serviceUrls: gate.serviceUrls ?? [],
    environmentKeys: gate.environmentKeys ?? [],
    commandDigest: digest(JSON.stringify({ argv: gate.argv, cwd: gate.cwd })),
  }));
  const manifest = { actionKind: input.actionKind, sources, requiredGates };
  return { ...manifest, hash: digest(JSON.stringify(manifest)) };
}

/** Reads only explicit mandatory gate lines; ordinary package scripts remain incidental. */
export function parseRequiredGateDeclarations(sources: Array<{ path: string; text: string }>): GateDeclaration[] {
  const declarations: GateDeclaration[] = [];
  for (const source of sources) {
    for (const [index, line] of source.text.split(/\r?\n/).entries()) {
      const match = /^\s*(?:[-*]\s*)?(?:required\s+gate|gate\s+required)\s*:\s*(.+?)\s*$/i.exec(line);
      if (!match) {
        if (/\b(?:must|required|mandatory)\b/i.test(line) && /\b(?:pnpm|npm|yarn|bun|playwright|vitest|jest|pytest|cargo)\b/i.test(line)) throw new LocalExecutionError("gate_policy_unresolved");
        continue;
      }
      const raw = match[1]!;
      const argv = tokenizeGateCommand(raw);
      if (!argv.length) throw new LocalExecutionError("gate_policy_unresolved");
      const id = argv.join("-").toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 128);
      if (!id) throw new LocalExecutionError("gate_policy_unresolved");
      declarations.push({ id, label: raw.slice(0, 160), argv, cwd: ".", sourcePath: `${source.path}#L${index + 1}`, sourceText: source.text, kind: /(?:^|\s)(?:playwright|test:e2e)(?:\s|$)/i.test(raw) ? "playwright" : "command" });
    }
  }
  return declarations;
}

function tokenizeGateCommand(value: string) {
  if (/[\u0000-\u001f\u007f;&|<>`]|\$\(|\$\{|\$[A-Za-z_]/.test(value)) throw new LocalExecutionError("gate_policy_unresolved");
  const tokens: string[] = [];
  let token = "";
  let quote: "'" | '"' | null = null;
  let escaped = false;
  for (const character of value.trim()) {
    if (escaped) { token += character; escaped = false; continue; }
    if (character === "\\" && quote !== "'") { escaped = true; continue; }
    if (quote) { if (character === quote) quote = null; else token += character; continue; }
    if (character === "'" || character === '"') { quote = character; continue; }
    if (/\s/.test(character)) { if (token) { tokens.push(token); token = ""; } continue; }
    token += character;
  }
  if (escaped || quote) throw new LocalExecutionError("gate_policy_unresolved");
  if (token) tokens.push(token);
  return tokens;
}

function validateDeclaration(gate: GateDeclaration) {
  if (gate.sourceText === "") throw new LocalExecutionError("instructions_invalid");
  if (!/^[a-zA-Z0-9._-]{1,128}$/.test(gate.id) || !gate.label || gate.label.length > 160 || !gate.sourcePath || !gate.cwd || gate.cwd.startsWith("/") || gate.cwd.split(/[\\/]/).some((part) => part === "..") || !Array.isArray(gate.argv) || gate.argv.length === 0 || gate.argv.length > 64 || gate.argv.some((part) => !part || part.includes("\u0000") || part.length > 2048)) throw new LocalExecutionError("gate_policy_unresolved");
  if (gate.timeoutMs !== undefined && (!Number.isInteger(gate.timeoutMs) || gate.timeoutMs <= 0)) throw new LocalExecutionError("gate_policy_unresolved");
  if (gate.environmentKeys?.some((name) => !/^[A-Z_][A-Z0-9_]*$/.test(name))) throw new LocalExecutionError("gate_policy_unresolved");
  if (gate.serviceUrls?.some((value) => { try { const url = new URL(value); return !["localhost", "127.0.0.1", "::1"].includes(url.hostname); } catch { return true; } })) throw new LocalExecutionError("gate_policy_unresolved");
  return gate;
}

function digest(value: string) { return createHash("sha256").update(value).digest("hex"); }
