import { expect, test } from "./fixtures";

test("E2E-006 an administrator saves the planning agent and a member only reads it", async ({ page, seed, signInAs, browser }) => {
  const admin = await seed.user({ admin: true });
  const member = await seed.user();
  const project = await seed.project({ label: "Agentes", assignedTo: [member] });
  await signInAs(page, admin);
  await page.goto(`/projects/${project.id}/settings`);
  const planning = page.getByRole("form", { name: "Planejamento" });
  const author = page.getByRole("form", { name: "Issue Author" });
  await expect(author.getByLabel("Provedor")).toHaveValue("claude");
  await planning.getByLabel("Provedor").selectOption("codex");
  await planning.getByLabel("Esforço").selectOption("medium");
  await planning.getByRole("button", { name: "Salvar Planejamento" }).click();
  await expect(planning.getByText("Planejamento salvo.")).toBeVisible();
  await page.reload();
  await expect(planning.getByLabel("Provedor")).toHaveValue("codex");
  await expect(planning.getByLabel("Modelo")).toHaveValue("gpt-6.1-sol");
  await expect(planning.getByLabel("Esforço")).toHaveValue("medium");
  await expect(author.getByLabel("Provedor")).toHaveValue("claude");
  const reader = await (await browser.newContext()).newPage();
  await signInAs(reader, member);
  await reader.goto(`/projects/${project.id}/settings`);
  await expect(reader.getByRole("heading", { name: "Agentes" })).toBeVisible();
  await expect(reader.getByText("Codex", { exact: true })).toBeVisible();
  await expect(reader.getByRole("combobox")).toHaveCount(0);
  await expect(reader.getByRole("button", { name: "Salvar Planejamento" })).toHaveCount(0);
  await reader.context().close();
});

const NOT_FOUND = 404;
const RETIRED_CONTEXT_ROUTE = "/api/internal/issue-context";

test("V-10c the retired internal context route answers 404", async ({ request }) => {
  const response = await request.post(RETIRED_CONTEXT_ROUTE, { data: {} });
  expect(response.status()).toBe(NOT_FOUND);
});
