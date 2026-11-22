import { randomUUID } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { IssueContextController } from "../../controllers/issueContextController";
import { TaskError } from "../../application/services/tasks/taskErrors";
import { CONTEXT_TOOLS, parseContextToolInput, type ContextToolDefinition } from "./contextMcpTools";

export type ContextCaller = { executionId: string; capability: string };

const EXECUTION_UNAVAILABLE = "Contexto indisponível para esta execução.";
const INVALID_QUERY = "Consulta inválida.";
const LOOKUP_FAILED = "Consulta indisponível no momento.";
const EXECUTION_REASONS = new Set(["capability_invalid", "stale_execution", "access_revoked"]);

function failure(text: string) {
  return { isError: true, content: [{ type: "text" as const, text }] };
}

function failureText(error: unknown) {
  if (!(error instanceof TaskError)) return LOOKUP_FAILED;
  return EXECUTION_REASONS.has(error.reason) ? EXECUTION_UNAVAILABLE : LOOKUP_FAILED;
}

async function runTool(controller: IssueContextController, caller: ContextCaller, definition: ContextToolDefinition, input: unknown) {
  const request = parseContextToolInput(definition, input);
  if (!request) return failure(INVALID_QUERY);
  try {
    const result = await controller.handle({ executionId: caller.executionId, toolCallId: randomUUID(), request }, caller.capability);
    return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
  } catch (error) {
    return failure(failureText(error));
  }
}

export function buildContextServer(controller: IssueContextController, caller: ContextCaller) {
  const server = new McpServer({ name: "flow", version: "1.0.0" });
  for (const definition of CONTEXT_TOOLS) {
    const config = { description: definition.description, inputSchema: definition.schema.shape };
    server.registerTool(definition.name, config, (input: unknown) => runTool(controller, caller, definition, input));
  }
  return server;
}
