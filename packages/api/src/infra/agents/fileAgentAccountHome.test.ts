import { mkdtemp, mkdir, readlink, readdir, lstat, writeFile, chmod, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { FileAgentAccountHome } from "./fileAgentAccountHome";

const ACCOUNT_ID = "123e4567-e89b-42d3-a456-426614174000";
const roots: string[] = [];

afterEach(async () => { await Promise.all(roots.splice(0).map((root) => import("node:fs/promises").then(({ rm }) => rm(root, { recursive: true, force: true })))); });

async function temporaryDirectory() {
  const root = await mkdtemp(join(tmpdir(), "agent-account-home-"));
  roots.push(root);
  return root;
}

describe("FileAgentAccountHome", () => {
  it("V-04a and V-04b create a private account directory and links only existing approved files", async () => {
    const root = await temporaryDirectory();
    const personal = join(root, "personal-claude");
    const home = join(root, "state");
    await mkdir(join(personal, "skills"), { recursive: true });
    await writeFile(join(personal, "settings.json"), "{}");
    await writeFile(join(personal, "CLAUDE.md"), "rules");
    await mkdir(join(personal, "hooks"));
    await writeFile(join(personal, ".credentials.json"), "secret");
    await writeFile(join(personal, ".claude.json"), "secret");
    await writeFile(join(personal, "history.jsonl"), "history");
    await mkdir(join(personal, "projects"));
    const manager = new FileAgentAccountHome({ HOME: root, XDG_STATE_HOME: home, CLAUDE_CONFIG_DIR: personal });
    const accountPath = await manager.ensure({ id: ACCOUNT_ID, provider: "claude" });
    expect((await lstat(accountPath)).mode & 0o777).toBe(0o700);
    expect((await readdir(accountPath)).sort()).toEqual(["CLAUDE.md", "hooks", "settings.json", "skills"]);
    expect(await readlink(join(accountPath, "CLAUDE.md"))).toBe(join(personal, "CLAUDE.md"));
    expect(await lstat(join(accountPath, ".credentials.json")).then(() => true, () => false)).toBe(false);
    expect(await lstat(join(accountPath, ".claude.json")).then(() => true, () => false)).toBe(false);
    expect(await lstat(join(accountPath, "history.jsonl")).then(() => true, () => false)).toBe(false);
    expect(await lstat(join(accountPath, "projects")).then(() => true, () => false)).toBe(false);
  });

  it("V-04d recreates a deleted directory with approved links and rejects unsafe identifiers", async () => {
    const root = await temporaryDirectory();
    const personal = join(root, "personal-codex");
    await mkdir(personal);
    await writeFile(join(personal, "config.toml"), "model = 'gpt'");
    await writeFile(join(personal, "AGENTS.md"), "rules");
    await writeFile(join(personal, "auth.json"), "secret");
    await mkdir(join(personal, "sessions"));
    const manager = new FileAgentAccountHome({ HOME: root, XDG_STATE_HOME: join(root, "state"), CODEX_HOME: personal });
    const account = { id: ACCOUNT_ID, provider: "codex" as const };
    const initial = await manager.ensure(account);
    await import("node:fs/promises").then(({ rm }) => rm(initial, { recursive: true }));
    expect(await manager.ensure(account)).toBe(initial);
    expect((await readdir(initial)).sort()).toEqual(["AGENTS.md", "config.toml"]);
    expect(await lstat(join(initial, "auth.json")).then(() => true, () => false)).toBe(false);
    expect(await lstat(join(initial, "sessions")).then(() => true, () => false)).toBe(false);
    expect(() => manager.pathOf({ id: "../escape" })).toThrow("Identificador de conta inválido");
  });

  it("V-04e logs out with the account home and deletes it even when logout fails", async () => {
    const root = await temporaryDirectory();
    const bin = join(root, "bin");
    await mkdir(bin);
    const output = join(root, "logout.txt");
    const command = join(bin, "claude");
    await writeFile(command, `#!/bin/sh\nprintf '%s|%s' "$*" "$CLAUDE_CONFIG_DIR" > '${output}'\n`);
    await chmod(command, 0o700);
    const manager = new FileAgentAccountHome({ HOME: root, XDG_STATE_HOME: join(root, "state"), PATH: bin });
    const account = { id: ACCOUNT_ID, provider: "claude" as const };
    const home = await manager.ensure(account);
    expect(await manager.logoutAndDelete(account)).toEqual({ logout: "ok" });
    expect(await readFile(output, "utf8")).toBe(`auth logout|${home}`);
    expect(await lstat(home).then(() => true, () => false)).toBe(false);
    const failingAccount = { id: "123e4567-e89b-42d3-a456-426614174001", provider: "claude" as const };
    const failingHome = await manager.ensure(failingAccount);
    await writeFile(command, "#!/bin/sh\nexit 1\n");
    await chmod(command, 0o700);
    expect(await manager.logoutAndDelete(failingAccount)).toEqual({ logout: "failed" });
    expect(await lstat(failingHome).then(() => true, () => false)).toBe(false);
  });
});
