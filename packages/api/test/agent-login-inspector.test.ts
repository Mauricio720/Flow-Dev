import { mkdtemp, mkdir, writeFile, chmod, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { PathToolLocator } from "../src/infra/terminal/pathToolLocator";
import { CliAgentLoginInspector } from "../src/infra/agents/cliAgentLoginInspector";

const roots: string[] = [];
const ACCOUNT_HOME = "/account-home";

afterEach(async () => { await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))); });

async function temporaryDirectory() {
  const root = await mkdtemp(join(tmpdir(), "agent-login-inspector-"));
  roots.push(root);
  return root;
}

describe("CliAgentLoginInspector Claude status", () => {
  it("V-03a asks Claude in an empty config directory and reports logged out", async ({ skip }) => {
    const tools = new PathToolLocator(process.env);
    if (!await tools.has("claude")) return skip("Claude Code CLI is not installed in PATH");
    const root = await temporaryDirectory();
    const home = join(root, "empty-claude-home");
    await mkdir(home);
    const status = await new CliAgentLoginInspector(tools).inspect({ provider: "claude", home });
    expect(status).toEqual({ status: "logged_out", identity: null, plan: null, detail: null });
  });

  it("reads the configured account home through the CLI process environment", async () => {
    const root = await temporaryDirectory();
    const bin = join(root, "bin");
    await mkdir(bin);
    const command = join(bin, "claude");
    await writeFile(command, `#!/bin/sh\ntest "$CLAUDE_CONFIG_DIR" = "${ACCOUNT_HOME}" || exit 4\nprintf '%s' '{"loggedIn":true,"authMethod":"claude.ai","email":"ana@exemplo.com","subscriptionType":"max"}'\n`);
    await chmod(command, 0o700);
    const status = await new CliAgentLoginInspector(new PathToolLocator({ PATH: bin }), { PATH: bin }).inspect({ provider: "claude", home: ACCOUNT_HOME });
    expect(status).toEqual({ status: "logged_in", identity: "ana@exemplo.com", plan: "max", detail: null });
  });

  it("V-03e checks an empty Codex home when the CLI is installed", async ({ skip }) => {
    const tools = new PathToolLocator(process.env);
    if (!await tools.has("codex")) return skip("Codex CLI is not installed in PATH");
    const root = await temporaryDirectory();
    const home = join(root, "empty-codex-home");
    await mkdir(home);
    const status = await new CliAgentLoginInspector(tools).inspect({ provider: "codex", home });
    expect(status).toEqual({ status: "logged_out", identity: null, plan: null, detail: null });
  });

  it("V-03d reports a provider-specific missing executable status", async () => {
    const inspector = new CliAgentLoginInspector(new PathToolLocator({ PATH: "" }), { PATH: "" });
    const codex = await inspector.inspect({ provider: "codex", home: ACCOUNT_HOME });
    const claude = await inspector.inspect({ provider: "claude", home: ACCOUNT_HOME });
    expect(codex.detail).toBe("O Codex não foi encontrado nesta máquina");
    expect(claude.detail).toBe("O Claude Code não foi encontrado nesta máquina");
    expect([codex.status, claude.status]).toEqual(["check_failed", "check_failed"]);
  });

  it("recognizes a logged in Codex status from a CLI process", async () => {
    const root = await temporaryDirectory();
    const bin = join(root, "bin");
    await mkdir(bin);
    const command = join(bin, "codex");
    await writeFile(command, "#!/bin/sh\ntest \"$1 $2\" = \"login status\" || exit 4\nprintf '%s' 'Logged in with ChatGPT'\n");
    await chmod(command, 0o700);
    const status = await new CliAgentLoginInspector(new PathToolLocator({ PATH: bin }), { PATH: bin }).inspect({ provider: "codex", home: ACCOUNT_HOME });
    expect(status).toEqual({ status: "logged_in", identity: null, plan: null, detail: null });
  });

  it("V-03f times out an unresponsive CLI and refuses the fake in production", async () => {
    const root = await temporaryDirectory();
    const bin = join(root, "bin");
    await mkdir(bin);
    const command = join(bin, "codex");
    await writeFile(command, "#!/bin/sh\nexec /bin/sleep 2\n");
    await chmod(command, 0o700);
    const tools = new PathToolLocator({ PATH: bin });
    const status = await new CliAgentLoginInspector(tools, { PATH: bin }, 30).inspect({ provider: "codex", home: ACCOUNT_HOME });
    expect(status).toEqual({ status: "check_failed", identity: null, plan: null, detail: null });
    const fake = await new CliAgentLoginInspector(tools, { NODE_ENV: "test", FLOW_DEV_AGENT_LOGIN_FAKE: "logged_in" }).inspect({ provider: "codex", home: ACCOUNT_HOME });
    expect(fake.status).toBe("logged_in");
    const development = await new CliAgentLoginInspector(tools, { NODE_ENV: "development", FLOW_DEV_AGENT_LOGIN_FAKE: "logged_out" }).inspect({ provider: "codex", home: ACCOUNT_HOME });
    expect(development.status).toBe("logged_out");
    await expect(new CliAgentLoginInspector(tools, { NODE_ENV: "production", FLOW_DEV_AGENT_LOGIN_FAKE: "logged_in" }).inspect({ provider: "codex", home: ACCOUNT_HOME })).rejects.toThrow("not allowed in production");
  });
});
