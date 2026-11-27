import { dirname, join } from "node:path";
import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { commitBase, createGitRepository } from "./fixtures/gitRepository";
import { WORKTREE_SCRIPT, WORKTREE_SESSION_TEXT, writeSessionScript } from "./fixtures/sessionScript";

const START = { name: "Iniciar sessão" };
const CHOICE_SECTION = { name: "Onde trabalhar" };
const WITHIN_TEN_SECONDS = { timeout: 10_000 };
const CREATION_NOTE = /^O worktree será criado agora, na branch nova flow\/issue-42, a partir da branch \S+ da pasta configurada\.$/;

async function linkClone(page: Page, projectId: string, path: string) {
  await page.goto(`/projects/${projectId}/settings`);
  await page.getByLabel("Pasta do clone").fill(path);
  await page.getByRole("button", { name: "Salvar pasta" }).click();
  await expect(page.getByText(/^Verificada em /)).toBeVisible();
}

async function chooseWorktree(page: Page) {
  const section = page.getByRole("region", CHOICE_SECTION);
  await expect(page.getByRole("button", START)).toBeDisabled();
  await section.getByRole("radio", { name: /Com worktree/ }).check();
  await section.getByRole("button", { name: "Salvar escolha" }).click();
  await expect(page.getByRole("button", START)).toBeEnabled();
}

test("V-W22 the operator chooses a worktree after the approval and the first session runs inside it", async ({ page, seed, workSeed, signInAs }) => {
  const operator = await seed.operator();
  const project = await seed.project({ label: "Worktree", assignedTo: [operator] });
  const clone = await createGitRepository(project.repository);
  commitBase(clone.path);
  const worktree = join(dirname(clone.path), "shop-worktrees", "issue-42");
  const work = await workSeed.approvedWork(project, operator, { worktree: null });
  await writeSessionScript(worktree, WORKTREE_SCRIPT);
  await signInAs(page, operator);
  await linkClone(page, project.id, clone.path);
  await page.goto(`/projects/${project.id}/work/${work.taskId}`);
  await chooseWorktree(page);
  await page.getByRole("button", START).click();
  const dialog = page.getByRole("dialog", START);
  await expect(dialog.getByText(worktree, { exact: true })).toBeVisible();
  await expect(dialog.getByText(CREATION_NOTE)).toBeVisible();
  await dialog.getByRole("button", START).click();
  await expect(page.getByText(WORKTREE_SESSION_TEXT)).toBeVisible(WITHIN_TEN_SECONDS);
  await page.getByRole("tab", { name: /^Planejamento/ }).click();
  const section = page.getByRole("region", CHOICE_SECTION);
  await expect(section.getByText("A escolha fica fixa depois que a primeira sessão abre.")).toBeVisible();
  await expect(section.getByRole("radio")).toHaveCount(0);
  await clone.cleanup();
});
