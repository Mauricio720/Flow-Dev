import { randomUUID } from "node:crypto";
import { expect, test } from "./fixtures";

const FEATURE_GATE_JOURNEYS = [
  "E2E-001 an administrator publishes an issue and follows the path to assigned work without an implicit claim",
  "E2E-008 an observer reads claimed work and never sees an operating control",
];
const CONTROLLED_PROVIDERS_REASON = "Requer GitHub e quadro de projeto controlados, com acesso pessoal ao repositório: jornada completa do feature-gate.";

test("a visitor following a work link signs in first and keeps the exact destination", async ({ page, seed }) => {
  const project = await seed.project();
  const destination = `/projects/${project.id}/work/${randomUUID()}`;
  await page.goto(destination);
  await expect(page).toHaveURL(/\/login\?/);
  expect(new URL(page.url()).searchParams.get("next")).toBe(destination);
  await expect(page.getByText(project.name)).toHaveCount(0);
});

test("E2E-001 a non-administrator sees assigned work and no issue creation entry", async ({ page, seed, signInAs }) => {
  const member = await seed.user();
  const project = await seed.project({ assignedTo: [member] });
  await signInAs(page, member);
  await page.goto(`/projects/${project.id}/work`);
  await expect(page.getByRole("heading", { name: "Trabalho atribuído" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Nova intenção/ })).toHaveCount(0);
  await page.goto(`/projects/${project.id}/issues`);
  await expect(page.getByRole("heading", { name: "Criação de Issues é para administradores" })).toBeVisible();
  await expect(page.getByLabel("Mensagem para o Issue Author")).toHaveCount(0);
});

test("E2E-008 a malformed work link stays inside the project and shows the work as unavailable", async ({ page, seed, signInAs }) => {
  const member = await seed.user();
  const project = await seed.project({ assignedTo: [member] });
  await signInAs(page, member);
  await page.goto(`/projects/${project.id}/work/nao-e-uma-tarefa`);
  await expect(page.getByRole("group", { name: "Projeto ativo" })).toContainText(project.name);
  await expect(page.getByText("Este trabalho não existe neste projeto ou não está disponível para você.")).toBeVisible();
  await expect(page.getByRole("button", { name: /Analisar|Aprovar|Iniciar/ })).toHaveCount(0);
});

test("the private local project page never exposes another user's checkout", async ({ page, seed, signInAs }) => {
  const member = await seed.user();
  const project = await seed.project({ assignedTo: [member] });
  await signInAs(page, member);
  await page.goto(`/projects/${project.id}/settings/local-project`);
  await expect(page.getByRole("heading", { name: "Projeto local" })).toBeVisible();
  await expect(page.getByText(/\/home\/|[A-Z]:\\/)).toHaveCount(0);
});

for (const journey of FEATURE_GATE_JOURNEYS) {
  test.fixme(journey, () => {
    test.info().annotations.push({ type: "feature-gate", description: CONTROLLED_PROVIDERS_REASON });
  });
}
