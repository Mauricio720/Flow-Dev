import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import postgres from "postgres";
import { githubIdFromAuthorization } from "./fakeBoard";
import { FakeGithubData, repositoryRest } from "./fakeGithubData";
import { answerGraphql } from "./graphqlRoutes";

const HOST = "127.0.0.1";
const NOT_IMPLEMENTED_STATUS = 501;
const NOT_FOUND_STATUS = 404;
const REPOSITORY_PATH = /^\/repos\/([^/]+)\/([^/]+)$/;
type Reply = { status: number; body: unknown };
const VERBOSE = process.env.E2E_FAKE_GITHUB_LOG === "1";

function send(response: ServerResponse, reply: Reply, description: string) {
  if (VERBOSE) console.error(`[fake-github] ${reply.status} ${description} → ${JSON.stringify(reply.body).slice(0, 300)}`);
  response.writeHead(reply.status, { "content-type": "application/json" });
  response.end(JSON.stringify(reply.body));
}

async function readJson(request: IncomingMessage) {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(chunk as Buffer);
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

function unknownRoute(description: string): Reply {
  console.error(`[fake-github] rota não implementada: ${description}. Acrescente-a em apps/web/e2e/fakeGithub/.`);
  return { status: NOT_IMPLEMENTED_STATUS, body: { message: `fake-github: ${description}` } };
}

function found(body: unknown): Reply {
  return body ? { status: 200, body } : { status: NOT_FOUND_STATUS, body: { message: "Not Found" } };
}

async function route(data: FakeGithubData, request: IncomingMessage): Promise<Reply> {
  const path = new URL(request.url ?? "/", `http://${HOST}`).pathname;
  if (request.method === "POST" && path === "/graphql") {
    const body = await readJson(request);
    const reply = await answerGraphql(data, body);
    return reply ? { status: 200, body: reply } : unknownRoute(`GraphQL ${String(body.query).slice(0, 120)}`);
  }
  if (request.method === "GET" && path === "/user") {
    const githubId = githubIdFromAuthorization(request.headers.authorization);
    return githubId ? found(await data.userByGithubId(githubId)) : { status: 401, body: { message: "Bad credentials" } };
  }
  const repository = request.method === "GET" ? REPOSITORY_PATH.exec(path) : null;
  if (repository) {
    const row = await data.repositoryByPath(decodeURIComponent(repository[1]!), decodeURIComponent(repository[2]!));
    return found(row && repositoryRest(row));
  }
  return unknownRoute(`${request.method} ${path}`);
}

export async function startFakeGithub(databaseUrl: string, port: number) {
  const sql = postgres(databaseUrl, { max: 2, onnotice: () => {} });
  const data = new FakeGithubData(sql);
  const server = createServer((request, response) => {
    const description = `${request.method} ${request.url}`;
    route(data, request).then((reply) => send(response, reply, description), (error: unknown) => send(response, { status: 500, body: { message: String(error) } }, description));
  });
  await new Promise<void>((resolve, reject) => server.once("error", reject).listen(port, HOST, resolve));
  return async () => {
    await new Promise((resolve) => server.close(resolve));
    await sql.end();
  };
}
