import { expect, test } from "./fixtures/compozy";
import { FAKE_WORKSPACE_ID } from "./fixtures/compozyDaemon";

test("E2E-001 an administrator binds the local checkout and a member only reads the binding", async ({ page, browser, seed, signInAs, checkoutFor }) => {
  const admin = await seed.user({ admin: true });
  const member = await seed.user();
  const project = await seed.project({ label: "Execução", assignedTo: [member] });
  const checkout = await checkoutFor(project.repository);
  await signInAs(page, admin);
  await page.goto(`/projects/${project.id}/settings`);
  const section = page.getByRole("region", { name: "Execução no CompozyOS" });
  await section.getByLabel("Pasta local do repositório").fill(checkout.path);
  await section.getByRole("button", { name: "Verificar e salvar" }).click();
  await expect(section.getByText("Pronto", { exact: true })).toBeVisible();
  await expect(section.getByText(checkout.defaultBranch, { exact: true })).toBeVisible();
  await expect(section.getByText(FAKE_WORKSPACE_ID)).toBeVisible();
  await expect(section.getByText("CompozyOS 0.7.3 acessível")).toBeVisible();
  const reader = await (await browser.newContext()).newPage();
  await signInAs(reader, member);
  await reader.goto(`/projects/${project.id}/settings`);
  const readOnly = reader.getByRole("region", { name: "Execução no CompozyOS" });
  await expect(readOnly.getByText("Pronto", { exact: true })).toBeVisible();
  await expect(readOnly.getByText(checkout.path)).toBeVisible();
  await expect(readOnly.getByRole("textbox")).toHaveCount(0);
  await expect(readOnly.getByRole("button")).toHaveCount(0);
  await reader.context().close();
});
