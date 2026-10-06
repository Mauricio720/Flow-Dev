import { expect, test } from "./fixtures";

test("E2E-001 a member sees only the assigned project and finds it by search", async ({ page, seed, signInAs }) => {
  const member = await seed.user();
  const assigned = await seed.project({ label: "Alfa", assignedTo: [member] });
  const hidden = await seed.project({ label: "Oculto" });
  await signInAs(page, member);
  await page.goto("/");
  await expect(page).toHaveURL(/\/projects$/);
  const entry = page.getByRole("link", { name: `${assigned.name} ${assigned.repository}` });
  await expect(entry).toBeVisible();
  await expect(page.getByRole("list", { name: "Projetos disponíveis" }).getByRole("link")).toHaveCount(1);
  await expect(page.getByText(hidden.name)).toHaveCount(0);
  await page.getByRole("searchbox", { name: "Buscar por projeto ou repositório" }).fill(assigned.repository);
  await expect(entry).toBeVisible();
  await page.getByRole("searchbox", { name: "Buscar por projeto ou repositório" }).fill(hidden.name);
  await expect(page.getByRole("heading", { name: "Nenhum projeto encontrado" })).toBeVisible();
});

test("E2E-001 a developer without assignments sees guidance and no private names", async ({ page, seed, signInAs }) => {
  const unassigned = await seed.user();
  const hidden = await seed.project({ label: "Privado" });
  await signInAs(page, unassigned);
  await page.goto("/projects");
  await expect(page.getByRole("heading", { name: "Seu espaço ainda está vazio" })).toBeVisible();
  await expect(page.getByText(hidden.name)).toHaveCount(0);
  await expect(page.getByText(hidden.repository)).toHaveCount(0);
});

test("E2E-001 an administrator finds a project nobody assigned to them", async ({ page, seed, signInAs }) => {
  const admin = await seed.user({ admin: true });
  const project = await seed.project({ label: "Todos" });
  await signInAs(page, admin);
  await page.goto("/projects");
  await page.getByRole("searchbox", { name: "Buscar por projeto ou repositório" }).fill(project.name);
  await expect(page.getByRole("link", { name: `${project.name} ${project.repository}` })).toBeVisible();
  await expect(page.getByRole("link", { name: "Acessos" })).toBeVisible();
});
