import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { computeBundleDigest, validateBundleContract } from "../../application/spec/specBundle";
import { SPEC_BUNDLE_SKILLS } from "../../application/spec/specPins";
import { TaskError } from "../../application/services/tasks/taskErrors";

export function defaultBundleDirectory() {
  return process.env.SPEC_BUNDLE_DIRECTORY ?? resolve(dirname(fileURLToPath(import.meta.url)), "../../../resources/spec");
}
const FRONTMATTER_NAME = /^---\r?\nname:\s*(\S+)/;

async function listFiles(root: string, relative = ""): Promise<string[]> {
  const names = await readdir(join(root, relative), { withFileTypes: true });
  const nested = await Promise.all(names.map((entry) => entry.isDirectory() ? listFiles(root, `${relative}${entry.name}/`) : [`${relative}${entry.name}`]));
  return nested.flat();
}

export async function loadSpecBundle(directory = defaultBundleDirectory()) {
  const paths = (await listFiles(directory)).filter((path) => !path.startsWith("fixtures/")).sort();
  const files = await Promise.all(paths.map(async (path) => ({ path, content: await readFile(join(directory, path)) })));
  const manifest = files.find((file) => file.path === "bundle.json");
  if (!manifest) throw new TaskError("runtime_incompatible");
  const contract = validateBundleContract(JSON.parse(manifest.content.toString("utf8")));
  for (const skill of SPEC_BUNDLE_SKILLS) assertSkillDocument(files, skill);
  return { contract, digest: computeBundleDigest(files), files: paths };
}

function assertSkillDocument(files: { path: string; content: Buffer }[], skill: string) {
  const document = files.find((file) => file.path === `${skill}/SKILL.md`);
  const name = document ? FRONTMATTER_NAME.exec(document.content.toString("utf8"))?.[1] : undefined;
  if (name !== skill) throw new TaskError("runtime_incompatible");
}
