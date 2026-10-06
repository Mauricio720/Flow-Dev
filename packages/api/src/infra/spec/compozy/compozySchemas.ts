import { z } from "zod";

const sessionState = z.enum(["starting", "active", "stopping", "stopped"]);
const interaction = z.object({
  interaction_id: z.string(),
  provider_request_id: z.string(),
  kind: z.string(),
  status: z.string(),
  turn_id: z.string().optional(),
  title: z.string().optional(),
  tool_id: z.string().optional(),
  choices: z.array(z.string()).optional(),
  decisions: z.array(z.string()).optional(),
  resolution: z.string().optional(),
});

export const identitySchema = z.object({ daemon: z.object({ version: z.string() }), schema_version: z.string() });
export const agentSchema = z.object({ agent: z.object({ name: z.string(), permissions: z.string().optional(), provider: z.string(), model: z.string().optional(), definition_digest: z.string() }) });
export const workspaceSchema = z.object({ workspace: z.object({ id: z.string(), root_dir: z.string(), name: z.string() }) });
export const workspacesSchema = z.object({ workspaces: z.array(z.object({ id: z.string(), root_dir: z.string(), name: z.string() })) });
export const sessionSchema = z.object({ session: z.object({ id: z.string(), name: z.string().optional(), workspace_id: z.string().optional(), state: sessionState, verified: z.boolean().nullish(), stop_reason: z.string().optional(), stop_cause: z.string().optional(), attention: z.string().optional(), pending_interactions: z.array(interaction).default([]), activity: z.object({ turn_id: z.string().optional() }).nullish() }) });
export const sessionListSchema = z.object({ sessions: z.array(z.object({ id: z.string(), name: z.string().optional(), workspace_id: z.string().optional() })), page: z.object({ has_more: z.boolean(), next_cursor: z.string().optional() }) });
export const promptSchema = z.object({ prompt: z.object({ message_id: z.string(), idempotency_key: z.string(), status: z.string(), delivery: z.string(), replayed: z.boolean(), turn_id: z.string().optional(), new_turn_id: z.string().optional() }) });
export const interactionsSchema = z.object({ interactions: z.array(interaction) });
export const answerSchema = z.object({ choice: z.number().nullish(), fallback: z.boolean(), text: z.string() });
export const approveSchema = z.object({ decision: z.string(), outcome: z.string(), request_id: z.string(), interaction_id: z.string().optional(), resolved_decision: z.string().optional() });
export const stopSchema = z.object({ session_id: z.string(), state: sessionState, status: z.string(), verified: z.boolean(), stop_cause: z.string().optional(), attention: z.string().optional() });
export const eventsSchema = z.object({ events: z.array(z.object({ id: z.string(), sequence: z.number(), type: z.string(), turn_id: z.string(), timestamp: z.string(), content: z.unknown() })) });

export type CompozyInteraction = z.infer<typeof interaction>;
