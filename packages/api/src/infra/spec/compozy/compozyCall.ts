import type { z } from "zod";
import { SpecRuntimeError } from "./compozyErrors";
import { CompozyTransportError, type CompozyRequest, type CompozyResponse, type CompozyTransport } from "./compozyTransport";

const SERVER_ERROR_FLOOR = 500;

export async function send(transport: CompozyTransport, request: CompozyRequest): Promise<CompozyResponse> {
  try { return await transport(request); }
  catch (error) {
    if (error instanceof CompozyTransportError) throw new SpecRuntimeError("outcome_unknown", true, error.kind);
    throw new SpecRuntimeError("service_unavailable", true);
  }
}

export function parse<T extends z.ZodType>(schema: T, body: unknown): z.infer<T> {
  const result = schema.safeParse(body);
  if (!result.success) throw new SpecRuntimeError("outcome_unknown", true, "malformed runtime response");
  return result.data;
}

export async function callOk<T extends z.ZodType>(transport: CompozyTransport, call: { request: CompozyRequest; schema: T; accepted: readonly number[] }): Promise<z.infer<T>> {
  const { request, schema, accepted } = call;
  const response = await send(transport, request);
  if (response.status >= SERVER_ERROR_FLOOR) throw new SpecRuntimeError("outcome_unknown", true, `status ${response.status}`);
  if (!accepted.includes(response.status)) throw new SpecRuntimeError("runtime_failed", false, `status ${response.status}`);
  return parse(schema, response.body);
}
