import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { createGitRepository } from "./fixtures/gitRepository";
import { writeSessionScript } from "./fixtures/sessionScript";
import { hookPayload, writeToolPayload } from "./fixtures/terminalEvents";

const CONTROLLED_PROVIDERS_REASON = "Requer GitHub e quadro de projeto controlados, com acesso pessoal ao repositório: a tela do trabalho só libera a operadora com a verificação do GitHub.";
const SPEC_PATH = "docs/specs/x/spec.md";
const SPEC_LABEL = `${SPEC_PATH} · spec-writer · versão`;
const WITHIN_FIVE_SECONDS = { timeout: 5_000 };

async function writeInClone(clone: string, content: string) {
  await mkdir(dirname(join(clone, SPEC_PATH)), { recursive: true });
  await writeFile(join(clone, SPEC_PATH), content);
}

type SessionTarget = { projectId: string; taskId: string; clonePath: string };

async function startSession(page: Page, target: SessionTarget) {
  const { projectId, taskId, clonePath } = target;
  await page.goto(`/projects/${projectId}/settings`);
  await page.getByLabel("Pasta do clone").fill(clonePath);
  await page.getByRole("button", { name: "Salvar pasta" }).click();
  await expect(page.getByText(/^Verificada em /)).toBeVisible();
  await page.goto(`/projects/${projectId}/work/${taskId}`);
  await page.getByRole("button", { name: "Iniciar sessão" }).click();
  await page.getByRole("dialog", { name: "Iniciar a sessão do Claude" }).getByRole("button", { name: "Iniciar sessão" }).click();
  await expect(page.getByText(/Sessão iniciada por/)).toBeVisible();
}

test.fixme("V-19a and V-19b the hooks of the Flow Dev session move the stage and version the spec artifact", async ({ page, seed, workSeed, signInAs }) => {
  test.info().annotations.push({ type: "feature-gate", description: CONTROLLED_PROVIDERS_REASON });
  const operator = await seed.user();
  const project = await seed.project({ label: "Acompanhamento", assignedTo: [operator] });
  const clone = await createGitRepository(project.repository);
  const work = await workSeed.approvedWork(project, operator);
  await writeInClone(clone.path, "# Spec v1");
  const turn = async () => [{ kind: "hook", payload: await hookPayload("user-prompt-submit-skill", clone.path, { prompt: "/flow-dev:spec-writer escreva a spec" }) }, { kind: "hook", payload: await writeToolPayload(clone.path, SPEC_PATH) }, { kind: "hook", payload: await hookPayload("stop", clone.path) }];
  await writeSessionScript(clone.path, [...(await turn()), { kind: "wait_message" }, ...(await turn())]);
  await signInAs(page, operator);
  await startSession(page, { projectId: project.id, taskId: work.taskId, clonePath: clone.path });
  await expect(page.getByText("Aguardando você").first()).toBeVisible(WITHIN_FIVE_SECONDS);
  await expect(page.getByText(`Editou ${SPEC_PATH}`)).toBeVisible(WITHIN_FIVE_SECONDS);
  await page.getByRole("button", { name: new RegExp(`${SPEC_LABEL} 1`) }).click();
  await expect(page.getByRole("heading", { level: 3, name: "Spec v1" })).toBeVisible();
  await writeInClone(clone.path, "# Spec v2");
  await page.getByRole("textbox", { name: "Mensagem para o Claude" }).fill("Refaça a spec");
  await page.keyboard.press("Control+Enter");
  await expect(page.getByRole("button", { name: new RegExp(`${SPEC_LABEL} 2`) })).toBeVisible(WITHIN_FIVE_SECONDS);
  await page.getByRole("button", { name: new RegExp(`${SPEC_LABEL} 2`) }).click();
  await page.getByLabel("Versão").selectOption("1");
  await expect(page.getByRole("heading", { level: 3, name: "Spec v1" })).toBeVisible();
  await clone.cleanup();
});
