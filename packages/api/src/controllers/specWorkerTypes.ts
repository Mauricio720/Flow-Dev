import type { TaskSpecApprovalDao } from "../application/database/dao/taskSpecApprovalDao";
import type { SpecClaim, TaskSpecWorkerDao } from "../application/database/dao/taskSpecWorkerDao";
import type { RuntimeConfiguration, SpecRuntimeGateway } from "../application/spec/specRuntimeGateway";
import type { SpecAccessProbe, SpecUpstreamLoader } from "../application/spec/specAccessProbe";
import type { SpecRuntimeLauncher } from "../application/spec/specRuntimeLauncher";
import type { SpecCaptureService } from "../application/services/spec/specCaptureService";
import type { SpecFinalizationService } from "../application/services/spec/specFinalizationService";
import type { SpecWorkspaceGateway } from "../application/spec/specWorkspaceGateway";

export type SpecWorkerSettings = {
  runnerId: string;
  maxActive: number;
  agentName: string;
  provider: string;
  model: string;
  runtime: Omit<RuntimeConfiguration, "socketPath">;
  workspaceRoot: string | null;
};

export type SpecWorkerDeps = {
  dao: TaskSpecWorkerDao;
  runtime: SpecRuntimeGateway;
  workspaces: SpecWorkspaceGateway;
  launcher: SpecRuntimeLauncher;
  access: SpecAccessProbe;
  upstream: SpecUpstreamLoader;
  approvals: TaskSpecApprovalDao;
  capture: SpecCaptureService;
  finalization: SpecFinalizationService;
  snapshot: (claim: SpecClaim, checkoutPath: string, target: string) => Promise<void>;
  settings: SpecWorkerSettings;
  owner: string;
  clock: () => Date;
};
