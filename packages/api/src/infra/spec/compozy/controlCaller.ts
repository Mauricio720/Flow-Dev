import type { z } from "zod";
import { COMPOZY_PIN } from "../../../application/spec/specPins";
import { controlFailure, controlOk, type ControlErrorCode, type ControlResult } from "../../../application/software/controlErrors";
import { send } from "./compozyCall";
import { mapControlStatus } from "./controlErrorMapper";
import { identitySchema } from "./compozySchemas";
import type { CompozyRequest, CompozyTransport } from "./compozyTransport";

export type StatusOverrides = Partial<Record<number, ControlErrorCode>>;

export type ControlCallerConfig = { transport: CompozyTransport; declaredOpenApiSha256: string };

const stripVersionPrefix = (value: string) => (value.startsWith("v") ? value.slice(1) : value);
const ACCEPTED_STATUSES = [200, 201, 202, 204];

export class ControlCaller {
  constructor(private readonly config: ControlCallerConfig) {}

  async guarded<S extends z.ZodType, T>(request: CompozyRequest, schema: S, project: (body: z.infer<S>) => T, overrides: StatusOverrides = {}): Promise<ControlResult<T>> {
    const release = await this.verifyRelease();
    if (!release.ok) return release;
    const response = await this.call(request, release.value, overrides);
    if (!response.ok) return response;
    const parsed = schema.safeParse(response.value);
    if (!parsed.success) return controlFailure("runtime_incompatible", release.value);
    return controlOk(project(parsed.data), release.value);
  }

  async verifyRelease(): Promise<ControlResult<string>> {
    if (this.config.declaredOpenApiSha256 !== COMPOZY_PIN.openApiSha256) return controlFailure("runtime_incompatible");
    const response = await this.call({ method: "GET", path: "/api/status/identity" }, COMPOZY_PIN.release);
    if (!response.ok) return response.code === "service_unavailable" ? response : controlFailure("runtime_incompatible");
    const identity = identitySchema.safeParse(response.value);
    if (!identity.success) return controlFailure("runtime_incompatible");
    const running = stripVersionPrefix(identity.data.daemon.version);
    if (running !== stripVersionPrefix(COMPOZY_PIN.version)) return controlFailure("runtime_incompatible", running);
    return controlOk(COMPOZY_PIN.release, COMPOZY_PIN.release);
  }

  private async call(request: CompozyRequest, release: string, overrides: StatusOverrides = {}): Promise<ControlResult<unknown>> {
    try {
      const response = await send(this.config.transport, request);
      if (ACCEPTED_STATUSES.includes(response.status)) return controlOk(response.body, release);
      return controlFailure(overrides[response.status] ?? mapControlStatus(response.status), release);
    } catch {
      return controlFailure("service_unavailable", release);
    }
  }
}
