import { expect, test } from "./fixtures";

const CLAUDE_LOGIN_COMMAND = /^CLAUDE_CONFIG_DIR='\/.+\/flow-dev\/agent-accounts\/[0-9a-f-]{36}' claude auth login$/;

test("V-12a a person registers, verifies and removes an AI account from the shell header", async ({ page, seed, signInAs }) => {
  const person = await seed.user();
  const project = await seed.project({ label: "Contas", assignedTo: [person] });
  await signInAs(page, person);
  await page.goto(`/projects/${project.id}`);
  await page.getByRole("link", { name: "Contas de IA" }).click();
  await expect(page).toHaveURL(/\/settings\/ai-accounts$/);
  const form = page.getByRole("form", { name: "Cadastrar conta" });
  await form.getByLabel("Provedor").selectOption({ label: "Claude Code" });
  await form.getByLabel("Nome da conta").fill("Pessoal");
  await form.getByRole("button", { name: "Cadastrar conta" }).click();
  const row = page.getByRole("listitem", { name: "Pessoal" });
  await expect(row.getByText("Aguardando login")).toBeVisible();
  await expect(row.getByText(CLAUDE_LOGIN_COMMAND)).toBeVisible();
  await row.getByRole("button", { name: "Verificar login" }).click();
  await expect(row.getByText("Logada")).toBeVisible();
  await row.getByRole("button", { name: "Remover", exact: true }).click();
  await row.getByRole("button", { name: "Remover conta" }).click();
  await expect(page.getByRole("listitem", { name: "Pessoal" })).toHaveCount(0);
  await expect(page.getByText("Nenhuma conta cadastrada ainda.", { exact: false })).toBeVisible();
});
