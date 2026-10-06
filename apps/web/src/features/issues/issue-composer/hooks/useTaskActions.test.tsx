import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { messageBox, sendButton } from "@/test/dictationHarness";
import { deferred } from "@/test/projects";
import { serveTask, taskApi } from "@/test/taskApi";
import { K, O, P, T, detailOf, loadOf, messageOf, summaryOf } from "@/test/tasks";
import { renderWorkspace } from "@/test/workspaceHarness";
import type { TaskReceipt } from "../contract";

const QUESTION = [messageOf(1, "user", "Corrigir pedido."), messageOf(2, "assistant", "Qual falha acontece no pedido?")];
const AWAITING = detailOf({ task: summaryOf({ status: "awaiting_clarification" }), currentRevision: null });
const ANSWER = "Corrigir total";
const RECEIPT: TaskReceipt = { taskId: T, operationId: O, acceptedMessageId: "00000000-0000-4000-8000-000000000103", version: 8 };

function thread() {
  return screen.getByRole("list", { name: "Conversa: Corrigir total" });
}

async function writeAnswer() {
  vi.spyOn(crypto, "randomUUID").mockReturnValue(K);
  serveTask(AWAITING, QUESTION);
  renderWorkspace(loadOf(AWAITING, QUESTION));
  await userEvent.type(messageBox(), ANSWER);
}

describe("useTaskActions", () => {
  it("UT-051 clears the matching input only after the receipt for K is accepted", async () => {
    const accepted = deferred<TaskReceipt>();
    taskApi.send.mutate.mockReturnValue(accepted.promise);
    await writeAnswer();
    await userEvent.click(sendButton());
    expect(taskApi.send.mutate).toHaveBeenCalledExactlyOnceWith({ projectId: P, taskId: T, expectedVersion: 7, requestKey: K, message: ANSWER });
    expect(messageBox().value).toBe(ANSWER);
    expect(sendButton().disabled).toBe(true);
    taskApi.messages.query.mockResolvedValue({ items: [...QUESTION, messageOf(3, "user", ANSWER)], nextCursor: null });
    taskApi.byId.query.mockResolvedValue(detailOf({ task: summaryOf({ status: "generating", version: 8 }), currentRevision: null }));
    await act(async () => accepted.resolve(RECEIPT));
    await waitFor(() => expect(messageBox().value).toBe(""));
    expect(within(thread()).getByText(ANSWER)).toBeTruthy();
  });

  it("UT-052 leaves the text editable and unconfirmed when the request resets without a receipt", async () => {
    taskApi.send.mutate.mockRejectedValue(new TypeError("Failed to fetch"));
    await writeAnswer();
    await userEvent.click(sendButton());
    expect((await screen.findByRole("alert")).textContent).toContain("Não foi possível confirmar o envio");
    expect(messageBox().value).toBe(ANSWER);
    expect(within(thread()).queryByText(ANSWER)).toBeNull();
    taskApi.submission.query.mockResolvedValue({ status: "not_accepted" });
    await userEvent.click(screen.getByRole("button", { name: "Verificar envio" }));
    expect(taskApi.submission.query).toHaveBeenCalledExactlyOnceWith({ projectId: P, action: "send", requestKey: K });
    expect((await screen.findByText(/O envio não chegou a ser aceito/)).textContent).toContain("Seu texto continua aqui");
    await userEvent.type(messageBox(), " do carrinho");
    expect(messageBox().value).toBe("Corrigir total do carrinho");
  });

  it("recovers an accepted submission through the receipt lookup without sending twice", async () => {
    taskApi.send.mutate.mockRejectedValue(new TypeError("Failed to fetch"));
    await writeAnswer();
    await userEvent.click(sendButton());
    taskApi.submission.query.mockResolvedValue(RECEIPT);
    await userEvent.click(await screen.findByRole("button", { name: "Verificar envio" }));
    await waitFor(() => expect(messageBox().value).toBe(""));
    expect(taskApi.send.mutate).toHaveBeenCalledTimes(1);
  });

  it("creates the task on the first accepted message and moves to its stable link", async () => {
    vi.spyOn(crypto, "randomUUID").mockReturnValue(K);
    taskApi.start.mutate.mockResolvedValue({ ...RECEIPT, version: 1 });
    serveTask(detailOf({ task: summaryOf({ status: "generating", version: 1 }), currentRevision: null }), [messageOf(1, "user", ANSWER)]);
    renderWorkspace(loadOf(null));
    await userEvent.type(messageBox(), ANSWER);
    await userEvent.click(sendButton());
    expect(taskApi.start.mutate).toHaveBeenCalledExactlyOnceWith({ projectId: P, requestKey: K, message: ANSWER });
    await waitFor(() => expect(window.location.pathname).toBe(`/projects/${P}/issues/${T}`));
    expect(await screen.findByText("Consultando o contexto e escrevendo o draft…")).toBeTruthy();
  });
});
