import { describe, expect, it } from "vitest";
import { ARTIFACT_CHUNK_BYTES, assembleArtifacts, belongsToAction, isSafeArtifact, splitArtifact } from "./localArtifacts";
import { localPayloadHash } from "./localHash";
import { validateLocalEvent } from "./localProtocol";

const COMMAND_ID = "11111111-1111-4111-8111-111111111111";
const RUN_ID = "22222222-2222-4222-8222-222222222222";
const UNIT = "ação ✓ ";
const multibyte = (bytes: number) => UNIT.repeat(Math.ceil(bytes / Buffer.byteLength(UNIT)));

describe("local artifacts", () => {
  it("rebuilds a document split across parts, even when a character straddles a boundary", () => {
    const file = { path: "_spec.md", content: multibyte(ARTIFACT_CHUNK_BYTES * 2 + 100) };
    const parts = splitArtifact(file);
    expect(parts).toHaveLength(3);
    expect(assembleArtifacts([parts[2]!, parts[0]!, parts[1]!])).toEqual([file]);
  });

  it("produces parts the connector protocol accepts", () => {
    const [payload] = splitArtifact({ path: "adrs/adr-001.md", content: "# Decisão" });
    const event = { protocolVersion: 1, commandId: COMMAND_ID, runId: RUN_ID, fence: 1, sequence: 2, kind: "artifact", payload, payloadHash: localPayloadHash(payload) };
    expect(validateLocalEvent(event)).toMatchObject({ kind: "artifact", payload: { path: "adrs/adr-001.md", part: 1, parts: 1 } });
    expect(() => validateLocalEvent({ ...event, payload: { ...payload!, path: "../secret.md" }, payloadHash: localPayloadHash({ ...payload!, path: "../secret.md" }) })).toThrowError(expect.objectContaining({ reason: "invalid_input" }));
  });

  it("rejects a document with a missing part", () => {
    const parts = splitArtifact({ path: "_spec.md", content: multibyte(ARTIFACT_CHUNK_BYTES + 100) });
    expect(() => assembleArtifacts([parts[0]!])).toThrowError(expect.objectContaining({ reason: "evidence_rejected" }));
  });

  it("rejects credentials and paths outside the package", () => {
    const leaked = { path: "_spec.md", content: `token ghp_${"a".repeat(30)}` };
    expect(isSafeArtifact(leaked)).toBe(false);
    expect(() => assembleArtifacts(splitArtifact(leaked))).toThrowError(expect.objectContaining({ reason: "artifact_unsafe" }));
    expect(isSafeArtifact({ path: "nested/deep/file.md", content: "ok" })).toBe(false);
  });

  it("keeps task files for create_tasks and the rest for create_spec", () => {
    expect(belongsToAction("_tasks.md", "create_tasks")).toBe(true);
    expect(belongsToAction("task_01.md", "create_spec")).toBe(false);
    expect(belongsToAction("_spec.md", "create_spec")).toBe(true);
    expect(belongsToAction("_spec.md", "create_tasks")).toBe(false);
  });
});
