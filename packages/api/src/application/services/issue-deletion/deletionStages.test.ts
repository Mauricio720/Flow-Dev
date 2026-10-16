import { describe, expect, it } from "vitest";
import { canEnterCleanup, classifyLocalOnly, cleanupAllowedFor } from "./deletionStages";

describe("deletionStages", () => {
  it("UT-029 a linked operation with remotePresence unknown cannot enter cleaning_local or completed", () => {
    expect(canEnterCleanup({ remotePresence: "unknown" }, true)).toBe(false);
    expect(cleanupAllowedFor("unknown")).toBe(false);
    expect(canEnterCleanup({ remotePresence: "present" }, true)).toBe(false);
    expect(canEnterCleanup({ remotePresence: "absent" }, true)).toBe(true);
    expect(canEnterCleanup({ remotePresence: "not_applicable" }, true)).toBe(true);
    expect(canEnterCleanup({ remotePresence: "absent" }, false)).toBe(false);
  });

  it("UT-030 a task with any publication attempt and no confirmed noncreation is not classified as local-only", () => {
    expect(classifyLocalOnly([])).toBe(true);
    expect(classifyLocalOnly([{ outcome: "rejected" }])).toBe(true);
    expect(classifyLocalOnly([{ outcome: "created" }])).toBe(false);
    expect(classifyLocalOnly([{ outcome: "dispatching" }])).toBe(false);
    expect(classifyLocalOnly([{ outcome: "uncertain" }])).toBe(false);
    expect(classifyLocalOnly([{ outcome: "queued" }])).toBe(false);
    expect(classifyLocalOnly([{ outcome: null }])).toBe(false);
    expect(classifyLocalOnly([{ outcome: "rejected" }, { outcome: "uncertain" }])).toBe(false);
  });
});
