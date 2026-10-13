import { describe, expect, it } from "vitest";
import { COMPOZY_PIN } from "../../../application/spec/specPins";
import { PinnedCompozyControlGateway } from "./compozyControlGateway";
import { withRoleRuntimes } from "./compozyReviewLoop";
import type { CompozyRequest, CompozyTransport } from "./compozyTransport";

const IDENTITY = { status: 200, body: { schema_version: "2026-07-16", daemon: { version: COMPOZY_PIN.version } } };
const LOOPS_PATH = "/api/workspaces/ws-1/loops";
const BUNDLED = {
  apiVersion: "compozy.loop/v1",
  inputs: { task_name: { type: "string", required: true }, reviewer: { type: "agent", default: "reviewer" } },
  graph: {
    nodes: [
      { id: "review", kind: "run-agent", params: { agent: "{{ .inputs.reviewer }}" } },
      { id: "has_issues", kind: "branch" },
      { id: "fix_batch", kind: "run-agent", params: { agent: "{{ .inputs.fixer }}" } },
    ],
    edges: [{ from: "review", to: "has_issues" }],
  },
};

function gatewayWith(routes: Record<string, { status: number; body: unknown }>) {
  const calls: CompozyRequest[] = [];
  const transport: CompozyTransport = async (request) => {
    calls.push(request);
    if (request.path === "/api/status/identity") return IDENTITY;
    return routes[`${request.method} ${request.path}`] ?? { status: 404, body: { error: "not found" } };
  };
  return { gateway: new PinnedCompozyControlGateway({ transport, declaredOpenApiSha256: COMPOZY_PIN.openApiSha256 }), calls };
}

const inspected = (definition: unknown) => ({ status: 200, body: { loop: { name: "review-and-fix", version: 0, source: "marketplace", definition } } });
const published = (calls: CompozyRequest[]) => calls.filter((call) => call.method === "POST");

describe("review loop role runtimes", () => {
  it("gives the reviewer and the fixer their own runtime input and leaves the rest of the definition untouched", () => {
    const split = withRoleRuntimes(BUNDLED);
    expect(split?.inputs).toEqual({ ...BUNDLED.inputs, reviewer_runtime: { type: "runtime", required: false }, fixer_runtime: { type: "runtime", required: false } });
    expect(split?.graph.nodes).toEqual([
      { id: "review", kind: "run-agent", params: { agent: "{{ .inputs.reviewer }}", runtime: "{{ .inputs.reviewer_runtime }}" } },
      { id: "has_issues", kind: "branch" },
      { id: "fix_batch", kind: "run-agent", params: { agent: "{{ .inputs.fixer }}", runtime: "{{ .inputs.fixer_runtime }}" } },
    ]);
    expect(split).toMatchObject({ apiVersion: BUNDLED.apiVersion, graph: { edges: BUNDLED.graph.edges } });
  });

  it("keeps a definition that already has the inputs or whose agent nodes changed", () => {
    expect(withRoleRuntimes(withRoleRuntimes(BUNDLED)!)).toBeNull();
    expect(withRoleRuntimes({ ...BUNDLED, graph: { nodes: [{ id: "review" }] } })).toBeNull();
  });

  it("publishes the split definition to the workspace once", async () => {
    const first = gatewayWith({ [`GET ${LOOPS_PATH}/review-and-fix`]: inspected(BUNDLED), [`POST ${LOOPS_PATH}`]: { status: 201, body: { loop: {} } } });
    expect(await first.gateway.prepareReviewLoop("ws-1")).toMatchObject({ ok: true });
    expect(published(first.calls).map((call) => call.body)).toEqual([{ definition: withRoleRuntimes(BUNDLED) }]);
    const again = gatewayWith({ [`GET ${LOOPS_PATH}/review-and-fix`]: inspected(withRoleRuntimes(BUNDLED)) });
    expect(await again.gateway.prepareReviewLoop("ws-1")).toMatchObject({ ok: true });
    expect(published(again.calls)).toEqual([]);
  });

  it("accepts a concurrent publication and reports a daemon that does not offer the Loop", async () => {
    const raced = gatewayWith({ [`GET ${LOOPS_PATH}/review-and-fix`]: inspected(BUNDLED), [`POST ${LOOPS_PATH}`]: { status: 409, body: { error: "exists" } } });
    expect(await raced.gateway.prepareReviewLoop("ws-1")).toMatchObject({ ok: true });
    expect(await gatewayWith({}).gateway.prepareReviewLoop("ws-1")).toMatchObject({ ok: false });
  });
});
