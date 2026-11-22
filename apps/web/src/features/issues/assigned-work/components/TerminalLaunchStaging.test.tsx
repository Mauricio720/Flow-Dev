import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { trpc } from "@/lib/trpc/client";
import { approvedDetail } from "@/test/tasks";
import { preflightOf } from "@/test/terminal";
import { deleteTerminalAttachment, uploadTerminalAttachment } from "../terminalAttachmentClient";
import type { TerminalPreflight } from "../terminalContract";
import { TerminalLaunchAction } from "./TerminalLaunchAction";

vi.mock("../terminalAttachmentClient", async (importOriginal) => ({ ...(await importOriginal<typeof import("../terminalAttachmentClient")>()), uploadTerminalAttachment: vi.fn(), deleteTerminalAttachment: vi.fn(async () => true) }));

const ACTION = { name: "Abrir no terminal" };
const MEGABYTE = 1024 * 1024;
const upload = vi.mocked(uploadTerminalAttachment);
const discard = vi.mocked(deleteTerminalAttachment);
const bigImage = { id: "00000000-0000-4000-8000-000000000101", name: "tela grande", contentType: "image/png", byteSize: 25 * MEGABYTE, preselected: true };

async function openDialog(issueImages: TerminalPreflight["issueImages"] = []) {
  vi.mocked(trpc.tasks.terminal.preflight.query).mockResolvedValue(preflightOf({ issueImages }));
  vi.mocked(trpc.tasks.terminal.open.mutate).mockResolvedValue({ sessionId: "s1", unavailableIssueImages: 0 });
  const view = render(<TerminalLaunchAction detail={approvedDetail()} onOpened={vi.fn()} />);
  await userEvent.click(screen.getByRole("button", ACTION));
  const dialog = await screen.findByRole("dialog");
  await within(dialog).findByLabelText("Prompt");
  return { dialog, unmount: view.unmount, confirm: () => within(dialog).getByRole("button", ACTION) };
}

function drop(dialog: HTMLElement, file: File) {
  fireEvent.drop(within(dialog).getByRole("group", { name: "Soltar arquivos aqui" }), { dataTransfer: { files: [file] } });
}

beforeEach(() => {
  discard.mockClear();
  upload.mockReset();
  upload.mockImplementation(async ({ file }) => ({ id: "server-1", name: file.name, contentType: "text/plain", byteSize: file.size }));
});

describe("TerminalLaunchDialog staged uploads", () => {
  it("B-1 discards the staged uploads when the dialog closes without opening the session", async () => {
    const { dialog, unmount } = await openDialog();
    drop(dialog, new File(["x"], "erro.log"));
    await within(dialog).findByText("1 B");
    unmount();
    expect(discard).toHaveBeenCalledWith("server-1");
  });

  it("B-1 keeps the staged uploads when the session opens", async () => {
    const { dialog, unmount, confirm } = await openDialog();
    drop(dialog, new File(["x"], "erro.log"));
    await within(dialog).findByText("1 B");
    await userEvent.click(confirm());
    await waitFor(() => expect(trpc.tasks.terminal.open.mutate).toHaveBeenCalled());
    unmount();
    expect(discard).not.toHaveBeenCalled();
  });

  it("I-1 refuses the file that would pass 30 MB together with the marked Issue images", async () => {
    const { dialog } = await openDialog([bigImage]);
    const pdf = new File(["x"], "fluxo.pdf");
    Object.defineProperty(pdf, "size", { value: 8 * MEGABYTE });
    drop(dialog, pdf);
    expect((await within(dialog).findByRole("alert")).textContent).toBe("Os anexos passariam de 30 MB.");
    expect(upload).not.toHaveBeenCalled();
  });
});
