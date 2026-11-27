import { randomUUID } from "node:crypto";
import postgres from "postgres";
import { e2eDatabaseUrl } from "./fixtures/environment";
import { ProjectSeed } from "./fixtures/seed";
import { SESSION_COOKIE, signedSessionValue } from "./fixtures/session";

const PUBLIC_PATHS = ["/login"];
const TRPC_PATH = "/api/trpc/projects.connectionStates?batch=1&input=%7B%7D";

function privatePaths(projectId: string) {
  const project = `/projects/${projectId}`;
  const taskId = randomUUID();
  return ["/projects", "/projects/new", project, `${project}/work`, `${project}/work/${taskId}`, `${project}/issues`, `${project}/issues/${taskId}`, `${project}/settings`, "/settings/ai-accounts"];
}

async function visit(baseURL: string, paths: string[], cookie?: string) {
  for (const path of paths) await fetch(new URL(path, baseURL), { headers: cookie ? { cookie } : {}, redirect: "manual" });
}

export async function warmUpServer(baseURL: string) {
  await visit(baseURL, [...PUBLIC_PATHS, TRPC_PATH]);
  const sql = postgres(e2eDatabaseUrl ?? "", { max: 1, onnotice: () => {} });
  const seed = new ProjectSeed(sql);
  try {
    const admin = await seed.operator({ admin: true });
    const project = await seed.project({ assignedTo: [admin] });
    await visit(baseURL, privatePaths(project.id), `${SESSION_COOKIE}=${signedSessionValue(admin.sessionToken)}`);
  } finally {
    await seed.cleanup();
    await sql.end();
  }
}
