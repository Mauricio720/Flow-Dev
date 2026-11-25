import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { previewOf, publicationApi, serveTask } from "@/test/taskApi";
import { R7, detailOf, loadOf, summaryOf, taskRejection } from "@/test/tasks";
import { publishButton, renderWorkspace } from "@/test/workspaceHarness";
import type { TaskDetail } from "../contract";

const OPTION_LABEL = "Atribuir a mim e colocar em Ready";
const BOARD_MISSING_MESSAGE = "Este projeto não tem um quadro do GitHub vinculado, então a Issue não pode ir para Ready. Uma pessoa administradora vincula o quadro em Configurações. Você também pode criar a Issue sem essa opção.";
const STATUS_MISSING_MESSAGE = "O quadro do projeto não tem a coluna Ready. Crie a coluna no quadro do GitHub ou crie a Issue sem essa opção.";
const PERMISSION_MESSAGE = "Para se atribuir à Issue, sua conta do GitHub precisa de permissão de escrita no repositório. Crie a Issue sem essa opção ou peça essa permissão.";

const REFUSALS = [
  ["ready_board_missing", BOARD_MISSING_MESSAGE],
  ["ready_status_missing", STATUS_MISSING_MESSAGE],
  ["assign_permission_denied", PERMISSION_MESSAGE],
] as const;

function optionBox() {
  return screen.getByRole<HTMLInputElement>("checkbox", { name: OPTION_LABEL });
}

async function openPreview(patch: Partial<TaskDetail> = {}) {
  const detail = detailOf({ task: summaryOf({ version: 7 }), ...patch });
  serveTask(detail);
  publicationApi.preview.query.mockResolvedValue(previewOf(R7, "## Objetivo\n\nTexto"));
  renderWorkspace(loadOf(detail));
  await userEvent.click(screen.getByRole("button", { name: "Revisar publicação" }));
  await screen.findByRole("checkbox", { name: OPTION_LABEL });
}

describe("PublicationPreview assignment option", () => {
  beforeEach(() => {
    publicationApi.publish.mutate.mockResolvedValue({ status: "publishing" });
  });

  it("V-08a offers an unchecked checkbox reachable by Tab and toggled by Space", async () => {
    await openPreview();
    expect(optionBox().checked).toBe(false);
    screen.getByLabelText("Corpo da Issue em Markdown").focus();
    await userEvent.tab();
    expect(document.activeElement).toBe(optionBox());
    await userEvent.keyboard(" ");
    expect(optionBox().checked).toBe(true);
  });

  it("V-08b sends assignToSelf true when checked, false otherwise, and never an account", async () => {
    await openPreview();
    await userEvent.click(publishButton());
    expect(publicationApi.publish.mutate.mock.calls[0][0]).toMatchObject({ assignToSelf: false });
    await userEvent.click(optionBox());
    await userEvent.click(publishButton());
    const sent = publicationApi.publish.mutate.mock.calls[1][0];
    expect(sent.assignToSelf).toBe(true);
    expect(Object.keys(sent)).not.toContain("login");
    expect(Object.keys(sent)).not.toContain("assignees");
    expect(sent.requestKey).not.toBe(publicationApi.publish.mutate.mock.calls[0][0].requestKey);
  });

  it.each(REFUSALS)("V-08c announces %s with the literal message and keeps the draft", async (reason, message) => {
    await openPreview();
    publicationApi.publish.mutate.mockRejectedValue(taskRejection("PRECONDITION_FAILED", reason));
    await userEvent.click(optionBox());
    await userEvent.click(publishButton());
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain(message);
    const draft = within(screen.getByRole("article", { name: "Draft da issue" }));
    expect(draft.getByText("Corrigir total")).toBeTruthy();
    expect(draft.getByText("Ao remover item o total permanece antigo")).toBeTruthy();
  });

  it("V-08d returns to unchecked when the preview is requested again, and publishes without the option", async () => {
    await openPreview();
    publicationApi.publish.mutate.mockRejectedValueOnce(taskRejection("PRECONDITION_FAILED", "ready_status_missing"));
    await userEvent.click(optionBox());
    await userEvent.click(publishButton());
    await userEvent.click(await screen.findByRole("button", { name: "Tentar a prévia de novo" }));
    await waitFor(() => expect(optionBox().checked).toBe(false));
    await userEvent.click(publishButton());
    expect(publicationApi.publish.mutate.mock.calls[1][0]).toMatchObject({ assignToSelf: false });
    await userEvent.click(optionBox());
    await userEvent.click(screen.getByRole("button", { name: "Revisar de novo" }));
    await waitFor(() => expect(optionBox().checked).toBe(false));
  });
});
