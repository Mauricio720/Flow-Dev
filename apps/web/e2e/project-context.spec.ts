import { expect, test } from "./fixtures";

test("E2E-002 switching projects keeps the latest one as route and header context", async ({ page, seed, signInAs }) => {
  const member = await seed.user();
  const first = await seed.project({ label: "Primeiro", assignedTo: [member] });
  const second = await seed.project({ label: "Segundo", assignedTo: [member] });
  await signInAs(page, member);
  await page.goto("/projects");
  await page.getByRole("link", { name: `${first.name} ${first.repository}` }).click();
  await expect(page).toHaveURL(new RegExp(`/projects/${first.id}$`));
  await page.getByRole("navigation", { name: "Menus do projeto" }).getByRole("link", { name: "Issues" }).click();
  await expect(page).toHaveURL(new RegExp(`/projects/${first.id}/issues$`));
  await expect(page.getByRole("navigation", { name: "Intenções" })).toBeVisible();
  await expect(page.getByText("simulação", { exact: true })).toHaveCount(0);
  await page.getByRole("link", { name: "Trocar projeto" }).click();
  await page.getByRole("link", { name: `${second.name} ${second.repository}` }).click();
  await expect(page).toHaveURL(new RegExp(`/projects/${second.id}$`));
  await page.reload();
  const active = page.getByRole("group", { name: "Projeto ativo" });
  await expect(active).toContainText(second.name);
  await expect(active).toContainText(second.repository);
  await expect(page.getByText(first.name)).toHaveCount(0);
  await page.goto("/");
  await expect(page).toHaveURL(new RegExp(`/projects/${second.id}$`));
});

test("a direct link to a malformed or unknown project shows the unavailable state", async ({ page, seed, signInAs }) => {
  const member = await seed.user();
  await signInAs(page, member);
  await page.goto("/projects/nao-e-um-id");
  await expect(page.getByRole("heading", { name: "Projeto indisponível" })).toBeVisible();
  await page.goto("/projects/00000000-0000-4000-8000-000000000000/issues");
  await expect(page.getByRole("heading", { name: "Projeto indisponível" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Voltar ao catálogo" })).toBeVisible();
});

test("a visitor following a project menu link signs in first and keeps the destination", async ({ page, seed }) => {
  const project = await seed.project();
  await page.goto(`/projects/${project.id}/issues`);
  await expect(page).toHaveURL(/\/login\?/);
  expect(new URL(page.url()).searchParams.get("next")).toBe(`/projects/${project.id}/issues`);
  await expect(page.getByText(project.name)).toHaveCount(0);
});
