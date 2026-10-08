import type { HostChecks } from "./hostChecks";

export interface HostDiagnostics {
  collect(): Promise<HostChecks>;
}
