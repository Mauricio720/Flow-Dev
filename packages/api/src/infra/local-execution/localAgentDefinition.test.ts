import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { agentDefinitionFor } from "./localAgentDefinition";

const AGENTS = ["flow-spec", "flow-direct", "flow-publish"];
const FULL_ACCESS_OPTION = "agent-full-access";

const bundled = (agent: string) => readFile(join(process.cwd(), "runtime", "agents", agent, "AGENT.md"), "utf8");

describe("agentDefinitionFor", () => {
  it.each(AGENTS)("keeps the full-access mode of %s for a Codex run", async (agent) => {
    const definition = await bundled(agent);
    expect(agentDefinitionFor(definition, ["codex"])).toBe(definition);
    expect(definition).toContain(FULL_ACCESS_OPTION);
  });

  it.each(AGENTS)("drops the Codex-only ACP options of %s for another provider", async (agent) => {
    const definition = await bundled(agent);
    const adapted = agentDefinitionFor(definition, ["opencode"]);
    expect(adapted).not.toContain("acp_options");
    expect(adapted).not.toContain(FULL_ACCESS_OPTION);
    expect(adapted).toContain("permissions: approve-all\n---\n");
    expect(adapted.split("---\n")[2]).toBe(definition.split("---\n")[2]);
  });

  it("drops the options when a run mixes Codex with another provider", async () => {
    expect(agentDefinitionFor(await bundled("flow-publish"), ["codex", "claude"])).not.toContain(FULL_ACCESS_OPTION);
  });
});
