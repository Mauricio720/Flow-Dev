import { randomUUID } from "node:crypto";
import { expect, test } from "./fixtures";

const SEE_OTHER = 303;
const GITHUB_CONSENT_URL = "https://github.com/login/oauth/authorize";
const CONTROLLED_PROVIDERS_REASON = "Requer GitHub, Issue Author e Groq controlados, com acesso pessoal ao repositório: jornada completa do feature-gate.";
const DEMO_COPY = /simulação|dados de demonstração|#148/;

const FEATURE_GATE_JOURNEYS = [
  "E2E-004 a reader filters the history by author, pages to a task and opens it read-only",
  "E2E-005 confirmed messages and the current revision restore after a service restart",
  "E2E-006 a lost acceptance response is recovered into one saved intention",
  "E2E-007 distinct captures are started, stopped and canceled while typing stays usable",
  "E2E-008 typed and dictated text are corrected and only the final text is accepted",
  "E2E-009 one minimal question leads to draft review in the same task",
  "E2E-010 an identifiable bug yields a canonical draft citing only the project repository",
  "E2E-011 an edited statement of a retrieved source becomes visibly author-edited",
  "E2E-012 the preview matches the confirmed revision without empty optional headings",
  "E2E-013 applying only the proposed title keeps the saved context unchanged",
  "E2E-014 an explicit Criar Issue returns the actual number and link",
  "E2E-015 a lost creation response blocks a second creation until the receipt resolves it",
  "E2E-016 a reader follows Abrir no GitHub from the approved snapshot",
  "E2E-017 a revoked assignment makes protected content and actions unavailable",
  "E2E-018 repository consent returns to the same saved revision without generating or publishing",
  "E2E-019 keyboard on a narrow viewport types, reviews, opens sources and publishes",
];

function taskPath(projectId: string) {
  return `/projects/${projectId}/issues/${randomUUID()}`;
}

test("a member without repository consent sees the separate authorization path and no demonstration content", async ({ page, seed, signInAs }) => {
  const member = await seed.user();
  const project = await seed.project({ assignedTo: [member] });
  await signInAs(page, member);
  await page.goto(`/projects/${project.id}/issues`);
  await expect(page.getByRole("group", { name: "Projeto ativo" })).toContainText(project.repository);
  await expect(page.getByRole("heading", { name: "Autorize a leitura do repositório" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Autorizar repositórios no GitHub" }).last()).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Intenções" }).getByRole("link")).toHaveCount(0);
  await expect(page.getByRole("navigation", { name: "Intenções" }).getByRole("alert")).toContainText("Não foi possível carregar as tarefas");
  await expect(page.getByText(DEMO_COPY)).toHaveCount(0);
});

test("a visitor following a task link signs in first and keeps the exact task as destination", async ({ page, seed }) => {
  const project = await seed.project();
  const destination = taskPath(project.id);
  await page.goto(destination);
  await expect(page).toHaveURL(/\/login\?/);
  expect(new URL(page.url()).searchParams.get("next")).toBe(destination);
  await expect(page.getByText(project.name)).toHaveCount(0);
});

test("a malformed task link stays inside the project and shows the task as unavailable", async ({ page, seed, signInAs }) => {
  const member = await seed.user();
  const project = await seed.project({ assignedTo: [member] });
  await signInAs(page, member);
  await page.goto(`/projects/${project.id}/issues/nao-e-uma-tarefa`);
  await expect(page.getByRole("group", { name: "Projeto ativo" })).toContainText(project.name);
  await expect(page.getByRole("heading", { name: "Não foi possível abrir esta tarefa" })).toBeVisible();
  await expect(page.getByText("Esta tarefa não existe neste projeto ou não está disponível para você.")).toBeVisible();
  await expect(page.getByLabel("Mensagem para o Issue Author")).toHaveCount(0);
});

test("repository authorization started from a task returns to that same task without replaying anything", async ({ page, seed, signInAs }) => {
  const member = await seed.user();
  const project = await seed.project({ assignedTo: [member] });
  const destination = taskPath(project.id);
  await signInAs(page, member);
  await page.goto(destination);
  const action = await page.getByRole("button", { name: "Autorizar repositórios no GitHub" }).last().locator("xpath=ancestor::form").getAttribute("action");
  expect(new URL(action ?? "", page.url()).searchParams.get("returnTo")).toBe(destination);
  const started = await page.request.post(action ?? "", { maxRedirects: 0, headers: { origin: new URL(page.url()).origin } });
  expect(started.status()).toBe(SEE_OTHER);
  const consent = new URL(started.headers().location);
  expect(consent.origin + consent.pathname).toBe(GITHUB_CONSENT_URL);
  await page.goto(`/api/github-repositories/callback?error=access_denied&state=${consent.searchParams.get("state")}`);
  await expect(page).toHaveURL(new RegExp(`${destination}\\?connection=acesso_negado$`));
  await expect(page.getByRole("heading", { name: "Autorize a leitura do repositório" })).toBeVisible();
});

for (const journey of FEATURE_GATE_JOURNEYS) {
  test.fixme(journey, () => {
    test.info().annotations.push({ type: "feature-gate", description: CONTROLLED_PROVIDERS_REASON });
  });
}
