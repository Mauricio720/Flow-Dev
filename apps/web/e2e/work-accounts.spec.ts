import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { createGitRepository } from "./fixtures/gitRepository";
import { WORKTREE_SCRIPT, WORKTREE_SESSION_TEXT, writeSessionScript } from "./fixtures/sessionScript";

const START = { name: "Iniciar sessão" };
const WITHIN_TEN_SECONDS = { timeout: 10_000 };
const CLAUDE_ACCOUNT = { name: "Conta do Claude Code" };

async function linkClone(page: Page, projectId: string, path: string) {
  await page.goto(`/projects/${projectId}/settings`);
  await page.getByLabel("Pasta do clone").fill(path);
  await page.getByRole("button", { name: "Salvar pasta" }).click();
  await expect(page.getByText(/^Verificada em /)).toBeVisible();
}

test("V-12b the operator chooses the Trabalho account and the session opens and is listed in it", async ({ page, seed, workSeed, signInAs }) => {
  const operator = await seed.operator();
  const project = await seed.project({ label: "Contas", assignedTo: [operator] });
  await seed.agentAccount(operator, { provider: "claude", label: "Pessoal" });
  await seed.agentAccount(operator, { provider: "claude", label: "Trabalho" });
  const clone = await createGitRepository(project.repository);
  const work = await workSeed.approvedWork(project, operator);
  await writeSessionScript(clone.path, WORKTREE_SCRIPT);
  await signInAs(page, operator);
  await linkClone(page, project.id, clone.path);
  await page.goto(`/projects/${project.id}/work/${work.taskId}`);
  const select = page.getByRole("combobox", CLAUDE_ACCOUNT);
  await select.selectOption({ label: "Trabalho · Logada" });
  await expect(select.locator("option:checked")).toHaveText("Trabalho · Logada");
  await select.focus();
  await page.keyboard.press("ArrowUp");
  await expect(select.locator("option:checked")).toHaveText("Pessoal · Logada");
  await select.selectOption({ label: "Trabalho · Logada" });
  await expect(select.locator("option:checked")).toHaveText("Trabalho · Logada");
  await page.getByRole("button", START).click();
  const dialog = page.getByRole("dialog", START);
  await expect(dialog.getByText("Conta: Trabalho")).toBeVisible();
  await dialog.getByRole("button", START).click();
  await expect(page.getByText(WORKTREE_SESSION_TEXT)).toBeVisible(WITHIN_TEN_SECONDS);
  await page.getByRole("tab", { name: /^Execução/ }).click();
  await expect(page.getByText("Conta: Trabalho")).toBeVisible();
  await clone.cleanup();
});
