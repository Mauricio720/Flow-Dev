import type { CandidateWorkspace } from "./specWorkspaceGateway";

export type RuntimeLaunch = { attemptId: string; workspace: CandidateWorkspace; snapshotPath: string };
export interface SpecRuntimeLauncher {
  socketPath(attemptId: string): string;
  start(input: RuntimeLaunch): Promise<{ socketPath: string }>;
  stop(attemptId: string): Promise<void>;
}
