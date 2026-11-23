import { mkdir, mkdtemp, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { FileSessionSettingsRemover } from "./fileSessionSettingsRemover";

const SESSION_ID = "11111111-2222-4333-8444-555555555555";
const folders: string[] = [];

afterEach(async () => {
  await Promise.all(folders.splice(0).map((folder) => rm(folder, { recursive: true, force: true })));
});

async function legacySettingsFile() {
  const root = await mkdtemp(join(tmpdir(), "settings-"));
  folders.push(root);
  const directory = join(root, "flow-dev", "terminal-sessions", SESSION_ID, "privado");
  await mkdir(directory, { recursive: true });
  const file = join(directory, "settings.json");
  await writeFile(file, "{}");
  return { root, file };
}

describe("FileSessionSettingsRemover", () => {
  it("removes the settings file of an old terminal session and tolerates a second removal", async () => {
    const { root, file } = await legacySettingsFile();
    const remover = new FileSessionSettingsRemover({ XDG_STATE_HOME: root });
    await remover.remove(SESSION_ID);
    await expect(stat(file)).rejects.toThrow();
    await expect(remover.remove(SESSION_ID)).resolves.toBeUndefined();
  });

  it("refuses an identifier that is not a UUID", async () => {
    await expect(new FileSessionSettingsRemover({}).remove("../../etc")).rejects.toThrow("Identificador de sessão inválido");
  });
});
