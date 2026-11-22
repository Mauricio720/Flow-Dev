import { z } from "zod";
import { AGENT_EFFORTS, AGENT_KINDS, AGENT_PROVIDERS } from "../application/agents/agentTypes";

const MODEL_MAX_LENGTH = 64;

export const agentSettingsUpdateInputSchema = z.object({
  projectId: z.string().uuid(),
  agent: z.enum(AGENT_KINDS as [string, ...string[]]),
  provider: z.enum(AGENT_PROVIDERS as [string, ...string[]]),
  model: z.string().trim().min(1).max(MODEL_MAX_LENGTH),
  effort: z.enum(AGENT_EFFORTS as [string, ...string[]]),
  expectedVersion: z.number().int().min(0),
}).strict();

export type AgentSettingsUpdateInput = z.infer<typeof agentSettingsUpdateInputSchema>;
