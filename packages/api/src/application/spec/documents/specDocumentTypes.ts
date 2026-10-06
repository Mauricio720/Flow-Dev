import { z } from "zod";

export type ReviewBlockKind = "heading" | "prose" | "list" | "table" | "code" | "diagram";
export type ReviewBlock = { id: string; documentId: string; sourceHash: string; startByte: number; endByte: number; kind: ReviewBlockKind; content: string; level?: number };
export type ReviewDiagnostic = { code: string; severity: "blocking" | "observation"; documentId: string | null; blockId: string | null; message: string };
export type ParsedDocument = { path: string; role: string; sourceText: string | null; sha256: string; byteCount: number; blocks: ReviewBlock[]; diagnostics: ReviewDiagnostic[] };
export type DocumentInput = { path: string; role: string; bytes: Buffer };

const hash = z.string().regex(/^[0-9a-f]{64}$/);
const byteOffset = z.number().int().nonnegative();
export const sourceReferenceSchema = z.object({ documentPath: z.string().min(1), startByte: byteOffset, endByte: byteOffset, sourceHash: hash });
const identity = z.object({ packageId: z.string().min(1), manifestHash: hash, stage: z.enum(["prd", "tech_spec", "tasks"]) });
const decision = z.object({ id: z.string().min(1), severity: z.enum(["blocking", "observation"]), status: z.enum(["open", "resolved"]), source: sourceReferenceSchema, resolutionInteractionId: z.string().nullish(), rationale: z.string().nullish() });
const story = z.object({ id: z.string().min(1), title: z.string(), source: sourceReferenceSchema, acceptance: z.array(z.object({ id: z.string(), source: sourceReferenceSchema })).default([]), edges: z.array(z.object({ id: z.string(), source: sourceReferenceSchema })).default([]) });
const test = z.object({ id: z.string().min(1), tier: z.enum(["task-required", "feature-gate", "qa-release"]), source: sourceReferenceSchema, references: z.array(z.string()).default([]), ownerTaskId: z.string().nullish(), gateOwner: z.string().nullish() });
const task = z.object({ id: z.string().min(1), title: z.string(), path: z.string(), dependsOn: z.array(z.string()), testIds: z.array(z.string()), scope: sourceReferenceSchema, acceptance: sourceReferenceSchema });

export const specPackageIndexSchema = z.object({
  schemaVersion: z.literal(1),
  stage: z.enum(["prd", "tech_spec", "tasks"]),
  documents: z.array(z.object({ path: z.string(), role: z.string(), sha256: hash, sourceBytes: byteOffset })),
  upstream: z.array(identity),
  stories: z.array(story),
  tests: z.array(test),
  tasks: z.array(task),
  decisions: z.array(decision),
});
export type SpecPackageIndexData = z.infer<typeof specPackageIndexSchema>;
export type IndexedTaskData = z.infer<typeof task>;
export type IndexedTestData = z.infer<typeof test>;
export type SourceReferenceData = z.infer<typeof sourceReferenceSchema>;
