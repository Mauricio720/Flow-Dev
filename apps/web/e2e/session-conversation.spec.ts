import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { createGitRepository } from "./fixtures/gitRepository";
import { CHECKS_QUESTION, JOURNEY_SCRIPT, VISIBILITY_QUESTION, writeSessionScript } from "./fixtures/sessionScript";

const CONTROLLED_PROVIDERS_REASON = "Requer GitHub e quadro de projeto controlados, com acesso pessoal ao repositório: a tela do trabalho só libera a operadora com a verificação do GitHub.";
const START = { name: "Iniciar sessão" };
const WITHIN_TEN_SECONDS = { timeout: 10_000 };

async function linkClone(page: Page, projectId: string, path: string) {
  await page.goto(`/projects/${projectId}/settings`);
  await page.getByLabel("Pasta do clone").fill(path);
  await page.getByRole("button", { name: "Salvar pasta" }).click();
  await expect(page.getByText(/^Verificada em /)).toBeVisible();
}

async function startSession(page: Page, work: { projectId: string; taskId: string }) {
  await page.goto(`/projects/${work.projectId}/work/${work.taskId}`);
  await page.getByRole("button", START).click();
  const dialog = page.getByRole("dialog", { name: "Iniciar a sessão do Claude" });
  await dialog.getByRole("radio", { name: /Aceitar edições, perguntar comandos/ }).check();
  await dialog.getByRole("button", START).click();
  await expect(page.getByText("Vou começar pela análise.")).toBeVisible(WITHIN_TEN_SECONDS);
}

async function answerQuestions(page: Page) {
  const visibility = page.getByRole("group", { name: VISIBILITY_QUESTION });
  await visibility.getByRole("radio", { name: /Só membros/ }).check();
  const checks = page.getByRole("group", { name: CHECKS_QUESTION });
  await checks.getByRole("checkbox", { name: /lint/ }).check();
  await checks.getByRole("checkbox", { name: /test/ }).check();
  await page.getByRole("button", { name: "Enviar respostas" }).click();
}

test.fixme("V-30a the operator starts, answers the questions, approves a command, sends a message and ends the session", async ({ page, seed, workSeed, signInAs }) => {
  test.info().annotations.push({ type: "feature-gate", description: CONTROLLED_PROVIDERS_REASON });
  const operator = await seed.user();
  const project = await seed.project({ label: "Sessão", assignedTo: [operator] });
  const clone = await createGitRepository(project.repository);
  const work = await workSeed.approvedWork(project, operator);
  await writeSessionScript(clone.path, JOURNEY_SCRIPT);
  await signInAs(page, operator);
  await linkClone(page, project.id, clone.path);
  await startSession(page, { projectId: project.id, taskId: work.taskId });
  await answerQuestions(page);
  await expect(page.getByText("Rodar comando:")).toBeVisible(WITHIN_TEN_SECONDS);
  await expect(page.getByText("pnpm test", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Permitir", exact: true }).click();
  await expect(page.getByText("Aguardando você").first()).toBeVisible(WITHIN_TEN_SECONDS);
  await page.getByRole("textbox", { name: "Mensagem para o Claude" }).fill("Rode também o lint");
  await page.keyboard.press("Control+Enter");
  await expect(page.getByText("Lint rodado.")).toBeVisible(WITHIN_TEN_SECONDS);
  await page.getByRole("button", { name: "Encerrar", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Encerrar sessão" }).click();
  await expect(page.getByText("Encerrada").first()).toBeVisible(WITHIN_TEN_SECONDS);
  await expect(page.getByRole("textbox", { name: "Mensagem para o Claude" })).toHaveCount(0);
  await clone.cleanup();
});

test.fixme("V-30b another person with access to the project sees the conversation and the answered questions without field or buttons", async ({ page, browser, seed, workSeed, signInAs }) => {
  test.info().annotations.push({ type: "feature-gate", description: CONTROLLED_PROVIDERS_REASON });
  const operator = await seed.user();
  const colleague = await seed.user();
  const project = await seed.project({ label: "Leitura", assignedTo: [operator, colleague] });
  const clone = await createGitRepository(project.repository);
  const work = await workSeed.approvedWork(project, operator);
  await writeSessionScript(clone.path, JOURNEY_SCRIPT);
  await signInAs(page, operator);
  await linkClone(page, project.id, clone.path);
  await startSession(page, { projectId: project.id, taskId: work.taskId });
  await answerQuestions(page);
  await expect(page.getByText("Rodar comando:")).toBeVisible(WITHIN_TEN_SECONDS);
  const other = await (await browser.newContext()).newPage();
  await signInAs(other, colleague);
  await other.goto(`/projects/${project.id}/work/${work.taskId}`);
  await expect(other.getByText("Vou começar pela análise.")).toBeVisible(WITHIN_TEN_SECONDS);
  await expect(other.getByText("Só quem abriu a sessão, enquanto for a operadora, pode responder.")).toBeVisible();
  await expect(other.getByRole("textbox")).toHaveCount(0);
  await expect(other.getByRole("button", { name: "Permitir", exact: true })).toHaveCount(0);
  await expect(other.getByRole("button", { name: "Interromper" })).toHaveCount(0);
  await other.context().close();
  await clone.cleanup();
});
