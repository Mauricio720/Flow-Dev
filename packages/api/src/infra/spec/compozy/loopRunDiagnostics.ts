import { z } from "zod";
import type { RunActivity } from "../../../application/database/dao/taskFlowTypes";
import type { LoopRunRef } from "../../../application/software/compozyControlGateway";
import { loopRunSchema } from "./compozyControlSchemas2";
import type { ControlCaller } from "./controlCaller";
import { readLoopSessionActivity } from "./loopSessionActivity";
import { redactText } from "../../../application/services/spec/specRedaction";

const OUTPUT = z.object({ node_id: z.string(), item_index: z.number().int().optional(), status: z.string(), session_id: z.string().optional(), failure_class: z.string().optional() });
const MAX_SESSIONS = 4;
const ACTIVE_OUTPUTS = ["running", "enqueued", "waiting", "retrying"];
const DONE_OUTPUTS = ["succeeded", "done", "completed", "skipped"];
const REATTEMPT_ORIGIN = "reattempt";
const FAILED_STATES = ["failed", "blocked", "exhausted", "stalled"];
const USAGE_LIMIT_ERROR = /usage_limit_exceeded|usageLimitExceeded|hit your usage limit/i;
const USAGE_LIMIT_MESSAGE = /"message":"([^"\\]*hit your usage limit[^"\\]*)"/i;
const PREVIEW_LIMIT = 1200;
const OUTPUT_LABELS: Record<string, string> = { running: "em execução", enqueued: "em execução", waiting: "aguardando", retrying: "tentando novamente", failed: "falhou", done: "concluído", completed: "concluído", succeeded: "concluído", pending: "pendente", skipped: "ignorado", canceled: "cancelado" };
export const loopDiagnosticsSchema = loopRunSchema.extend({
  run: loopRunSchema.shape.run.extend({ generation: z.number().int().optional(), last_progress_at: z.string().optional(), progress: z.object({ round: z.number().int(), steps_done: z.number().int(), steps_total: z.number().int() }).optional() }),
  generations: z.array(z.object({ generation: z.number().int(), origin: z.string().optional(), outputs: z.array(OUTPUT).default([]) })).optional(),
  node_controls: z.array(z.object({ attention_reason: z.string().optional(), updated_at: z.string().optional() })).optional(),
});
type Diagnostics = z.infer<typeof loopDiagnosticsSchema>;

function currentGeneration(body: Diagnostics) {
  return body.run.generation ?? Math.max(0, ...(body.generations ?? []).map((item) => item.generation));
}

function currentOutputs(body: Diagnostics) {
  const generation = currentGeneration(body);
  return body.generations?.find((item) => item.generation === generation)?.outputs ?? [];
}

function observedProgress(body: Diagnostics, outputs: z.infer<typeof OUTPUT>[]) {
  const generation = currentGeneration(body);
  const rounds = (body.generations ?? []).filter((item) => item.generation <= generation && item.origin !== REATTEMPT_ORIGIN);
  return { round: rounds.length, steps_done: outputs.filter((item) => DONE_OUTPUTS.includes(item.status)).length, steps_total: outputs.length };
}

function progressSummary(body: Diagnostics, outputs: z.infer<typeof OUTPUT>[]) {
  const reported = body.run.progress;
  const progress = reported?.steps_total ? reported : observedProgress(body, outputs);
  const counts = progress.steps_total ? `Etapas do Loop: ${progress.steps_done}/${progress.steps_total} concluídas · rodada ${progress.round}.` : "";
  const current = outputs.find((item) => ACTIVE_OUTPUTS.includes(item.status)) ?? outputs.find((item) => item.status === "failed") ?? outputs.at(-1);
  const node = current ? `Nó ${current.node_id}${current.item_index === undefined ? "" : ` · item ${current.item_index + 1}`}: ${OUTPUT_LABELS[current.status] ?? current.status}.` : "";
  return [counts, node].filter(Boolean).join(" ");
}

export async function readLoopDiagnostics(caller: ControlCaller, ref: LoopRunRef, body: Diagnostics) {
  const outputs = currentOutputs(body);
  const failed = FAILED_STATES.includes(body.run.status);
  const relevant = outputs.filter((item) => failed ? item.status === "failed" : ACTIVE_OUTPUTS.includes(item.status));
  const sessionOutputs = failed || relevant.length ? relevant : outputs;
  const sessions = [...new Set(sessionOutputs.map((item) => item.session_id).filter((id): id is string => Boolean(id)))].slice(-MAX_SESSIONS);
  const messages = await Promise.all(sessions.map((sessionId) => readLoopSessionActivity(caller, { workspaceId: ref.workspaceId, sessionId, failed })));
  const latest = messages.filter((item): item is RunActivity => Boolean(item)).sort((first, second) => Date.parse(second.at) - Date.parse(first.at));
  const message = (failed ? latest.find((item) => item.kind === "warning") : null) ?? latest[0];
  const limitAttention = body.node_controls?.find((item) => item.attention_reason && USAGE_LIMIT_ERROR.test(item.attention_reason));
  const attention = limitAttention ?? body.node_controls?.find((item) => item.attention_reason);
  const usageLimit = message?.status === "usage_limit_exceeded" || Boolean(limitAttention);
  const summary = progressSummary(body, outputs);
  const limitReason = limitAttention?.attention_reason;
  const detail = (limitReason ? USAGE_LIMIT_MESSAGE.exec(limitReason)?.[1] ?? limitReason : null) ?? message?.preview ?? attention?.attention_reason;
  if (!summary && !detail) return {};
  const at = limitAttention?.updated_at ?? message?.at ?? attention?.updated_at ?? body.run.last_progress_at ?? body.run.created_at;
  const activity: RunActivity = { sequence: message?.sequence ?? 0, at, kind: usageLimit ? "warning" : message?.kind ?? (failed ? "warning" : "lifecycle"), preview: redactText([summary, detail].filter(Boolean).join(" "), null).slice(0, PREVIEW_LIMIT), source: null, tool: message?.tool ?? null, status: usageLimit ? "usage_limit_exceeded" : message?.status ?? body.run.status };
  const terminalReason = usageLimit ? "usage_limit_exceeded" : failed ? message?.kind === "warning" ? message.status : outputs.find((item) => item.status === "failed")?.failure_class : null;
  return { activity, ...(terminalReason ? { terminalReason } : {}) };
}
