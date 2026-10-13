import { z } from "zod";
import { REVIEW_LOOP } from "../../../application/services/task-flow/loopOrder";
import { controlOk, type ControlResult } from "../../../application/software/controlErrors";
import type { ControlCaller } from "./controlCaller";

export const REVIEW_NODE_RUNTIMES: Record<string, string> = { review: "reviewer_runtime", fix_batch: "fixer_runtime" };
const RUNTIME_INPUT = { type: "runtime", required: false };
const CONFLICT_STATUS = 409;
const ALREADY_PUBLISHED = { [CONFLICT_STATUS]: "conflict" } as const;

const nodeSchema = z.object({ id: z.string().min(1), params: z.record(z.string(), z.unknown()).optional() }).passthrough();
const definitionSchema = z.object({ inputs: z.record(z.string(), z.unknown()).default({}), graph: z.object({ nodes: z.array(nodeSchema) }).passthrough() }).passthrough();
const documentSchema = z.object({ loop: z.object({ definition: definitionSchema }) });

export type ReviewLoopDocument = z.infer<typeof definitionSchema>;

/** The review Loop with one runtime input per agent node, or null when it already has them or its nodes are not the expected ones. */
export function withRoleRuntimes(definition: ReviewLoopDocument): ReviewLoopDocument | null {
  const roles = Object.entries(REVIEW_NODE_RUNTIMES);
  if (roles.every(([, input]) => input in definition.inputs)) return null;
  if (roles.some(([nodeId]) => !definition.graph.nodes.some((node) => node.id === nodeId))) return null;
  const inputs = { ...definition.inputs, ...Object.fromEntries(roles.map(([, input]) => [input, RUNTIME_INPUT])) };
  const nodes = definition.graph.nodes.map((node) => {
    const input = REVIEW_NODE_RUNTIMES[node.id];
    return input ? { ...node, params: { ...node.params, runtime: `{{ .inputs.${input} }}` } } : node;
  });
  return { ...definition, inputs, graph: { ...definition.graph, nodes } };
}

// The bundled review Loop runs the reviewer and the fixer on one worker runtime; CompozyOS only tells them apart through runtime inputs.
export class CompozyReviewLoop {
  constructor(private readonly caller: ControlCaller) {}

  async prepare(workspaceId: string): Promise<ControlResult<void>> {
    const path = `/api/workspaces/${encodeURIComponent(workspaceId)}/loops`;
    const read = await this.caller.guarded({ method: "GET", path: `${path}/${REVIEW_LOOP}` }, documentSchema, (body) => withRoleRuntimes(body.loop.definition));
    if (!read.ok) return read;
    if (!read.value) return controlOk(undefined, read.release);
    const published = await this.caller.guarded({ method: "POST", path, body: { definition: read.value } }, z.unknown(), () => undefined, ALREADY_PUBLISHED);
    return published.ok || published.code !== "conflict" ? published : controlOk(undefined, read.release);
  }
}
