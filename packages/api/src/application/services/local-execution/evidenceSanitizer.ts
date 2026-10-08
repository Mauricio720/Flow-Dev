import { createHash } from "node:crypto";
import { LocalExecutionError } from "./localExecutionErrors";

const MAX_ITEM_BYTES = 256 * 1024;
const MAX_PREVIEW_BYTES = 16 * 1024;
const MAX_RUN_BYTES = 10 * 1024 * 1024;
const CONTROL_CHARS = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g;

export type SafeEvidence = { kind: "activity" | "test_summary" | "document_preview"; label: string; content: string; contentHash: string; truncated: boolean };

export function sanitizeEvidence(input: { kind: string; label: string; content: string; privatePaths: string[]; secrets: string[]; usedBytes?: number }): SafeEvidence {
  if (!["activity", "test_summary", "document_preview"].includes(input.kind)) throw new LocalExecutionError("evidence_rejected");
  if (Buffer.byteLength(input.content, "utf8") > MAX_ITEM_BYTES) throw new LocalExecutionError("evidence_rejected");
  if (input.kind === "activity" && (input.content.includes("\u001b") || /(?:\.png|\.zip|trace\.json)/i.test(input.label))) throw new LocalExecutionError("evidence_rejected");
  let content = input.content.replace(CONTROL_CHARS, "").replace(/<[^>]*>/g, "");
  for (const secret of input.secrets.filter(Boolean)) content = content.split(secret).join("[redacted]");
  for (const path of input.privatePaths.filter(Boolean)) content = content.split(path).join("[local path]");
  content = content.replace(/https:\/\/[^\s/@]+:[^\s/@]+@/gi, "https://[redacted]@");
  content = content.replace(/(?:\/home\/[^\s:]+|\/Users\/[^\s:]+|[A-Z]:\\Users\\[^\s:]+)/g, "[local path]");
  const byteLimit = input.kind === "document_preview" ? MAX_PREVIEW_BYTES : MAX_ITEM_BYTES;
  const bounded = utf8Prefix(content, byteLimit);
  const available = Math.max(0, MAX_RUN_BYTES - (input.usedBytes ?? 0));
  const shared = utf8Prefix(bounded.content, available);
  const finalContent = shared.content;
  return { kind: input.kind as SafeEvidence["kind"], label: safeLabel(input.label), content: finalContent, contentHash: createHash("sha256").update(finalContent).digest("hex"), truncated: bounded.truncated || shared.truncated };
}

function utf8Prefix(value: string, maxBytes: number) { const bytes = Buffer.from(value); if (bytes.length <= maxBytes) return { content: value, truncated: false }; return { content: bytes.subarray(0, Math.max(0, maxBytes)).toString("utf8").replace(/\uFFFD$/, ""), truncated: true }; }
function safeLabel(value: string) { return value.replace(/[\\/]/g, "/").split("/").pop()?.replace(/[\u0000-\u001f]/g, "").slice(0, 100) || "evidence"; }
