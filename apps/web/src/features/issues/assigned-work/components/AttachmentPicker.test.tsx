import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { useTerminalAttachments } from "../hooks/useTerminalAttachments";
import { UploadError, deleteTerminalAttachment, uploadTerminalAttachment, type UploadedAttachment } from "../terminalAttachmentClient";
import { AttachmentPicker } from "./AttachmentPicker";

vi.mock("../terminalAttachmentClient", async (importOriginal) => ({ ...(await importOriginal<typeof import("../terminalAttachmentClient")>()), uploadTerminalAttachment: vi.fn(), deleteTerminalAttachment: vi.fn(async () => true) }));

const upload = vi.mocked(uploadTerminalAttachment);
const TYPE_MESSAGE = "Tipo não aceito. Envie imagens (PNG, JPEG, GIF, WebP), PDF ou arquivos de texto.";
const fileOf = (name: string, size = 100) => new File([new Uint8Array(size)], name);
const doneFor = (file: File, index = 1): UploadedAttachment => ({ id: `server-${index}`, name: file.name, contentType: "text/plain", byteSize: file.size });

function Harness() {
  const attachments = useTerminalAttachments({ projectId: "p1", taskId: "t1", issueImages: [] });
  return <AttachmentPicker attachments={attachments} issueImages={[]} disabled={false} />;
}

describe("AttachmentPicker", () => {
  it("V-14a sends each chosen or dropped file in its own call", async () => {
    upload.mockImplementation(async ({ file }) => doneFor(file));
    render(<Harness />);
    const pdf = fileOf("fluxo-login.pdf", 2 * 1024 * 1024);
    const log = fileOf("erro.log", 40 * 1024);
    await userEvent.upload(screen.getByLabelText("Anexar arquivos"), pdf);
    fireEvent.drop(screen.getByRole("group", { name: "Soltar arquivos aqui" }), { dataTransfer: { files: [log] } });
    await waitFor(() => expect(upload).toHaveBeenCalledTimes(2));
    expect(upload.mock.calls.map(([request]) => request.file.name)).toEqual(["fluxo-login.pdf", "erro.log"]);
    expect(upload.mock.calls[0]![0]).toMatchObject({ projectId: "p1", taskId: "t1" });
    expect(await screen.findByText("2,0 MB")).toBeTruthy();
    expect(screen.getByText("40 KB")).toBeTruthy();
  });

  it("V-14b announces the progress of an upload in a live region and then shows the size", async () => {
    let progress: (fraction: number) => void = () => undefined;
    let finish: (value: UploadedAttachment) => void = () => undefined;
    upload.mockImplementation(({ onProgress, file }) => new Promise((resolve) => { progress = onProgress; finish = () => resolve(doneFor(file)); }));
    render(<Harness />);
    await userEvent.upload(screen.getByLabelText("Anexar arquivos"), fileOf("erro.log", 40 * 1024));
    act(() => progress(0.45));
    expect(screen.getByText("Enviando… 45%").getAttribute("aria-live")).toBe("polite");
    await act(async () => finish(doneFor(fileOf("erro.log"))));
    expect(await screen.findByText("40 KB")).toBeTruthy();
    expect(screen.queryByText(/Enviando/)).toBeNull();
  });

  it("V-14d offers Tentar de novo only for the upload that failed on the network and retries just that one", async () => {
    upload.mockImplementation(async ({ file }) => {
      if (file.name === "queda.log") throw new UploadError("failed", "Falha de rede ao enviar este arquivo.");
      if (file.name === "planilha.xlsx") throw new UploadError("rejected", TYPE_MESSAGE);
      return doneFor(file);
    });
    render(<Harness />);
    fireEvent.drop(screen.getByRole("group", { name: "Soltar arquivos aqui" }), { dataTransfer: { files: [fileOf("ok.md"), fileOf("queda.log"), fileOf("planilha.xlsx")] } });
    expect(await screen.findAllByRole("button", { name: "Tentar de novo" })).toHaveLength(1);
    upload.mockClear();
    upload.mockImplementation(async ({ file }) => doneFor(file, 9));
    await userEvent.click(screen.getByRole("button", { name: "Tentar de novo" }));
    await waitFor(() => expect(upload).toHaveBeenCalledTimes(1));
    expect(upload.mock.calls[0]![0].file.name).toBe("queda.log");
    expect(screen.queryByRole("button", { name: "Tentar de novo" })).toBeNull();
  });

  it("V-14f announces a refused type in an alert while the other files continue", async () => {
    upload.mockImplementation(async ({ file }) => {
      if (file.name.endsWith(".xlsx")) throw new UploadError("rejected", TYPE_MESSAGE);
      return doneFor(file);
    });
    render(<Harness />);
    fireEvent.drop(screen.getByRole("group", { name: "Soltar arquivos aqui" }), { dataTransfer: { files: [fileOf("planilha.xlsx"), fileOf("nota.md")] } });
    expect((await screen.findByRole("alert")).textContent).toBe(TYPE_MESSAGE);
    expect(await screen.findByText("100 B")).toBeTruthy();
  });

  it("V-14f refuses the 11th file locally with the limit message", async () => {
    upload.mockImplementation(async ({ file }) => doneFor(file));
    render(<Harness />);
    const files = Array.from({ length: 11 }, (_value, index) => fileOf(`a${index}.md`));
    await userEvent.upload(screen.getByLabelText("Anexar arquivos"), files);
    expect((await screen.findByRole("alert")).textContent).toBe("Limite de 10 arquivos por abertura.");
    expect(upload).toHaveBeenCalledTimes(10);
  });

  it("removes an uploaded attachment from the server too", async () => {
    upload.mockImplementation(async ({ file }) => doneFor(file));
    render(<Harness />);
    await userEvent.upload(screen.getByLabelText("Anexar arquivos"), fileOf("nota.md"));
    await userEvent.click(await screen.findByRole("button", { name: "Remover nota.md" }));
    expect(deleteTerminalAttachment).toHaveBeenCalledWith("server-1");
    expect(within(screen.getByRole("region", { name: "Anexos" })).queryByText("nota.md")).toBeNull();
  });
});
