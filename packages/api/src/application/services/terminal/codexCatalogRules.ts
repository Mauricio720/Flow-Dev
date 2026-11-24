import type { CodexStatus } from "../../terminal/codexCatalog";
import type { SessionModelOption } from "../../terminal/sessionAgentCatalog";

export const MIN_CODEX_VERSION = "0.159.3";
export const CODEX_MISSING = "Codex não encontrado. Instale o Codex CLI e tente de novo.";
export const CODEX_LOGIN = "Faça login no Codex: rode `codex login`.";
export const CODEX_TOO_OLD = `Atualize o Codex para a versão ${MIN_CODEX_VERSION} ou mais nova.`;
export const CODEX_EMPTY = "Nenhum modelo está disponível no Codex.";

export function compareVersions(left: string, right: string) {
  const a = left.split(".").map(Number);
  const b = right.split(".").map(Number);
  for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
    const difference = (a[index] ?? 0) - (b[index] ?? 0);
    if (difference !== 0) return Math.sign(difference);
  }
  return 0;
}

export function catalogStatus(input: { version: string; loggedIn: boolean; models: ModelModel[]; now: Date }): CodexStatus {
  const models = input.models.filter((model) => !model.hidden).map(mapModel);
  const reason = !input.loggedIn ? CODEX_LOGIN : models.length === 0 ? CODEX_EMPTY : null;
  return { available: reason === null, reason, version: input.version, models, refreshedAt: input.now.toISOString() };
}

export function versionStatus(version: string | null, loggedIn: boolean, now: Date): CodexStatus | null {
  if (!version) return unavailable(CODEX_MISSING, now);
  if (compareVersions(version, MIN_CODEX_VERSION) < 0) return unavailable(CODEX_TOO_OLD, now, version);
  if (!loggedIn) return unavailable(CODEX_LOGIN, now, version);
  return null;
}

function unavailable(reason: string, now: Date, version: string | null = null): CodexStatus {
  return { available: false, reason, version, models: [], refreshedAt: now.toISOString() };
}

function mapModel(model: ModelModel): SessionModelOption {
  const efforts = model.supportedReasoningEfforts.map((option) => option.reasoningEffort);
  return { id: model.id, label: model.displayName || model.id, isDefault: model.isDefault, efforts, defaultEffort: model.defaultReasoningEffort };
}

export type ModelModel = { id: string; displayName: string; hidden: boolean; isDefault: boolean; supportedReasoningEfforts: { reasoningEffort: string }[]; defaultReasoningEffort: string | null };
