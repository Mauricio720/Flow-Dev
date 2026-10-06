import { eq } from "drizzle-orm";
import { taskSpecAttempts, taskSpecDocuments, taskSpecStages, taskSpecInteractions, taskSpecPackages, taskSpecWorkflows } from "../src/infra/database/schema";
import { createHash } from "node:crypto";
import { addPublishedTask } from "./planning-support";
import { permissionTargetDigest } from "../src/application/services/spec/specInteractionRules";
import { specCaller, startInput, type SpecSetup } from "./spec-support";

export const sha256 = (value: string) => createHash("sha256").update(value, "utf8").digest("hex");

export async function startWorkflow(setup: SpecSetup, stage: "prd" | "tech_spec" = "prd") {
  const receipt = await specCaller(setup).start(startInput(setup, { stage }));
  const [workflow] = await setup.database.select().from(taskSpecWorkflows);
  return { receipt, workflowId: workflow!.id, attemptId: receipt.attemptId! };
}

export async function seedReviewPackage(setup: SpecSetup, started: { workflowId: string; attemptId: string }, stage: "prd" | "tech_spec" = "prd") {
  const source = "# Documento\n\nConteúdo";
  await setup.database.update(taskSpecAttempts).set({ state: "completed", finishedAt: new Date() }).where(eq(taskSpecAttempts.id, started.attemptId));
  const [created] = await setup.database.insert(taskSpecPackages).values({ workflowId: started.workflowId, stage, attemptId: started.attemptId, revision: 1, manifestHash: sha256(source), captureState: "review_ready", packageIndex: { schemaVersion: 1, stage } }).returning();
  await setup.database.insert(taskSpecDocuments).values({ packageId: created!.id, path: "_prd.md", role: "prd", sourceText: source, byteCount: Buffer.byteLength(source), sha256: sha256(source), blocks: [{ id: "b1" }, { id: "b2" }, { id: "b3" }] });
  await setup.database.update(taskSpecStages).set({ state: "review", currentPackageId: created!.id }).where(eq(taskSpecStages.workflowId, started.workflowId));
  await setup.database.update(taskSpecWorkflows).set({ state: "review" }).where(eq(taskSpecWorkflows.id, started.workflowId));
  return created!;
}

export async function seedQuestion(setup: SpecSetup, started: { workflowId: string; attemptId: string }) {
  await setup.database.update(taskSpecAttempts).set({ state: "waiting" }).where(eq(taskSpecAttempts.id, started.attemptId));
  await setup.database.update(taskSpecStages).set({ state: "waiting_question" }).where(eq(taskSpecStages.workflowId, started.workflowId));
  await setup.database.update(taskSpecWorkflows).set({ state: "waiting_question" }).where(eq(taskSpecWorkflows.id, started.workflowId));
  const [question] = await setup.database.insert(taskSpecInteractions).values({ workflowId: started.workflowId, attemptId: started.attemptId, runtimeSessionId: "s1", runtimeTurnId: "t1", runtimeInteractionId: "q1", providerRequestId: "p1", kind: "question", description: "Qual prazo?", choices: ["Thirty days", "Ninety days"] }).returning();
  return question!;
}

type InteractionOptions = { kind?: "question" | "permission"; choices?: string[] | null; target?: { tool: string; path?: string; command?: string } | null; status?: string; description?: string; turn?: string; attemptState?: string };

export async function seedInteraction(setup: SpecSetup, started: { workflowId: string; attemptId: string }, options: InteractionOptions = {}) {
  const kind = options.kind ?? "question";
  const target = options.target === undefined && kind === "permission" ? { tool: "write", path: "_prd.md" } : options.target ?? null;
  const state = options.attemptState ?? "waiting";
  await setAttemptState(setup, started, state, options.turn);
  const [row] = await setup.database.insert(taskSpecInteractions).values({ workflowId: started.workflowId, attemptId: started.attemptId, runtimeSessionId: "s1", runtimeTurnId: options.turn ?? "turn-1", runtimeInteractionId: crypto.randomUUID(), providerRequestId: crypto.randomUUID(), kind, description: options.description ?? (kind === "question" ? "Qual prazo?" : "Escrever _prd.md"), choices: kind === "question" ? options.choices === undefined ? ["Thirty days", "Ninety days"] : options.choices : null, target, targetDigest: target ? permissionTargetDigest(target) : null, status: options.status ?? "pending" }).returning();
  return row!;
}

export async function setAttemptState(setup: SpecSetup, started: { workflowId: string; attemptId: string }, state: string, turn = "turn-1") {
  await setup.database.update(taskSpecAttempts).set({ state, runtimeWorkspaceId: "w1", runtimeSessionId: "s1", runtimeTurnId: turn }).where(eq(taskSpecAttempts.id, started.attemptId));
}

export async function seedLoad(setup: SpecSetup, states: string[]): Promise<string[]> {
  const taskIds: string[] = [];
  const [decision] = await setup.database.execute(`SELECT id FROM task_planning_decisions LIMIT 1` as never) as unknown as { id: string }[];
  await setup.database.execute(`ALTER TABLE task_spec_workflows DISABLE TRIGGER task_spec_workflow_insert_guard` as never);
  for (const [index, state] of states.entries()) {
    const taskId = await addPublishedTask(setup);
    taskIds.push(taskId);
    const [publication] = await setup.database.execute(`SELECT id FROM task_publication_attempts WHERE task_id = '${taskId}'` as never) as unknown as { id: string }[];
    const [workflow] = await setup.database.insert(taskSpecWorkflows).values({ taskId, projectId: setup.project.id, authorUserId: setup.ownerId, publicationId: publication!.id, planningDecisionId: decision!.id, selectedRoute: "prd", currentStage: "prd" }).returning();
    await setup.database.insert(taskSpecStages).values({ workflowId: workflow!.id, stage: "prd", state: "queued" });
    await setup.database.insert(taskSpecAttempts).values({ workflowId: workflow!.id, stage: "prd", attemptNumber: 1, kind: "generate", input: {}, inputHash: String(index).padStart(64, "a"), state });
  }
  return taskIds;
}
