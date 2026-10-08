import { describe, expect, it } from "vitest";
import { assertSettingsValues } from "../application/services/software/settingsRules";
import { SoftwareError } from "../application/services/software/softwareErrors";
import { saveSettingsSchema } from "./software";

const KEY = "f907e2bf-42dd-4dc4-a5a8-93f95f2d76ea";
const reasonOf = (run: () => void) => {
  try { run(); } catch (error) { return error instanceof SoftwareError ? error.reason : "other"; }
  return null;
};

describe("software settings validation", () => {
  it("UT-022 accepts maxActiveActions=4 and rejects 5 with the domain code", () => {
    expect(reasonOf(() => assertSettingsValues({ enabled: false, docsProxyUrl: null, maxActiveActions: 4 }))).toBeNull();
    expect(reasonOf(() => assertSettingsValues({ enabled: false, docsProxyUrl: null, maxActiveActions: 5 }))).toBe("max_active_actions_out_of_range");
    expect(reasonOf(() => assertSettingsValues({ enabled: false, docsProxyUrl: null, maxActiveActions: 0 }))).toBe("max_active_actions_out_of_range");
  });

  it("requires an HTTPS docs proxy without credentials when enabled", () => {
    const base = { enabled: true, maxActiveActions: 2 };
    expect(reasonOf(() => assertSettingsValues({ ...base, docsProxyUrl: "http://docs.example.com" }))).toBe("docs_proxy_https_required");
    expect(reasonOf(() => assertSettingsValues({ ...base, docsProxyUrl: "https://user:pw@docs.example.com" }))).toBe("docs_proxy_https_required");
    expect(reasonOf(() => assertSettingsValues({ ...base, docsProxyUrl: null }))).toBe("docs_proxy_required");
    expect(reasonOf(() => assertSettingsValues({ ...base, docsProxyUrl: "https://docs.example.com/spec" }))).toBeNull();
  });

  it("normalizes blank proxy input and rejects unknown or oversized fields", () => {
    const parsed = saveSettingsSchema.parse({ values: { enabled: false, docsProxyUrl: "   ", maxActiveActions: 1 }, expectedRevision: 0, idempotencyKey: KEY });
    expect(parsed.values.docsProxyUrl).toBeNull();
    expect(saveSettingsSchema.safeParse({ values: { enabled: false, maxActiveActions: 1, token: "x" }, expectedRevision: 0, idempotencyKey: KEY }).success).toBe(false);
    expect(saveSettingsSchema.safeParse({ values: { enabled: false, docsProxyUrl: `https://${"a".repeat(3000)}`, maxActiveActions: 1 }, expectedRevision: 0, idempotencyKey: KEY }).success).toBe(false);
  });
});
