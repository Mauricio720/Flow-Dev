import type { Locator, Page } from "@playwright/test";
import { expect, test } from "./fixtures/compozy";
import type { ProjectSeed, SeededUser } from "./fixtures/seed";

const EXECUTION_TAB = "Execução";
const START_BUTTON = "Executar no CompozyOS";
const RUNNING_LABEL = "Em execução";
const STATUS_TIMEOUT = 30_000;
const REVIEW_SUMMARY = "A revisão pediu ajustes antes de concluir.";
const PULL_REQUEST_URL = "https://github.com/octocat/Hello-World/pull/1";
type SignInAs = (page: Page, user: SeededUser) => Promise<void>;

async function openExecution(page: Page, seed: ProjectSeed, signInAs: SignInAs) {
  const operator = await seed.user();
  const task = await seed.directExecutionTask(operator);
  await signInAs(page, operator);
  await page.goto(`/projects/${task.project.id}/work/${task.taskId}`);
  await page.getByRole("tab", { name: EXECUTION_TAB }).click();
  return page.getByRole("region", { name: EXECUTION_TAB });
}

async function startExecution(page: Page, region: Locator, label = START_BUTTON) {
  page.once("dialog", (dialog) => dialog.accept());
  await region.getByRole("button", { name: label }).click();
  await expect(region.getByText(RUNNING_LABEL, { exact: true })).toBeVisible();
}

test("E2E-002 a direct execution shows a rejected review before the approved pull request", async ({ page, seed, signInAs, fakeCompozy }) => {
  const region = await openExecution(page, seed, signInAs);
  await startExecution(page, region);
  fakeCompozy.advanceToRejected();
  await expect(region.getByText("Revisão pediu ajustes")).toBeVisible({ timeout: STATUS_TIMEOUT });
  await expect(region.getByText(REVIEW_SUMMARY)).toBeVisible();
  fakeCompozy.advanceToCompleted();
  await expect(region.getByRole("link", { name: "Abrir pull request" })).toHaveAttribute("href", PULL_REQUEST_URL, { timeout: STATUS_TIMEOUT });
});

test("E2E-004 an operator confirms cancellation and can run the task again", async ({ page, seed, signInAs }) => {
  const region = await openExecution(page, seed, signInAs);
  await startExecution(page, region);
  page.once("dialog", (dialog) => dialog.accept());
  await region.getByRole("button", { name: "Cancelar execução" }).click();
  await expect(region.getByText("Cancelada", { exact: true })).toBeVisible({ timeout: STATUS_TIMEOUT });
  await expect(region.getByRole("button", { name: "Executar novamente" })).toBeVisible();
});

test("E2E-005 an unavailable daemon can be retried after it returns", async ({ page, seed, signInAs, fakeCompozy }) => {
  fakeCompozy.setUnavailable();
  const region = await openExecution(page, seed, signInAs);
  page.once("dialog", (dialog) => dialog.accept());
  await region.getByRole("button", { name: START_BUTTON }).click();
  await expect(region.getByText("CompozyOS indisponível", { exact: true })).toBeVisible();
  await expect(region.getByText("Nada foi iniciado.")).toBeVisible();
  fakeCompozy.restore();
  await startExecution(page, region, "Tentar novamente");
});
