import { describe, expect, it } from "vitest";
import { buildAgentEnvironment } from "./agentEnvironment";

describe("agent environment", () => {
  it("V-05b drops every variable outside the allow list", () => {
    const source = { PATH: "/bin", HOME: "/home/a", LANG: "pt_BR.UTF-8", DATABASE_URL: "postgres://x", GITHUB_REPOSITORY_TOKEN_KEY: "k", BETTER_AUTH_SECRET: "s", GITHUB_TOKEN: "t", OPENCODE_API_KEY: "o" };
    const environment = buildAgentEnvironment(source);
    expect(environment).toEqual({ PATH: "/bin", HOME: "/home/a", LANG: "pt_BR.UTF-8" });
    for (const name of ["DATABASE_URL", "GITHUB_REPOSITORY_TOKEN_KEY", "BETTER_AUTH_SECRET", "GITHUB_TOKEN", "OPENCODE_API_KEY"]) expect(environment).not.toHaveProperty(name);
  });

  it("adds the explicit extra variables and skips unset allowed ones", () => {
    expect(buildAgentEnvironment({ PATH: "/bin" }, { FLOW_CONTEXT_TOKEN: "cap" })).toEqual({ PATH: "/bin", FLOW_CONTEXT_TOKEN: "cap" });
  });
});
