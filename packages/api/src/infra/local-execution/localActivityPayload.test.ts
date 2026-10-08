import { describe, expect, it } from "vitest";
import type { RunActivity } from "../../application/database/dao/taskFlowTypes";
import { reportedActivity, terminalFailure } from "./localFailureReport";
import { runtimeActivityPayload } from "./localActivityPayload";

const ROOT = "/home/operator/checkout";
const activity: RunActivity = { sequence: 8, kind: "warning", at: "2026-10-08T19:58:58Z", preview: "You’ve hit your usage limit.\nTry again at 4:59 PM.", source: null, tool: null, status: "usage_limit_exceeded" };

describe("local runtime activity payload", () => {
  it("sends a multiline provider error through the existing report and keeps it at terminal failure", () => {
    const payload = runtimeActivityPayload({ activity, root: ROOT, environment: {} });
    expect(payload?.summary).toBe("You’ve hit your usage limit. Try again at 4:59 PM.");
    const reported = reportedActivity({ sequence: 2, payload: payload! });
    expect(reported.at).toBe("2026-10-08T19:58:58.000Z");
    expect(terminalFailure({ sequence: 3, payload: { outcome: "failed", reason: "usage_limit_exceeded" } }, reported)).toMatchObject({ state: "failed", code: "usage_limit_exceeded", activity: { preview: payload?.summary } });
  });

  it("redacts checkout paths and environment secrets and hides unsafe fields", () => {
    const secret = "private-provider-secret";
    const input = { activity: { ...activity, preview: `Reading ${ROOT}/file using ${secret}`, source: `${ROOT}/.env`, tool: secret }, root: ROOT, environment: { PROVIDER_SECRET: secret } };
    const payload = runtimeActivityPayload(input);
    expect(JSON.stringify(payload)).not.toContain(ROOT);
    expect(JSON.stringify(payload)).not.toContain(secret);
    expect(payload?.relativeFiles).toEqual([]);
    expect(runtimeActivityPayload({ ...input, activity: { ...activity, preview: "Reading /home/another/private" } })).toBeNull();
  });
});
