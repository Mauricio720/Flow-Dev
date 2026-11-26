import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { createGitRepository } from "./fixtures/gitRepository";
import { BUTTON_TEXT_QUESTION, ROUTE_SWITCH_CLOSING, ROUTE_SWITCH_EXPLANATION, ROUTE_SWITCH_FENCE, ROUTE_SWITCH_OPENING, ROUTE_SWITCH_REASONS, ROUTE_SWITCH_SCRIPT, ROUTE_SWITCH_SUMMARY, writeSessionScript } from "./fixtures/sessionScript";

const START = { name: "Iniciar sessão" };
const WITHIN_TEN_SECONDS = { timeout: 10_000 };
const SWITCH_CARD = { name: "Proposta de troca de rota" };
const CONFIRMATION_MESSAGE = /^\/flow-dev:direct-executor A troca para execução direta foi confirmada\./;

async function linkClone(page: Page, projectId: string, path: string) {
  await page.goto(`/projects/${projectId}/settings`);
  await page.getByLabel("Pasta do clone").fill(path);
  await page.getByRole("button", { name: "Salvar pasta" }).click();
  await expect(page.getByText(/^Verificada em /)).toBeVisible();
}

async function startRouteSession(page: Page, work: { projectId: string; taskId: string }) {
  await page.goto(`/projects/${work.projectId}/work/${work.taskId}`);
  await page.getByRole("button", START).click();
  await page.getByRole("dialog", START).getByRole("button", START).click();
  await expect(page.getByText(ROUTE_SWITCH_OPENING)).toBeVisible(WITHIN_TEN_SECONDS);
}

async function answerQuestion(page: Page) {
  await page.getByRole("group", { name: BUTTON_TEXT_QUESTION }).getByRole("radio", { name: /Entrar/ }).check();
  await page.getByRole("button", { name: "Enviar respostas" }).click();
}

async function expectPendingCard(page: Page) {
  const card = page.getByRole("region", SWITCH_CARD);
  await expect(card).toBeVisible(WITHIN_TEN_SECONDS);
  await expect(card.getByText(ROUTE_SWITCH_SUMMARY)).toBeVisible();
  await expect(card.getByRole("list", { name: "Motivos da troca" }).getByRole("listitem")).toHaveText(ROUTE_SWITCH_REASONS);
  await expect(card.getByRole("button", { name: "Continuar com a spec" })).toBeVisible();
  await expect(page.getByText(ROUTE_SWITCH_EXPLANATION)).toBeVisible();
  await expect(page.getByText(ROUTE_SWITCH_FENCE)).toHaveCount(0);
}

test("V-09a the operator answers the PRD session, confirms the route switch and the same session goes on as direct execution", async ({ page, seed, workSeed, signInAs }) => {
  const operator = await seed.operator();
  const project = await seed.project({ label: "Troca", assignedTo: [operator] });
  const clone = await createGitRepository(project.repository);
  const work = await workSeed.approvedWork(project, operator, { route: "prd" });
  await writeSessionScript(clone.path, ROUTE_SWITCH_SCRIPT);
  await signInAs(page, operator);
  await linkClone(page, project.id, clone.path);
  await startRouteSession(page, { projectId: project.id, taskId: work.taskId });
  await answerQuestion(page);
  await expectPendingCard(page);
  await page.getByRole("region", SWITCH_CARD).getByRole("button", { name: "Trocar para execução direta" }).click();
  await expect(page.getByRole("region", SWITCH_CARD).getByText(`Troca confirmada por ${operator.login}`)).toBeVisible(WITHIN_TEN_SECONDS);
  await expect(page.getByText(CONFIRMATION_MESSAGE)).toBeVisible(WITHIN_TEN_SECONDS);
  await expect(page.getByText(ROUTE_SWITCH_CLOSING, { exact: true })).toBeVisible(WITHIN_TEN_SECONDS);
  await page.goto(`/projects/${project.id}/work`);
  await expect(page.getByRole("listitem").filter({ hasText: `#${work.issueNumber}` }).getByText("Execução direta", { exact: true })).toBeVisible();
  await clone.cleanup();
});
