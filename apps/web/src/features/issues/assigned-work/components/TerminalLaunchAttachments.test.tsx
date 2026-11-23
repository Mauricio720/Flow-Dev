import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { trpc } from "@/lib/trpc/client";
import { approvedDetail } from "@/test/tasks";
import { preflightOf } from "@/test/terminal";
import { uploadTerminalAttachment } from "../terminalAttachmentClient";
import type { TerminalPreflight } from "../terminalContract";
import { TerminalLaunchAction } from "./TerminalLaunchAction";

vi.mock("../terminalAttachmentClient", async (importOriginal) => ({ ...(await importOriginal<typeof import("../terminalAttachmentClient")>()), uploadTerminalAttachment: vi.fn(), deleteTerminalAttachment: vi.fn(async () => true) }));

const preflight = vi.mocked(trpc.tasks.terminal.preflight.query);
const open = vi.mocked(trpc.tasks.terminal.open.mutate);
const upload = vi.mocked(uploadTerminalAttachment);
const ACTION = { name: "Iniciar sessão" };
const image = (number: number, preselected = true) => ({ id: `00000000-0000-4000-8000-0000000001${String(number).padStart(2, "0")}`, name: `tela ${number}`, contentType: "image/png", byteSize: 2048, preselected });

async function openDialog(issueImages: TerminalPreflight["issueImages"] = []) {
  preflight.mockResolvedValue(preflightOf({ issueImages }));
  open.mockResolvedValue({ sessionId: "s1", unavailableIssueImages: 0 });
  render(<TerminalLaunchAction detail={approvedDetail()} onOpened={vi.fn()} />);
  await userEvent.click(screen.getByRole("button", ACTION));
  const dialog = await screen.findByRole("dialog");
  await within(dialog).findByLabelText("Prompt");
  return { dialog, confirm: () => within(dialog).getByRole("button", ACTION) as HTMLButtonElement };
}

function drop(dialog: HTMLElement, files: File[]) {
  fireEvent.drop(within(dialog).getByRole("group", { name: "Soltar arquivos aqui" }), { dataTransfer: { files } });
}

describe("TerminalLaunchDialog attachments", () => {
  it("V-14c blocks the confirmation while a file is uploading and releases it afterwards", async () => {
    let finish: () => void = () => undefined;
    upload.mockImplementation(({ file }) => new Promise((resolve) => { finish = () => resolve({ id: "server-1", name: file.name, contentType: "text/plain", byteSize: file.size }); }));
    const { dialog, confirm } = await openDialog();
    drop(dialog, [new File(["x"], "erro.log")]);
    await waitFor(() => expect(confirm().disabled).toBe(true));
    finish();
    await waitFor(() => expect(confirm().disabled).toBe(false));
  });

  it("V-14e lists the Issue images already marked with name and size, and unmarking one drops it from the request", async () => {
    const { dialog, confirm } = await openDialog([image(1), image(2)]);
    const first = within(dialog).getByLabelText("tela 1 (2 KB)") as HTMLInputElement;
    expect(first.checked).toBe(true);
    expect((within(dialog).getByLabelText("tela 2 (2 KB)") as HTMLInputElement).checked).toBe(true);
    await userEvent.click(first);
    await userEvent.click(confirm());
    await waitFor(() => expect(open).toHaveBeenCalledOnce());
    expect(open.mock.calls[0]![0]).toMatchObject({ issueImageIds: [image(2).id], attachmentIds: [] });
  });

  it("V-14g warns that Issue images beyond the limit were left unmarked", async () => {
    const images = Array.from({ length: 12 }, (_value, index) => image(index + 1, index < 10));
    const { dialog } = await openDialog(images);
    expect(within(dialog).getByText("2 imagens da Issue ficaram desmarcadas pelo limite.")).toBeTruthy();
    expect((within(dialog).getByLabelText("tela 11 (2 KB)") as HTMLInputElement).checked).toBe(false);
  });

  it("V-14h previews the Anexos section outside the prompt counter and sends both kinds of ids", async () => {
    let sequence = 0;
    upload.mockImplementation(async ({ file }) => ({ id: `server-${(sequence += 1)}`, name: file.name, contentType: "application/pdf", byteSize: file.size }));
    const { dialog, confirm } = await openDialog([image(1), image(2)]);
    const counterBefore = within(dialog).getByText(/\/ 20\.000/).textContent;
    drop(dialog, [new File(["a"], "fluxo-login.pdf"), new File(["b"], "erro.log")]);
    const preview = await within(dialog).findByRole("region", { name: "Prévia dos anexos do prompt" });
    await waitFor(() => expect(within(preview).getAllByRole("listitem")).toHaveLength(4));
    expect(within(preview).getByText("Anexos (leia antes de começar):")).toBeTruthy();
    expect(within(preview).getByText("- fluxo-login.pdf (application/pdf): (caminho definido ao abrir)")).toBeTruthy();
    expect(within(dialog).getByText(/\/ 20\.000/).textContent).toBe(counterBefore);
    await userEvent.click(confirm());
    await waitFor(() => expect(open).toHaveBeenCalledOnce());
    expect(open.mock.calls[0]![0]).toMatchObject({ attachmentIds: ["server-1", "server-2"], issueImageIds: [image(1).id, image(2).id] });
  });

  it("V-14i tells the person after opening that an Issue image is no longer available", async () => {
    const { confirm } = await openDialog([image(1)]);
    open.mockResolvedValue({ sessionId: "s1", unavailableIssueImages: 1 });
    await userEvent.click(confirm());
    expect(await screen.findByText("1 imagem da Issue não está mais disponível.")).toBeTruthy();
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
