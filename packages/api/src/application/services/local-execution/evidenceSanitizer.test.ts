import { describe, expect, it } from "vitest";
import { LocalExecutionError } from "./localExecutionErrors";
import { sanitizeEvidence } from "./evidenceSanitizer";

describe("sanitizeEvidence", () => {
  it("UT-048 and UT-150 keeps typed safe summaries and strips secrets and private paths", () => {
    const result = sanitizeEvidence({ kind: "test_summary", label: "tests/export.spec.ts", content: "passed ENV_CANARY_123 /home/alice/private", privatePaths: ["/home/alice/private"], secrets: ["ENV_CANARY_123"] });
    expect(result).toMatchObject({ label: "export.spec.ts", content: "passed [redacted] [local path]", truncated: false });
  });

  it("UT-070 rejects raw traces instead of forwarding them", () => {
    expect(() => sanitizeEvidence({ kind: "activity", label: "playwright-trace.zip", content: "trace", privatePaths: [], secrets: [] })).toThrowError(new LocalExecutionError("evidence_rejected"));
  });

  it("UT-066 preserves decisive statuses while bounding evidence", () => {
    const result = sanitizeEvidence({ kind: "activity", label: "output", content: "x".repeat(1024), privatePaths: [], secrets: [], usedBytes: 10 * 1024 * 1024 });
    expect(result).toMatchObject({ content: "", truncated: true });
  });

  it("UT-151 and UT-166 reject unknown binary evidence kinds", () => {
    expect(() => sanitizeEvidence({ kind: "trace", label: "trace", content: "bytes", privatePaths: [], secrets: [] })).toThrowError(new LocalExecutionError("evidence_rejected"));
  });

  it("UT-152 caps shared previews to 16384 UTF-8 bytes", () => {
    const result = sanitizeEvidence({ kind: "document_preview", label: "document.md", content: "é".repeat(9000), privatePaths: [], secrets: [] });
    expect(Buffer.byteLength(result.content)).toBe(16384);
    expect(result.truncated).toBe(true);
  });
});
