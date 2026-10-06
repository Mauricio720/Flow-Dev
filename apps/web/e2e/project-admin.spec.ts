import { expect, test } from "./fixtures";

const SEE_OTHER = 303;
const GITHUB_CONSENT_URL = "https://github.com/login/oauth/authorize";
const CONTROLLED_GITHUB_REASON = "Requer servidor GitHub controlado para listar, revisar e criar a partir de um repositório.";

test("E2E-003 an administrator without repository consent gets the authorization path and keeps the draft", async ({ page, seed, signInAs }) => {
  const admin = await seed.user({ admin: true });
  await signInAs(page, admin);
  await page.goto("/projects");
  await page.getByRole("link", { name: "Criar projeto" }).first().click();
  await expect(page).toHaveURL(/\/projects\/new$/);
  await expect(page.getByRole("heading", { name: "Autorize o acesso aos repositórios" })).toBeVisible();
  await expect(page.getByRole("list", { name: "Repositórios acessíveis" })).toHaveCount(0);
  await page.getByLabel("Nome do projeto").fill("Alpha em rascunho");
  const authorize = page.getByRole("button", { name: "Autorizar repositórios no GitHub" });
  const action = await authorize.locator("xpath=ancestor::form").getAttribute("action");
  const started = await page.request.post(action ?? "", { maxRedirects: 0, headers: { origin: new URL(page.url()).origin } });
  expect(started.status()).toBe(SEE_OTHER);
  const consent = new URL(started.headers().location);
  expect(consent.origin + consent.pathname).toBe(GITHUB_CONSENT_URL);
  expect(consent.searchParams.get("scope")).toBe("repo offline_access");
  expect(consent.searchParams.get("code_challenge_method")).toBe("S256");
  await page.goto(`/api/github-repositories/callback?error=access_denied&state=${consent.searchParams.get("state")}`);
  await expect(page).toHaveURL(/\/projects\/new\?connection=acesso_negado$/);
  await expect(page.getByText("O GitHub não concedeu acesso aos repositórios")).toBeVisible();
  await expect(page.getByLabel("Nome do projeto")).toHaveValue("Alpha em rascunho");
});

test("the creation route is closed to members and asks visitors to sign in", async ({ page, seed, signInAs, browser }) => {
  const member = await seed.user();
  await signInAs(page, member);
  await page.goto("/projects/new");
  await expect(page).toHaveURL(/\/projects$/);
  await expect(page.getByRole("link", { name: "Criar projeto" })).toHaveCount(0);
  const visitor = await (await browser.newContext()).newPage();
  await visitor.goto("/projects/new");
  expect(new URL(visitor.url()).searchParams.get("next")).toBe("/projects/new");
  await visitor.context().close();
});

test("E2E-005 an administrator edits the details and a member only reads them", async ({ page, seed, signInAs, browser }) => {
  const admin = await seed.user({ admin: true });
  const member = await seed.user();
  const project = await seed.project({ label: "Antes", description: "Descrição antiga", assignedTo: [member] });
  const renamed = `Depois ${project.id.slice(0, 8)}`;
  await signInAs(page, admin);
  await page.goto(`/projects/${project.id}/settings`);
  await expect(page.getByText(project.repository, { exact: true }).last()).toBeVisible();
  await expect(page.getByRole("textbox")).toHaveCount(2);
  await page.getByLabel("Nome do projeto").fill(renamed);
  await page.getByLabel("Descrição (opcional)").fill("");
  await page.getByRole("button", { name: "Salvar detalhes" }).click();
  await expect(page.getByText("Detalhes salvos.")).toBeVisible();
  await page.reload();
  await expect(page.getByRole("group", { name: "Projeto ativo" })).toContainText(renamed);
  await page.goto("/projects");
  await page.getByRole("searchbox", { name: "Buscar por projeto ou repositório" }).fill(renamed);
  await expect(page.getByRole("link", { name: `${renamed} ${project.repository}` })).toBeVisible();
  await expect(page.getByText("Descrição antiga")).toHaveCount(0);
  const reader = await (await browser.newContext()).newPage();
  await signInAs(reader, member);
  await reader.goto(`/projects/${project.id}/settings`);
  await expect(reader.getByText(renamed).last()).toBeVisible();
  await expect(reader.getByRole("textbox")).toHaveCount(0);
  await expect(reader.getByRole("button", { name: "Salvar detalhes" })).toHaveCount(0);
  await reader.context().close();
});

test("a duplicate name and a stale version are refused with a review, never a partial save", async ({ page, seed, signInAs }) => {
  const admin = await seed.user({ admin: true });
  const taken = await seed.project({ label: "Ocupado" });
  const project = await seed.project({ label: "Editável" });
  await signInAs(page, admin);
  await page.goto(`/projects/${project.id}/settings`);
  await page.getByLabel("Nome do projeto").fill(taken.name.toUpperCase());
  await page.getByRole("button", { name: "Salvar detalhes" }).click();
  await expect(page.getByText("Já existe um projeto com esse nome")).toBeVisible();
  const changedElsewhere = `Outra pessoa ${project.id.slice(0, 8)}`;
  await seed.renameAsAnotherAdministrator(project, changedElsewhere);
  await page.getByLabel("Nome do projeto").fill(`Meu nome ${project.id.slice(0, 8)}`);
  await page.getByRole("button", { name: "Salvar detalhes" }).click();
  await expect(page.getByRole("heading", { name: "Os detalhes mudaram enquanto você editava" })).toBeVisible();
  await expect(page.getByText(changedElsewhere)).toBeVisible();
  await expect(page.getByRole("button", { name: "Salvar detalhes" })).toBeDisabled();
  await page.getByRole("button", { name: "Manter minhas alterações" }).click();
  await page.getByRole("button", { name: "Salvar detalhes" }).click();
  await expect(page.getByText("Detalhes salvos.")).toBeVisible();
});

test.fixme("E2E-003 searching acme/private and reviewing an already linked repository", () => {
  test.info().annotations.push({ type: "feature-gate", description: CONTROLLED_GITHUB_REASON });
});

test.fixme("E2E-004 creating Alpha from acme/private and finding it in the catalog", () => {
  test.info().annotations.push({ type: "feature-gate", description: CONTROLLED_GITHUB_REASON });
});
