import { z } from "zod";
import type { RunActivity } from "../../../application/database/dao/taskFlowTypes";
import type { LoopRunRef } from "../../../application/software/compozyControlGateway";
import { loopRunSchema } from "./compozyControlSchemas2";
import type { ControlCaller } from "./controlCaller";
import { readLoopSessionActivity } from "./loopSessionActivity";
import { redactText } from "../../../application/services/spec/specRedaction";

const OUTPUT = z.object({ node_id: z.string(), item_index: z.number().int().optional(), status: z.string(), session_id: z.string().optional(), failure_class: z.string().optional() });
const MAX_SESSIONS = 4;
const ACTIVE_OUTPUTS = ["running", "waiting", "retrying"];
const FAILED_STATES = ["failed", "blocked", "exhausted", "stalled"];
const PREVIEW_LIMIT = 1200;
const OUTPUT_LABELS: Record<string, string> = { running: "em execução", waiting: "aguardando", retrying: "tentando novamente", failed: "falhou", done: "concluído", completed: "concluído", succeeded: "concluído", pending: "pendente", skipped: "ignorado", canceled: "cancelado" };
export const loopDiagnosticsSchema = loopRunSchema.extend({
  run: loopRunSchema.shape.run.extend({ generation: z.number().int().optional(), last_progress_at: z.string().optional(), progress: z.object({ round: z.number().int(), steps_done: z.number().int(), steps_total: z.number().int() }).optional() }),
  generations: z.array(z.object({ generation: z.number().int(), outputs: z.array(OUTPUT).default([]) })).optional(),
  node_controls: z.array(z.object({ attention_reason: z.string().optional(), updated_at: z.string().optional() })).optional(),
});
type Diagnostics = z.infer<typeof loopDiagnosticsSchema>;

function currentOutputs(body: Diagnostics) {
  const generation = body.run.generation ?? Math.max(0, ...(body.generations ?? []).map((item) => item.generation));
  return body.generations?.find((item) => item.generation === generation)?.outputs ?? [];
}

function progressSummary(body: Diagnostics, outputs: z.infer<typeof OUTPUT>[]) {
  const progress = body.run.progress;
  const counts = progress ? `Etapas do Loop: ${progress.steps_done}/${progress.steps_total} concluídas · rodada ${progress.round}.` : "";
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
  const attention = body.node_controls?.find((item) => item.attention_reason);
  const summary = progressSummary(body, outputs);
  const detail = message?.preview ?? attention?.attention_reason;
  if (!summary && !detail) return {};
  const at = message?.at ?? attention?.updated_at ?? body.run.last_progress_at ?? body.run.created_at;
  const activity: RunActivity = { sequence: message?.sequence ?? 0, at, kind: message?.kind ?? (failed ? "warning" : "lifecycle"), preview: redactText([summary, detail].filter(Boolean).join(" "), null).slice(0, PREVIEW_LIMIT), source: null, tool: message?.tool ?? null, status: message?.status ?? body.run.status };
  const terminalReason = failed ? message?.kind === "warning" ? message.status : outputs.find((item) => item.status === "failed")?.failure_class : null;
  return { activity, ...(terminalReason ? { terminalReason } : {}) };
}
