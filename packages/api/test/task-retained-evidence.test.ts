import { afterEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import type { IssueContextRequest } from "../src/application/github/scopedContextGateway";
import { IssueContextController } from "../src/controllers/issueContextController";
import { DrizzleIssueContextDao } from "../src/infra/database/dao/tasks/drizzleIssueContextDao";
import { DrizzleWorkerOperationDao } from "../src/infra/database/dao/tasks/drizzleTaskOperationDao";
import { taskDraftRevisions } from "../src/infra/database/schema";
import { closeTaskFixture, draft, taskFixture } from "./task-api-support";

afterEach(closeTaskFixture);

const commitSha = "a".repeat(40);
const LONG_EXCERPT = "linha do arquivo ".repeat(400);
type Setup = Awaited<ReturnType<typeof taskFixture>>;
type Claim = NonNullable<Awaited<ReturnType<DrizzleWorkerOperationDao["claim"]>>>;

const SHORT_EXCERPT = "linha do arquivo";
const EVIDENCE_BEYOND_FORMER_WINDOW = 101;
type Retrieval = { evidenceCount: number; excerpt: string };
const SINGLE_FILE_READ: Retrieval = { evidenceCount: 1, excerpt: LONG_EXCERPT };

function fileGateway(retrieval: Retrieval) {
  const execute = vi.fn(async (input: { request: IssueContextRequest }) => {
    const path = input.request.tool === "readProjectFile" ? input.request.path : "";
    const evidence = Array.from({ length: retrieval.evidenceCount }, () => ({ type: "project-file" as const, path, commitSha, fromLine: 1, toLine: 20, issueId: null, issueNumber: null, url: null, sourceHash: "b".repeat(64), excerpt: retrieval.excerpt }));
    return { status: "done" as const, data: { path }, evidence };
  });
  return { pinCommit: vi.fn(async () => commitSha), execute };
}

function readFile(setup: Setup, claim: Claim, path: string, retrieval = SINGLE_FILE_READ) {
  const context = new IssueContextController(new DrizzleIssueContextDao(setup.database), setup.repositoryAccess, fileGateway(retrieval));
  return context.handle({ executionId: claim.executionId, toolCallId: `read-${path}`, request: { tool: "readProjectFile", path, fromLine: 1, toLine: 20 } }, claim.contextCapability) as Promise<{ toolCallId: string; status: "done"; evidenceIds: string[]; durationMs: number }>;
}

describe("retained evidence in the generation input", () => {
  it("sends no retained evidence on a first generation even after an earlier attempt read files", async () => {
    const setup = await taskFixture();
    await setup.caller.start({ projectId: setup.project.id, requestKey: crypto.randomUUID(), message: "Padronizar o frontend" });
    const worker = new DrizzleWorkerOperationDao(setup.database);
    const claim = await worker.claim("worker-1");
    await readFile(setup, claim!, "src/cart.ts");
    await expect(worker.generationInput(claim!)).resolves.toMatchObject({ baseRevisionId: null, retainedEvidence: [] });
  });

  it("retains only evidence bound to the base revision, as metadata without excerpts", async () => {
    const setup = await taskFixture();
    const accepted = await setup.caller.start({ projectId: setup.project.id, requestKey: crypto.randomUUID(), message: "Padronizar o frontend" });
    const worker = new DrizzleWorkerOperationDao(setup.database);
    const first = await worker.claim("worker-1");
    const cited = await readFile(setup, first!, "src/cart.ts");
    const unused = await readFile(setup, first!, "src/unused.ts");
    const citedDraft = { ...draft, relevantContext: [{ statement: "O carrinho calcula o total", source: { type: "project-file" as const, path: "src/cart.ts", line: 5, repository: null, issueNumber: null, url: null } }] };
    await worker.completeGeneration(first!, { protocolVersion: 1, operationId: accepted.operationId, executionId: first!.executionId, result: { status: "draft_ready", draft: citedDraft }, activity: [cited, unused] });
    const task = await setup.taskDao.findScoped(setup.project.id, accepted.taskId);
    await setup.caller.send({ projectId: setup.project.id, taskId: accepted.taskId, requestKey: crypto.randomUUID(), expectedVersion: task!.version, message: "Detalhar o objetivo" });
    const refinement = await worker.claim("worker-1");
    const input = await worker.generationInput(refinement!);
    expect(input.retainedEvidence).toEqual([{ id: cited.evidenceIds[0], type: "project-file", path: "src/cart.ts", commitSha, fromLine: 1, toLine: 20, issueId: null, issueNumber: null, url: null }]);
    expect(JSON.stringify(input)).not.toContain(LONG_EXCERPT);
  });

  it("keeps a source bound to the base revision after the refinement retrieves more than a hundred newer evidence rows", async () => {
    const setup = await taskFixture();
    const accepted = await setup.caller.start({ projectId: setup.project.id, requestKey: crypto.randomUUID(), message: "Padronizar o frontend" });
    const worker = new DrizzleWorkerOperationDao(setup.database);
    const first = await worker.claim("worker-1");
    const cited = await readFile(setup, first!, "src/cart.ts");
    const citedDraft = { ...draft, relevantContext: [{ statement: "O carrinho calcula o total", source: { type: "project-file" as const, path: "src/cart.ts", line: 5, repository: null, issueNumber: null, url: null } }] };
    await worker.completeGeneration(first!, { protocolVersion: 1, operationId: accepted.operationId, executionId: first!.executionId, result: { status: "draft_ready", draft: citedDraft }, activity: [cited] });
    const task = await setup.taskDao.findScoped(setup.project.id, accepted.taskId);
    const sent = await setup.caller.send({ projectId: setup.project.id, taskId: accepted.taskId, requestKey: crypto.randomUUID(), expectedVersion: task!.version, message: "Detalhar o objetivo" });
    const refinement = await worker.claim("worker-1");
    const newer = await readFile(setup, refinement!, "src/payment.ts", { evidenceCount: EVIDENCE_BEYOND_FORMER_WINDOW, excerpt: SHORT_EXCERPT });
    await expect(worker.completeGeneration(refinement!, { protocolVersion: 1, operationId: sent.operationId, executionId: refinement!.executionId, result: { status: "draft_ready", draft: { ...citedDraft, objective: "Recalcular o total a cada alteração" } }, activity: [newer] })).resolves.toBeUndefined();
    const [revision] = await setup.database.select({ evidenceBindings: taskDraftRevisions.evidenceBindings }).from(taskDraftRevisions).where(eq(taskDraftRevisions.operationId, sent.operationId));
    expect(revision?.evidenceBindings).toMatchObject([{ evidenceId: cited.evidenceIds[0], fieldPath: "relevantContext.0.statement", verification: "historical" }]);
  });

  it("keeps an unchanged retained claim that moved to another position and rejects a reworded one", async () => {
    const setup = await taskFixture();
    const accepted = await setup.caller.start({ projectId: setup.project.id, requestKey: crypto.randomUUID(), message: "Padronizar o frontend" });
    const worker = new DrizzleWorkerOperationDao(setup.database);
    const first = await worker.claim("worker-1");
    const cited = await readFile(setup, first!, "src/cart.ts");
    const retainedContext = { statement: "O carrinho calcula o total", source: { type: "project-file" as const, path: "src/cart.ts", line: 5, repository: null, issueNumber: null, url: null } };
    await worker.completeGeneration(first!, { protocolVersion: 1, operationId: accepted.operationId, executionId: first!.executionId, result: { status: "draft_ready", draft: { ...draft, relevantContext: [retainedContext] } }, activity: [cited] });
    const task = await setup.taskDao.findScoped(setup.project.id, accepted.taskId);
    const sent = await setup.caller.send({ projectId: setup.project.id, taskId: accepted.taskId, requestKey: crypto.randomUUID(), expectedVersion: task!.version, message: "Detalhar o objetivo" });
    const refinement = await worker.claim("worker-1");
    const newer = await readFile(setup, refinement!, "src/payment.ts");
    const newContext = { statement: "O pagamento usa o total", source: { ...retainedContext.source, path: "src/payment.ts" } };
    const envelope = (relevantContext: typeof retainedContext[]) => ({ protocolVersion: 1 as const, operationId: sent.operationId, executionId: refinement!.executionId, result: { status: "draft_ready" as const, draft: { ...draft, relevantContext } }, activity: [newer] });
    await expect(worker.completeGeneration(refinement!, envelope([newContext, { ...retainedContext, statement: "O carrinho recalcula o total" }]))).rejects.toMatchObject({ reason: "invalid_agent_source" });
    await expect(worker.completeGeneration(refinement!, envelope([newContext, retainedContext]))).resolves.toBeUndefined();
    const [revision] = await setup.database.select({ evidenceBindings: taskDraftRevisions.evidenceBindings }).from(taskDraftRevisions).where(eq(taskDraftRevisions.operationId, sent.operationId));
    expect(revision?.evidenceBindings).toMatchObject([{ fieldPath: "relevantContext.0.statement", verification: "retrieved" }, { evidenceId: cited.evidenceIds[0], fieldPath: "relevantContext.1.statement", verification: "historical" }]);
  });
});
