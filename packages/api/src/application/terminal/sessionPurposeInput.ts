import type { AgentAvailability, AgentChoice } from "./sessionAgentCatalog";
import type { SessionPurposeKind } from "./sessionPurposeKind";

export type PreviewPurpose = { kind: "route"; choice?: AgentChoice } | { kind: "generate_tasks"; specArtifactId?: string } | { kind: "plan_item"; planItemId: string };
export type OpenPurpose = { kind: "route"; choice?: AgentChoice } | { kind: "generate_tasks"; specArtifactId: string; choice: AgentChoice } | { kind: "plan_item"; planItemId: string; force?: boolean };

export type PurposePreview = { prompt: string | null; choice: AgentChoice | null; agents: AgentAvailability[] };

export type SessionChoiceColumns = { purpose: SessionPurposeKind; planItemId?: string; agent?: AgentChoice["agent"]; model?: string; effort?: string };
export type ItemStart = { itemId: string; force: boolean };
export type ResolvedPurpose = { columns: SessionChoiceColumns; itemStart: ItemStart | null };

export const ROUTE_PURPOSE = { kind: "route" } as const;
