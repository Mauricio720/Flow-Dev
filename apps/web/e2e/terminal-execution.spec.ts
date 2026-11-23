import type { Locator, Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { createGitRepository } from "./fixtures/gitRepository";
import { attachmentPathsOf, readSessionPrompt, sessionContextOf } from "./fixtures/sessionFiles";
import { JOURNEY_SCRIPT, writeSessionScript } from "./fixtures/sessionScript";

const CONTROLLED_PROVIDERS_REASON = "Requer GitHub e quadro de projeto controlados, com acesso pessoal ao repositório: a tela do trabalho só libera a operadora com a verificação do GitHub.";

test("E2E-010 a member links a local clone, sees it verified, is refused on a wrong folder and removes it", async ({ page, seed, signInAs }) => {
  const member = await seed.user();
  const project = await seed.project({ label: "Terminal", assignedTo: [member] });
  const clone = await createGitRepository(project.repository);
  const blog = await createGitRepository("acme/blog");
  await signInAs(page, member);
  await page.goto(`/projects/${project.id}/settings`);
  const form = page.getByRole("form", { name: "Meu repositório local" });
  await form.getByLabel("Pasta do clone").fill(clone.path);
  await form.getByRole("button", { name: "Salvar pasta" }).click();
  await expect(form.getByText("Pasta salva.")).toBeVisible();
  await expect(form.getByText(/^Verificada em /)).toBeVisible();
  await form.getByLabel("Pasta do clone").fill(blog.path);
  await form.getByRole("button", { name: "Salvar pasta" }).click();
  await expect(form.getByRole("alert")).toHaveText(`Esta pasta não é um clone de ${project.repository}. Remotes encontrados: acme/blog.`);
  await expect(form.getByText(clone.path, { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("form", { name: "Meu repositório local" }).getByText(clone.path, { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Remover vínculo" }).click();
  await expect(page.getByText("Nenhuma pasta vinculada ainda.")).toBeVisible();
  await clone.cleanup();
  await blog.cleanup();
});

test("E2E-011 another member of the project never sees the folder a colleague linked", async ({ page, seed, signInAs, browser }) => {
  const ana = await seed.user();
  const bruno = await seed.user();
  const project = await seed.project({ label: "Isolamento", assignedTo: [ana, bruno] });
  const clone = await createGitRepository(project.repository);
  await signInAs(page, ana);
  await page.goto(`/projects/${project.id}/settings`);
  await page.getByLabel("Pasta do clone").fill(clone.path);
  await page.getByRole("button", { name: "Salvar pasta" }).click();
  await expect(page.getByText("Pasta salva.")).toBeVisible();
  const other = await (await browser.newContext()).newPage();
  await signInAs(other, bruno);
  await other.goto(`/projects/${project.id}/settings`);
  await expect(other.getByText("Nenhuma pasta vinculada ainda.")).toBeVisible();
  await expect(other.getByText(clone.path, { exact: true })).toHaveCount(0);
  await other.context().close();
  await clone.cleanup();
});

const EDITED_PROMPT = "/flow-dev:direct-executor Use o componente Button existente.";
const ATTACHMENTS_SECTION_SEPARATOR = "\n\nAnexos (leia antes de começar):\n";
const NOTE_SIZE_LABEL = "6 B";
const PNG_BYTES = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);
const FLOW_DEV_SKILLS = ["direct-executor", "spec-conformance", "spec-to-tasks", "spec-writer"];

async function linkClone(page: Page, projectId: string, path: string) {
  await page.goto(`/projects/${projectId}/settings`);
  await page.getByLabel("Pasta do clone").fill(path);
  await page.getByRole("button", { name: "Salvar pasta" }).click();
  await expect(page.getByText(/^Verificada em /)).toBeVisible();
}

async function startWithAttachments(page: Page, dialog: Locator) {
  await dialog.getByLabel("Prompt").fill(EDITED_PROMPT);
  await dialog.getByLabel(/print do erro/).uncheck();
  const files = [{ name: "nota.md", mimeType: "text/markdown", buffer: Buffer.from("# nota") }, { name: "print.png", mimeType: "image/png", buffer: PNG_BYTES }];
  await dialog.getByLabel("Anexar arquivos").setInputFiles(files);
  await expect(dialog.getByText(NOTE_SIZE_LABEL)).toBeVisible();
  await dialog.getByRole("button", { name: "Iniciar sessão" }).click();
  await expect(page.getByText(/Sessão iniciada por/)).toBeVisible();
}

test.fixme("V-10a and V-32g the operator starts the approved work with attachments and the service stores the session, the prompt and the files", async ({ page, seed, workSeed, signInAs, db }) => {
  test.info().annotations.push({ type: "feature-gate", description: CONTROLLED_PROVIDERS_REASON });
  const operator = await seed.user();
  const project = await seed.project({ label: "Execução", assignedTo: [operator] });
  const clone = await createGitRepository(project.repository);
  const work = await workSeed.approvedWork(project, operator);
  await writeSessionScript(clone.path, JOURNEY_SCRIPT);
  await signInAs(page, operator);
  await linkClone(page, project.id, clone.path);
  await page.goto(`/projects/${project.id}/work/${work.taskId}`);
  await page.getByRole("button", { name: "Iniciar sessão" }).click();
  await startWithAttachments(page, page.getByRole("dialog", { name: "Iniciar a sessão do Claude" }));
  const [session] = await db`select id, runtime, permission_mode, checkout_path from task_terminal_sessions where task_id = ${work.taskId}`;
  expect(session).toMatchObject({ runtime: "flow_dev", permission_mode: "bypass", checkout_path: clone.path });
  const prompt = await readSessionPrompt(session!.id);
  const [text, section] = prompt.split(ATTACHMENTS_SECTION_SEPARATOR);
  expect(text).toBe(EDITED_PROMPT);
  expect(attachmentPathsOf(prompt)).toHaveLength(section!.split("\n").length);
  const context = await sessionContextOf(session!.id);
  expect(context.attachments.sort()).toEqual(["01-nota.md", "02-print.png"]);
  expect(context.skills.sort()).toEqual(FLOW_DEV_SKILLS);
  await expect(page.getByText("Vou começar pela análise.")).toBeVisible();
  await clone.cleanup();
});
