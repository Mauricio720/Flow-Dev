import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { FLOW_DEV_SKILLS } from "../src/application/terminal/sessionContext";
import { FileSessionContextBuilder } from "../src/infra/terminal/fileSessionContextBuilder";
import { flowDevSkillsDir } from "../src/infra/terminal/flowDevSkillsDir";

const SESSION_ID = "11111111-1111-4111-8111-111111111111";
const folders: string[] = [];
afterEach(async () => {
  await Promise.all(folders.splice(0).map((folder) => rm(folder, { recursive: true, force: true })));
});

async function temporary(prefix: string) {
  const folder = await mkdtemp(join(tmpdir(), prefix));
  folders.push(folder);
  return folder;
}

async function world() {
  const state = await temporary("state-");
  const home = await temporary("home-");
  const skills = await temporary("skills-");
  for (const skill of FLOW_DEV_SKILLS) {
    await mkdir(join(skills, skill, "references"), { recursive: true });
    await writeFile(join(skills, skill, "SKILL.md"), `---\nname: ${skill}\n---\noriginal ${skill}`);
    await writeFile(join(skills, skill, "references", "guide.md"), "guia");
  }
  const env = { XDG_STATE_HOME: state, HOME: home, FLOW_DEV_SKILLS_DIR: skills };
  return { env, state, home, skills, builder: new FileSessionContextBuilder(env) };
}

async function fingerprint(folder: string): Promise<string[]> {
  const entries = await readdir(folder, { withFileTypes: true, recursive: true });
  const lines = await Promise.all(entries.filter((entry) => entry.isFile()).map(async (entry) => {
    const path = join(entry.parentPath, entry.name);
    return `${path}:${createHash("sha256").update(await readFile(path)).digest("hex")}`;
  }));
  return lines.sort();
}

describe("FileSessionContextBuilder", () => {
  it("V-04d copies the four skills with every file as a flow-dev plugin and locks the session folder", async () => {
    const { builder, env } = await world();
    const paths = await builder.prepare(SESSION_ID);
    expect(paths.sessionDir).toBe(join(env.XDG_STATE_HOME, "flow-dev", "terminal-sessions", SESSION_ID));
    for (const skill of FLOW_DEV_SKILLS) expect(await readFile(join(paths.contextDir, "skills", skill, "references", "guide.md"), "utf8")).toBe("guia");
    expect(JSON.parse(await readFile(join(paths.contextDir, ".claude-plugin", "plugin.json"), "utf8")).name).toBe("flow-dev");
    expect((await stat(paths.sessionDir)).mode & 0o777).toBe(0o700);
    expect((await stat(paths.attachmentsDir)).isDirectory()).toBe(true);
  });

  it("V-04e keeps the session copy when the source skill changes afterwards", async () => {
    const { builder, skills } = await world();
    const paths = await builder.prepare(SESSION_ID);
    await writeFile(join(skills, "spec-writer", "SKILL.md"), "mudou depois");
    expect(await readFile(join(paths.contextDir, "skills", "spec-writer", "SKILL.md"), "utf8")).toContain("original spec-writer");
  });

  it("V-04f leaves the personal .claude folder untouched", async () => {
    const { builder, home } = await world();
    await mkdir(join(home, ".claude", "skills", "mine"), { recursive: true });
    await writeFile(join(home, ".claude", "skills", "mine", "SKILL.md"), "minha");
    const before = await fingerprint(join(home, ".claude"));
    await builder.prepare(SESSION_ID);
    expect(await fingerprint(join(home, ".claude"))).toEqual(before);
  });

  it("lists the skills missing from the source and discards a session folder", async () => {
    const { builder, skills } = await world();
    await rm(join(skills, "spec-conformance", "SKILL.md"));
    expect(await builder.missingSkills()).toEqual(["spec-conformance"]);
    const paths = await builder.prepare(SESSION_ID);
    await builder.discard(SESSION_ID);
    await expect(stat(paths.sessionDir)).rejects.toThrow();
  });

  it("refuses an identifier that is not a uuid, so it can never escape the sessions root", async () => {
    const { builder } = await world();
    await expect(builder.prepare("../../etc")).rejects.toThrow("inválido");
    await expect(builder.discard("..")).rejects.toThrow("inválido");
  });

  it("finds the monorepo skills folder by climbing to pnpm-workspace.yaml", async () => {
    const found = await flowDevSkillsDir({}, process.cwd());
    expect(found?.endsWith(join(".claude", "skills"))).toBe(true);
    expect((await stat(join(found!, "spec-writer", "SKILL.md"))).isFile()).toBe(true);
  });
});
