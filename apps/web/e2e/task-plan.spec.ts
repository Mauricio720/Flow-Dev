import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { createGitRepository } from "./fixtures/gitRepository";
import { writeSessionScript } from "./fixtures/sessionScript";
import { EXECUTION_SCRIPT, GENERATION_SCRIPT, SPEC_PATH } from "./fixtures/taskPlanScripts";

const CONTROLLED_PROVIDERS_REASON = "Requer GitHub e quadro de projeto controlados, com acesso pessoal ao repositório: a tela do trabalho só libera a operadora com a verificação do GitHub.";
const START_SESSION = { name: "Iniciar sessão" };
const WITHIN_TEN_SECONDS = { timeout: 10_000 };

async function linkClone(page: Page, projectId: string, path: string) {
  await page.goto(`/projects/${projectId}/settings`);
  await page.getByLabel("Pasta do clone").fill(path);
  await page.getByRole("button", { name: "Salvar pasta" }).click();
  await expect(page.getByText(/^Verificada em /)).toBeVisible();
}

async function generateTasks(page: Page) {
  await page.getByRole("tab", { name: /^Tarefas/ }).click();
  await expect(page.getByText("Nenhuma tarefa gerada ainda.")).toBeVisible();
  await page.getByRole("button", { name: "Gerar tarefas" }).click();
  const dialog = page.getByRole("dialog", { name: "Gerar as tarefas da spec" });
  await expect(dialog.getByLabel("Modelo")).toHaveValue("opus");
  await expect(dialog.getByLabel("Esforço")).toHaveValue("max");
  await dialog.getByRole("button", START_SESSION).click();
  await expect(page.getByRole("list", { name: "Tarefas" }).getByRole("listitem")).toHaveCount(2, WITHIN_TEN_SECONDS);
}

async function planOneSessionPerTask(page: Page) {
  await page.getByRole("button", { name: "Uma sessão por tarefa" }).click();
  await page.getByRole("region", { name: "Plano de execução" }).getByLabel("Modelo").nth(1).selectOption("sonnet");
  await page.getByRole("region", { name: "Plano de execução" }).getByLabel("Esforço").nth(1).selectOption("high");
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Bloqueada: aguardando 01 (Pendente)" })).toBeVisible();
}

test.fixme("V-41 the operator generates the tasks, plans one session per task, runs the first and the second is released", async ({ page, seed, workSeed, signInAs }) => {
  test.info().annotations.push({ type: "feature-gate", description: CONTROLLED_PROVIDERS_REASON });
  const operator = await seed.user();
  const project = await seed.project({ label: "Plano", assignedTo: [operator] });
  const clone = await createGitRepository(project.repository);
  const work = await workSeed.approvedWork(project, operator);
  await workSeed.specArtifact(work.taskId, project.id, SPEC_PATH);
  await signInAs(page, operator);
  await linkClone(page, project.id, clone.path);
  await writeSessionScript(clone.path, GENERATION_SCRIPT);
  await page.goto(`/projects/${project.id}/work/${work.taskId}`);
  await generateTasks(page);
  await planOneSessionPerTask(page);
  await writeSessionScript(clone.path, EXECUTION_SCRIPT);
  await page.getByRole("button", { name: "Iniciar", exact: true }).click();
  await page.getByRole("dialog", { name: "Iniciar a sessão do plano" }).getByRole("button", START_SESSION).click();
  await page.getByRole("tab", { name: /^Tarefas/ }).click();
  await expect(page.getByRole("button", { name: /^01 — Tarefa 01 .* Concluída$/ })).toBeVisible(WITHIN_TEN_SECONDS);
  await expect(page.getByText("Pronta", { exact: true })).toBeVisible(WITHIN_TEN_SECONDS);
  await clone.cleanup();
});
