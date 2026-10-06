import type { SpecReason } from "../../../application/services/spec/specContracts";

export class SpecRuntimeError extends Error {
  constructor(readonly reason: SpecReason, readonly uncertain = false, message?: string) {
    super(message ?? reason);
    this.name = "SpecRuntimeError";
  }
}
