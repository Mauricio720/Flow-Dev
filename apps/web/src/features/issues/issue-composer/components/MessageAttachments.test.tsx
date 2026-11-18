import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { messageBox, sendButton } from "@/test/dictationHarness";
import { serveTask, taskApi } from "@/test/taskApi";
import { K, O, P, T, detailOf, loadOf, messageOf, summaryOf } from "@/test/tasks";
import { renderWorkspace } from "@/test/workspaceHarness";

const IMAGE = "00000000-0000-4000-8000-0000000000a1";
const INTENT = "O pagamento da assinatura falha";
const screenshot = () => new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], "tela de falha.png", { type: "image/png" });

function serveUpload(response: Response) {
  const fetcher = vi.fn(async () => response);
  vi.stubGlobal("fetch", fetcher);
  return fetcher;
}

async function attachToNewIntent() {
  vi.spyOn(crypto, "randomUUID").mockReturnValue(K);
  const fetcher = serveUpload(Response.json({ imageId: IMAGE }, { status: 201 }));
  serveTask(detailOf({ task: summaryOf({ status: "generating", version: 1 }), currentRevision: null }), [{ ...messageOf(1, "user", INTENT), imageIds: [IMAGE] }]);
  renderWorkspace(loadOf(null));
  fireEvent.paste(messageBox(), { clipboardData: { files: [screenshot()] } });
  const attached = await screen.findByRole("list", { name: "Imagens anexadas" });
  return { fetcher, attached };
}

afterEach(() => { vi.unstubAllGlobals(); });

describe("message attachments", () => {
  it("stages a pasted screenshot before the task exists and sends it with the first message", async () => {
    taskApi.start.mutate.mockResolvedValue({ taskId: T, operationId: O, acceptedMessageId: "00000000-0000-4000-8000-000000000101", version: 1 });
    const { fetcher, attached } = await attachToNewIntent();
    const form = (fetcher.mock.calls[0] as unknown as [string, RequestInit])[1].body as FormData;
    expect([form.get("projectId"), form.get("taskId")]).toEqual([P, null]);
    expect(within(attached).getByRole("img", { name: "tela de falha.png" }).getAttribute("src")).toBe(`/api/task-images/${IMAGE}`);
    await userEvent.type(messageBox(), INTENT);
    await userEvent.click(sendButton());
    expect(taskApi.start.mutate).toHaveBeenCalledExactlyOnceWith({ projectId: P, requestKey: K, message: INTENT, imageIds: [IMAGE] });
    const thread = await screen.findByRole("list", { name: `Conversa: ${summaryOf().title}` });
    expect(within(thread).getByRole("img", { name: "Imagem anexada 1" }).getAttribute("src")).toBe(`/api/task-images/${IMAGE}`);
    expect(screen.queryByRole("button", { name: "Remover imagem tela de falha.png" })).toBeNull();
  });

  it("drops a removed attachment from the message", async () => {
    taskApi.start.mutate.mockResolvedValue({ taskId: T, operationId: O, acceptedMessageId: "00000000-0000-4000-8000-000000000101", version: 1 });
    await attachToNewIntent();
    await userEvent.click(screen.getByRole("button", { name: "Remover imagem tela de falha.png" }));
    expect(screen.queryByRole("list", { name: "Imagens anexadas" })).toBeNull();
    await userEvent.type(messageBox(), INTENT);
    await userEvent.click(sendButton());
    await waitFor(() => expect(taskApi.start.mutate).toHaveBeenCalledExactlyOnceWith({ projectId: P, requestKey: K, message: INTENT, imageIds: [] }));
  });

  it("explains a refused upload and keeps the message sendable", async () => {
    serveUpload(Response.json({ error: { reason: "image_too_large" } }, { status: 413 }));
    renderWorkspace(loadOf(null));
    fireEvent.paste(messageBox(), { clipboardData: { files: [screenshot()] } });
    expect((await screen.findByRole("alert")).textContent).toBe("A imagem passa de 5 MB. Reduza o tamanho e tente de novo.");
    await userEvent.type(messageBox(), INTENT);
    expect(sendButton().disabled).toBe(false);
  });
});
