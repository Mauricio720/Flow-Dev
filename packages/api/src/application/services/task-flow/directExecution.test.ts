import { describe, expect, it } from "vitest";
import { assertRouteShape, flowRouteOf } from "./directExecution";
import type { FlowAction } from "./flowContracts";
import { TaskFlowError } from "./taskFlowErrors";

const runtime = { connectionId: "c1", providerId: "claude", modelId: "model-1", reasoningEffort: null };
const direct = (workspace: FlowAction["workspace"] = { kind: "local" }): FlowAction => ({ kind: "direct_execute", language: "pt-BR", runtime, workspace });
const spec: FlowAction = { kind: "create_spec", language: "pt-BR", runtime, workspace: { kind: "isolated" } };

describe("direct execution route", () => {
  it("maps only the approved direct planning route to the direct flow", () => {
    expect(flowRouteOf("direct_execution")).toBe("direct");
    expect(flowRouteOf("tech_spec")).toBe("spec");
    expect(flowRouteOf(null)).toBe("spec");
  });

  it("accepts a single local direct action on the direct route", () => {
    expect(() => assertRouteShape([direct()], "direct")).not.toThrow();
  });

  it("rejects spec actions on the direct route and direct actions on a spec route", () => {
    expect(() => assertRouteShape([spec], "direct")).toThrowError(new TaskFlowError("route_unsupported"));
    expect(() => assertRouteShape([direct(), direct()], "direct")).toThrowError(new TaskFlowError("route_unsupported"));
    expect(() => assertRouteShape([direct()], "spec")).toThrowError(new TaskFlowError("route_unsupported"));
    expect(() => assertRouteShape([direct()])).toThrowError(new TaskFlowError("route_unsupported"));
  });

  it("keeps direct execution on the operator machine", () => {
    expect(() => assertRouteShape([direct({ kind: "isolated" })], "direct")).toThrowError(new TaskFlowError("worktree_not_ready", undefined, { cause: "local_required" }));
  });

  it("leaves spec plans untouched", () => {
    expect(() => assertRouteShape([spec], "spec")).not.toThrow();
  });
});
