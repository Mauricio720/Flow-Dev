import { describe, expect, it } from "vitest";
import { projectHostLayer } from "../../../application/software/hostReadiness";
import { collectHostChecks } from "./hostReadiness";
import type { SpecConfigurationProbe } from "../specConfiguration";

const probe = (isolation: boolean): SpecConfigurationProbe => ({
  directoryWritable: async () => true,
  bundleDigest: async () => "x",
  isolationEnforceable: async () => isolation,
  codexChatGptLoginReady: async () => true,
});

describe("host readiness", () => {
  it("reports each missing prerequisite separately without provisioning", async () => {
    const checks = await collectHostChecks({}, probe(false));
    expect(checks).toEqual({ workspaceRootWritable: false, runtimeImagePinned: false, isolationEnforceable: false, credentialRootPrivate: false });
    expect(projectHostLayer(checks)).toEqual({ state: "blocked", reasonCode: "workspace_root_unavailable" });
  });

  it("is ready only when every check passes and unknown when checks fail to run", () => {
    expect(projectHostLayer({ workspaceRootWritable: true, runtimeImagePinned: true, isolationEnforceable: true, credentialRootPrivate: true })).toEqual({ state: "ready" });
    expect(projectHostLayer(null)).toEqual({ state: "unknown", reasonCode: "host_check_failed" });
  });
});
