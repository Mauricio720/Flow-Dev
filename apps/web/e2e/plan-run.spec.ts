import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { createGitRepository } from "./fixtures/gitRepository";
import { ASK_THEN_COMPLETE_01, COMPLETE_02, RUN_QUESTION } from "./fixtures/planRunScripts";
import { writeSessionScript } from "./fixtures/sessionScript";
import { MANIFEST, TASKS_FOLDER, taskFile } from "./fixtures/taskPlanScripts";

const WITHIN_TEN_SECONDS = { timeout: 10_000 };
const TALL_VIEWPORT = { width: 1280, height: 2000 };
const NEXT_SESSION_DEADLINE = { timeout: 15_000 };
const TASK_FILES = [{ path: `${TASKS_FOLDER}/_tasks.md`, content: MANIFEST }, { path: `${TASKS_FOLDER}/task_01.md`, content: taskFile("01", "pending", false) }, { path: `${TASKS_FOLDER}/task_02.md`, content: taskFile("02", "pending", false) }];

async function linkClone(page: Page, projectId: string, path: string) {
  await page.goto(`/projects/${projectId}/settings`);
  await page.getByLabel("Pasta do clone").fill(path);
  await page.getByRole("button", { name: "Salvar pasta" }).click();
  await expect(page.getByText(/^Verificada em /)).toBeVisible();
}

async function buildPlan(page: Page) {
  const plan = page.getByRole("region", { name: "Plano de execução" });
  await plan.getByRole("button", { name: "Nova sessão" }).click();
  await plan.getByRole("button", { name: "Nova sessão" }).click();
  const unassigned = plan.getByRole("region", { name: "Sem sessão" });
  await unassigned.getByRole("listitem").filter({ hasText: "Tarefa 01" }).dragTo(plan.getByRole("listitem", { name: "Sessão 1" }).getByRole("heading"));
  await expect(plan.getByRole("listitem", { name: "Sessão 1" }).getByText("Tarefa 01")).toBeVisible();
  await plan.getByRole("listitem", { name: "Sessão 2" }).getByRole("button", { name: "Adicionar tarefas" }).click();
  const dialog = page.getByRole("dialog", { name: "Tarefas da Sessão 2" });
  await dialog.getByRole("checkbox", { name: /^02 — / }).check();
  await dialog.getByRole("button", { name: "Aplicar" }).click();
  await expect(unassigned).toHaveCount(0);
  await plan.getByRole("button", { name: "Salvar" }).click();
}

async function answerFirstSession(page: Page, swapScript: () => Promise<void>) {
  await page.getByRole("listitem", { name: "Sessão 1" }).getByRole("button", { name: "Ver a conversa" }).click();
  const question = page.getByRole("group", { name: RUN_QUESTION });
  await expect(question).toBeVisible(WITHIN_TEN_SECONDS);
  await swapScript();
  await question.getByRole("radio", { name: /Sim/ }).check();
  await page.getByRole("button", { name: "Enviar respostas" }).click();
}

test("V-10 the operator builds two mold sessions, runs the plan and the second session starts by itself", async ({ page, seed, workSeed, signInAs, db }) => {
  const operator = await seed.operator();
  const project = await seed.project({ label: "Execução", assignedTo: [operator] });
  const clone = await createGitRepository(project.repository);
  const work = await workSeed.approvedWork(project, operator);
  await workSeed.taskSet({ taskId: work.taskId, projectId: project.id }, TASK_FILES);
  await page.setViewportSize(TALL_VIEWPORT);
  await signInAs(page, operator);
  await linkClone(page, project.id, clone.path);
  await writeSessionScript(clone.path, ASK_THEN_COMPLETE_01);
  await page.goto(`/projects/${project.id}/work/${work.taskId}`);
  await page.getByRole("tab", { name: /^Tarefas/ }).click();
  await buildPlan(page);
  const run = page.getByRole("region", { name: "Execução do plano" });
  await run.getByRole("button", { name: "Executar o plano" }).click();
  await expect(run.getByRole("status")).toHaveText("Executando · Sessão 1", WITHIN_TEN_SECONDS);
  await answerFirstSession(page, () => writeSessionScript(clone.path, COMPLETE_02));
  await page.getByRole("tab", { name: /^Tarefas/ }).click();
  await expect(run.getByRole("status")).toHaveText("Plano concluído", NEXT_SESSION_DEADLINE);
  const opened = await db`select item.position from task_terminal_sessions session join task_session_plan_items item on item.id = session.plan_item_id where session.task_id = ${work.taskId} order by session.opened_at`;
  expect(opened.map((row) => row.position)).toEqual([1, 2]);
  await clone.cleanup();
});
