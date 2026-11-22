import { access } from "node:fs/promises";
import { dirname, join } from "node:path";

const WORKSPACE_MARKER = "pnpm-workspace.yaml";
const SKILLS_RELATIVE_PATH = join(".claude", "skills");

async function exists(path: string) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function findWorkspaceRoot(start: string) {
  let current = start;
  while (!(await exists(join(current, WORKSPACE_MARKER)))) {
    const parent = dirname(current);
    if (parent === current) return null;
    current = parent;
  }
  return current;
}

export async function flowDevSkillsDir(env: NodeJS.ProcessEnv = process.env, cwd: string = process.cwd()) {
  if (env.FLOW_DEV_SKILLS_DIR) return env.FLOW_DEV_SKILLS_DIR;
  const root = await findWorkspaceRoot(cwd);
  return root ? join(root, SKILLS_RELATIVE_PATH) : null;
}
