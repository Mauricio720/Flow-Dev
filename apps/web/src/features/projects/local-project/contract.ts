import type { TaskFailure } from "@/lib/tasks/contract";

export type LocalReadiness = "ready" | "blocked" | "checking";
export type LocalLink = { linkId: string; revision: number; machineLabel: string; projectLabel: string; readiness: LocalReadiness; readinessCode: string | null };
export type LocalProjectLoad = { kind: "unavailable" } | { kind: "none" } | { kind: "ready"; link: LocalLink } | { kind: "failed"; failure: TaskFailure };
export type UnlinkResult = { status: "unlinked"; revision: number } | { status: "rejected"; reason: string };
export type UnlinkInput = { projectId: string; linkId: string; expectedRevision: number; requestKey: string };

export type FolderRequestState = "pending" | "claimed" | "linked" | "failed";
export type FolderRequest = { state: FolderRequestState; reason: string | null };
export type FolderRequestStart = { status: "opened" } | { status: "rejected"; reason: string };

export type LocalProjectActions = {
  mine: (projectId: string) => Promise<LocalProjectLoad>;
  unlink: (input: UnlinkInput) => Promise<UnlinkResult>;
  requestFolder: (projectId: string) => Promise<FolderRequestStart>;
  folderRequest: (projectId: string) => Promise<FolderRequest | null>;
};
