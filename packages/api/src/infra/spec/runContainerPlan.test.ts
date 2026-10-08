import { describe, expect, it } from "vitest";
import { buildRunContainerArguments } from "./runContainerPlan";

const BASE = { runId: "run-1", image: "registry.example/flow@sha256:" + "a".repeat(64), docsProxyUrl: "https://docs.example.com", repositoryPath: "/srv/w/repo", homePath: "/srv/w/home", socketDirectory: "/srv/w/sock", providers: "codex-ab12cd34ef56:codex:c1" };

describe("run container plan", () => {
  it("mounts only the attempt grants and never reads a global provider or model", () => {
    const args = buildRunContainerArguments({ ...BASE, grants: [{ connectionId: "c1", mountPath: "/grants/a" }, { connectionId: "c2", mountPath: "/grants/b" }] });
    expect(args.filter((arg) => arg.includes("/run/grants/"))).toEqual(["type=bind,source=/grants/a,target=/run/grants/c1,rw", "type=bind,source=/grants/b,target=/run/grants/c2,rw"]);
    expect(args.join(" ")).not.toMatch(/SPEC_PROVIDER|SPEC_MODEL|CODEX_HOME|\.codex/);
    expect(args).toContain("--cap-drop=all");
    expect(args).not.toContain("--no-hostname");
    expect(args).toContain("FLOW_PROVIDERS=codex-ab12cd34ef56:codex:c1");
    expect(args.at(-1)).toBe(BASE.image);
  });

  it("keeps task-scoped home and repository mounts across runs", () => {
    const first = buildRunContainerArguments({ ...BASE, runId: "run-1", grants: [] });
    const second = buildRunContainerArguments({ ...BASE, runId: "run-2", grants: [] });
    const durable = (args: string[]) => args.filter((arg) => arg.includes("/workspace") || arg.includes("/var/lib/compozy"));
    expect(durable(first)).toEqual(durable(second));
    expect(first).toContain("flow-run-run-1");
  });
});
