import { expect, test } from "./fixtures";

const CONTROLLED_GITHUB_REASON = "Requer servidor GitHub controlado: consentimento, rename, outage e arquivo ficam no feature-gate.";

test("E2E-006 an assigned member without repository consent sees the missing access and no code data", async ({ page, seed, signInAs }) => {
  const member = await seed.user();
  const project = await seed.project({ assignedTo: [member] });
  await signInAs(page, member);
  await page.goto(`/projects/${project.id}`);
  await expect(page.getByRole("heading", { name: project.name })).toBeVisible();
  await expect(page.getByRole("status")).toHaveText("Autorização do GitHub necessária");
  await expect(page.getByRole("button", { name: "Autorizar repositórios no GitHub" })).toBeVisible();
  await expect(page.getByText("Branch padrão")).toHaveCount(0);
});

test("E2E-006 a developer without the assignment gets an unavailable project", async ({ page, seed, signInAs }) => {
  const outsider = await seed.user();
  const project = await seed.project();
  await signInAs(page, outsider);
  await page.goto(`/projects/${project.id}`);
  await expect(page.getByRole("heading", { name: "Projeto indisponível" })).toBeVisible();
  await expect(page.getByText(project.name)).toHaveCount(0);
  await expect(page.getByText(project.repository)).toHaveCount(0);
});

test("an open project tab stops serving the workspace after the assignment is removed", async ({ page, seed, signInAs }) => {
  const member = await seed.user();
  const project = await seed.project({ assignedTo: [member] });
  await signInAs(page, member);
  await page.goto(`/projects/${project.id}/issues`);
  await expect(page.getByRole("group", { name: "Projeto ativo" })).toContainText(project.name);
  await expect(page.getByRole("heading", { name: "Autorize a leitura do repositório" })).toBeVisible();
  await expect(page.getByRole("status").filter({ hasText: "Autorização do GitHub necessária" })).toBeVisible();
  await seed.unassign(member, project);
  await page.getByRole("navigation", { name: "Intenções" }).getByRole("button", { name: "Atualizar" }).click();
  await expect(page).toHaveURL(/\/projects\?erro=acesso_revogado$/);
  await expect(page.getByText("Seu acesso a esse projeto mudou")).toBeVisible();
  await expect(page.getByText(project.name)).toHaveCount(0);
});

test.fixme("E2E-006 authorizing the matching GitHub account reveals the repository context", () => {
  test.info().annotations.push({ type: "feature-gate", description: CONTROLLED_GITHUB_REASON });
});

test.fixme("E2E-007 rename, outage, recovery and archive keep the same project", () => {
  test.info().annotations.push({ type: "feature-gate", description: CONTROLLED_GITHUB_REASON });
});
