import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { serveTask } from "@/test/taskApi";
import { P, T, detailOf, loadOf, revisionOf } from "@/test/tasks";
import { renderWorkspace } from "@/test/workspaceHarness";

const IMAGE = "00000000-0000-4000-8000-0000000000a1";
const screenshot = () => new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], "tela do carrinho.png", { type: "image/png" });

async function editContext(context = "Total antigo") {
  const detail = detailOf({ currentRevision: revisionOf({ context }) });
  serveTask(detail);
  renderWorkspace(loadOf(detail));
  const draft = within(screen.getByRole("article", { name: "Draft da issue" }));
  await userEvent.click(draft.getByRole("button", { name: "Editar" }));
  return { draft, field: draft.getByLabelText("Contexto") as HTMLTextAreaElement };
}

function serveUpload(response: Response) {
  const fetcher = vi.fn(async () => response);
  vi.stubGlobal("fetch", fetcher);
  return fetcher;
}

afterEach(() => { vi.unstubAllGlobals(); });

describe("ImageTextarea", () => {
  it("uploads a pasted screenshot for this task and inserts its reference into the field", async () => {
    const fetcher = serveUpload(Response.json({ imageId: IMAGE }, { status: 201 }));
    const { draft, field } = await editContext();
    fireEvent.paste(field, { clipboardData: { files: [screenshot()] } });
    await waitFor(() => expect(field.value).toBe(`Total antigo\n![tela do carrinho](flow-image:${IMAGE})\n`));
    const [url, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit];
    const form = init.body as FormData;
    expect([url, form.get("projectId"), form.get("taskId")]).toEqual(["/api/task-images", P, T]);
    expect(draft.getByText("Imagem inserida no texto.")).toBeTruthy();
  });

  it("keeps the text and explains the failure when the server refuses the image", async () => {
    serveUpload(Response.json({ error: { reason: "image_limit" } }, { status: 409 }));
    const { draft, field } = await editContext();
    fireEvent.paste(field, { clipboardData: { files: [screenshot()] } });
    expect((await draft.findByRole("alert")).textContent).toBe("Esta tarefa já tem o máximo de 30 imagens.");
    expect(field.value).toBe("Total antigo");
  });

  it("rejects unsupported files before sending them", async () => {
    const fetcher = serveUpload(Response.json({}));
    const { draft, field } = await editContext();
    fireEvent.paste(field, { clipboardData: { files: [new File(["<svg/>"], "logo.svg", { type: "image/svg+xml" })] } });
    expect((await draft.findByRole("alert")).textContent).toBe("Formato não aceito. Use PNG, JPEG, GIF ou WebP.");
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("shows stored images in the draft instead of the raw reference", async () => {
    const detail = detailOf({ currentRevision: revisionOf({ context: `Veja:\n![tela do carrinho](flow-image:${IMAGE})` }) });
    serveTask(detail);
    renderWorkspace(loadOf(detail));
    const image = within(screen.getByRole("article", { name: "Draft da issue" })).getByRole("img", { name: "tela do carrinho" });
    expect(image.getAttribute("src")).toBe(`/api/task-images/${IMAGE}`);
  });
});
