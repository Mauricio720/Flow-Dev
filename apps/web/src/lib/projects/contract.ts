import type { RouterOutputs } from "@flow-dev/api";

export type ProjectPage = RouterOutputs["projects"]["list"];
export type Project = ProjectPage["items"][number];
export type ConnectionState = RouterOutputs["projects"]["connectionStates"][number];
export type ConnectionKind = ConnectionState["kind"] | "checking" | "unverified";

export type RepositoryCandidatePage = RouterOutputs["projects"]["repositoryCandidates"];
export type RepositoryCandidate = RepositoryCandidatePage["items"][number];

export const TRPC_UNAUTHORIZED = "UNAUTHORIZED";
export const TRPC_NOT_FOUND = "NOT_FOUND";
export const TRPC_BAD_REQUEST = "BAD_REQUEST";
export const TRPC_FORBIDDEN = "FORBIDDEN";
export const TRPC_CONFLICT = "CONFLICT";
export const TRPC_PRECONDITION_FAILED = "PRECONDITION_FAILED";
export const TRPC_TOO_MANY_REQUESTS = "TOO_MANY_REQUESTS";
export const TRPC_SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE";
