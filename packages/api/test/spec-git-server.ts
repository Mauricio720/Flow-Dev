import { execFileSync, spawn } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

export const GIT_TOKEN = "ghp_canary_token_1234567890";
const GIT_ENV = { GIT_AUTHOR_NAME: "t", GIT_AUTHOR_EMAIL: "t@test.invalid", GIT_COMMITTER_NAME: "t", GIT_COMMITTER_EMAIL: "t@test.invalid", GIT_CONFIG_GLOBAL: "/dev/null", PATH: process.env.PATH ?? "" };
const git = (cwd: string, ...args: string[]) => execFileSync("git", args, { cwd, env: GIT_ENV, encoding: "utf8" }).trim();

export async function createRemote(files: Record<string, string>, owner = "acme", name = "private") {
  const root = await mkdtemp(join(tmpdir(), "spec-remote-"));
  const work = join(root, "work");
  await mkdir(work, { recursive: true });
  git(work, "init", "-q", "-b", "main");
  for (const [path, content] of Object.entries(files)) { await mkdir(dirname(join(work, path)), { recursive: true }); await writeFile(join(work, path), content); }
  git(work, "add", "-A");
  git(work, "commit", "-q", "-m", "initial");
  const commit = git(work, "rev-parse", "HEAD");
  await mkdir(join(root, "repos", owner), { recursive: true });
  git(root, "clone", "-q", "--bare", work, join(root, "repos", owner, `${name}.git`));
  const server = createServer((request, response) => handle(root, request, response));
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = (server.address() as { port: number }).port;
  return { baseUrl: `http://127.0.0.1:${port}`, commit, close: async () => { server.closeAllConnections(); await new Promise((resolve) => server.close(resolve)); await rm(root, { recursive: true, force: true }); } };
}

function handle(root: string, request: import("node:http").IncomingMessage, response: import("node:http").ServerResponse) {
  const expected = `Basic ${Buffer.from(`x-access-token:${GIT_TOKEN}`).toString("base64")}`;
  if (request.headers.authorization !== expected) { response.writeHead(401, { "www-authenticate": 'Basic realm="git"' }); response.end(); return; }
  const url = new URL(request.url ?? "/", "http://git");
  const backend = spawn("git", ["http-backend"], { env: { ...GIT_ENV, GIT_PROJECT_ROOT: join(root, "repos"), GIT_HTTP_EXPORT_ALL: "1", REQUEST_METHOD: request.method ?? "GET", PATH_INFO: url.pathname, QUERY_STRING: url.search.slice(1), CONTENT_TYPE: request.headers["content-type"] ?? "", CONTENT_LENGTH: request.headers["content-length"] ?? "", REMOTE_USER: "x-access-token", GIT_HTTP_MAX_REQUEST_BUFFER: "100M" } });
  request.pipe(backend.stdin);
  backend.stdin.on("error", () => undefined);
  parseCgi(backend.stdout, response);
}

function parseCgi(stream: NodeJS.ReadableStream, response: import("node:http").ServerResponse) {
  let buffer = Buffer.alloc(0);
  let headersDone = false;
  stream.on("data", (chunk: Buffer) => {
    if (headersDone) { response.write(chunk); return; }
    buffer = Buffer.concat([buffer, chunk]);
    const end = buffer.indexOf("\r\n\r\n");
    if (end < 0) return;
    const head = buffer.subarray(0, end).toString("utf8").split("\r\n");
    const status = head.find((line) => line.toLowerCase().startsWith("status:"));
    response.statusCode = status ? Number(status.split(" ")[1]) : 200;
    for (const line of head.filter((item) => !item.toLowerCase().startsWith("status:"))) { const [name, ...value] = line.split(":"); response.setHeader(name!, value.join(":").trim()); }
    headersDone = true;
    response.write(buffer.subarray(end + 4));
  });
  stream.on("end", () => response.end());
}
