import type { SpecReason } from "../services/spec/specContracts";

export type RuntimeIdentity = { socketPath: string; workspaceId: string; sessionId: string };
export type RuntimePins = { version: string; openApiSha256: string; binarySha256: string; bundleSha256: string };
export type RuntimeConfiguration = { socketPath: string; agentName: string; provider: string; model: string; declared: RuntimePins; accepted: RuntimePins; permissionMode?: "approve-reads" | "approve-all" };
export type RuntimeCapabilities = { version: string; schemaVersion: string; permissions: string; provider: string; definitionDigest: string };
export type CreateRuntimeSession = { socketPath: string; workspaceRoot: string; workspaceName: string; agentName: string; sessionName: string };
export type RuntimeSession = { workspaceId: string; sessionId: string; name: string };
export type SubmitSpecPrompt = RuntimeIdentity & { messageId: string; idempotencyKey: string; message: string; provider?: string; model?: string; reasoningEffort?: string | null };
export type RuntimeRejection = { code: string | null; message: string | null };
export type RuntimeSubmission = { status: "accepted" | "queue_full" | "conflict" | "rejected" | "unknown"; messageId: string; idempotencyKey: string; turnId: string | null; replayed: boolean; rejection?: RuntimeRejection };
export type RuntimeCursor = RuntimeIdentity & { afterSequence: number; lastEventId?: string };
export type RuntimeEvent = { sequence: number; id: string; type: string; turnId: string; timestamp: string; content: unknown };
export type RuntimeInteraction = { id: string; providerRequestId: string; turnId: string | null; kind: "question" | "permission"; status: string; title: string | null; choices: string[]; decisions: string[]; toolId: string | null; resolution: string | null };
export type ResolveRuntimeInteraction = RuntimeIdentity & (
  | { kind: "question"; requestId: string; choiceIndex?: number; text?: string }
  | { kind: "permission"; requestId: string; turnId: string; decision: "allow_once" | "deny_once" }
);
export type RuntimeOutcome = "applied" | "answered" | "already_resolved" | "resolved_after_restart" | "queue_full" | "unknown" | "rejected";
export type RuntimeResolution = { outcome: RuntimeOutcome; delivered: boolean; liveDeliveryProven: boolean; orphaned: boolean; winningValue: string | null; reason: SpecReason | null };
export type RuntimeStop = { state: "starting" | "active" | "stopping" | "stopped"; verified: boolean; cause: string | null; attention: string | null; settled: boolean; canceled: boolean };
export type RuntimeSnapshot = { state: RuntimeStop["state"]; verified: boolean; stopReason: string | null; stopCause: string | null; turnId: string | null; attention: string | null; pendingInteractions: RuntimeInteraction[] };

export interface SpecRuntimeGateway {
  preflight(input: RuntimeConfiguration): Promise<RuntimeCapabilities>;
  create(input: CreateRuntimeSession): Promise<RuntimeSession>;
  submit(input: SubmitSpecPrompt): Promise<RuntimeSubmission>;
  inspect(input: RuntimeIdentity): Promise<RuntimeSnapshot>;
  events(input: RuntimeCursor): AsyncIterable<RuntimeEvent>;
  interactions(input: RuntimeIdentity): Promise<RuntimeInteraction[]>;
  resolve(input: ResolveRuntimeInteraction): Promise<RuntimeResolution>;
  stop(input: RuntimeIdentity): Promise<RuntimeStop>;
}
