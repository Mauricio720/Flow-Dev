import type { Locator, Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { createGitRepository } from "./fixtures/gitRepository";
import { attachmentPathsOf, clearRecordedLaunch, readRecordedLaunch, sessionContextOf } from "./fixtures/terminalLaunch";

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

async function openWithAttachments(page: Page, dialog: Locator) {
  await dialog.getByLabel("Prompt").fill(EDITED_PROMPT);
  await dialog.getByLabel(/print do erro/).uncheck();
  const files = [{ name: "nota.md", mimeType: "text/markdown", buffer: Buffer.from("# nota") }, { name: "print.png", mimeType: "image/png", buffer: PNG_BYTES }];
  await dialog.getByLabel("Anexar arquivos").setInputFiles(files);
  await expect(dialog.getByText(NOTE_SIZE_LABEL)).toBeVisible();
  await dialog.getByRole("button", { name: "Abrir no terminal" }).click();
  await expect(page.getByText(/Execução aberta no terminal por/)).toBeVisible();
}

test.fixme("V-10a the operator opens the approved work in the terminal with attachments and the fake launcher", async ({ page, seed, workSeed, signInAs }) => {
  test.info().annotations.push({ type: "feature-gate", description: CONTROLLED_PROVIDERS_REASON });
  const operator = await seed.user();
  const project = await seed.project({ label: "Execução", assignedTo: [operator] });
  const clone = await createGitRepository(project.repository);
  const work = await workSeed.approvedWork(project, operator);
  await clearRecordedLaunch();
  await signInAs(page, operator);
  await linkClone(page, project.id, clone.path);
  await page.goto(`/projects/${project.id}/work/${work.taskId}`);
  await page.getByRole("button", { name: "Abrir no terminal" }).click();
  await openWithAttachments(page, page.getByRole("dialog", { name: "Abrir a execução no terminal" }));
  const launch = await readRecordedLaunch();
  const [text, section] = launch.args.at(-1)!.split(ATTACHMENTS_SECTION_SEPARATOR);
  expect(launch.args[0]).toBe(`--working-directory=${clone.path}`);
  expect(text).toBe(EDITED_PROMPT);
  expect(attachmentPathsOf(launch.args.at(-1)!)).toHaveLength(section!.split("\n").length);
  const context = await sessionContextOf(launch.args.at(-1)!);
  expect(context.attachments.sort()).toEqual(["01-nota.md", "02-print.png"]);
  expect(context.skills.sort()).toEqual(FLOW_DEV_SKILLS);
  await clone.cleanup();
});
