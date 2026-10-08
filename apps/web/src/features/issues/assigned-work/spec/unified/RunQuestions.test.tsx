import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { trpc } from "@/lib/trpc/client";
import { FLOW_TARGET } from "@/test/taskFlow";
import { RunQuestions } from "./RunQuestions";

const QUESTION = { id: "q1", title: "O que deve aparecer primeiro?", choices: ["Resumo", "Detalhes"] };

describe("RunQuestions", () => {
  it("lets the author choose an answer and continue the bound run", async () => {
    vi.mocked(trpc.taskFlow.questions.query).mockResolvedValue([QUESTION]);
    vi.mocked(trpc.taskFlow.answerQuestion.mutate).mockResolvedValue({ outcome: "answered" });
    const onAnswered = vi.fn(async () => {});
    render(<RunQuestions target={FLOW_TARGET} runId="run1" canAct onAnswered={onAnswered} />);
    expect(await screen.findByText(QUESTION.title)).toBeTruthy();
    await userEvent.click(screen.getByLabelText("Resumo"));
    await userEvent.click(screen.getByRole("button", { name: "Responder e continuar" }));
    await waitFor(() => expect(trpc.taskFlow.answerQuestion.mutate).toHaveBeenCalledWith({ ...FLOW_TARGET, runId: "run1", interactionId: "q1", choiceIndex: 0 }));
    await waitFor(() => expect(onAnswered).toHaveBeenCalledOnce());
  });

  it("lets the author answer the next question while the screen is still refreshing", async () => {
    const next = { id: "q2", title: "E depois?", choices: ["Erro claro", "Manter"] };
    let current = [QUESTION];
    vi.mocked(trpc.taskFlow.questions.query).mockImplementation(async () => current);
    vi.mocked(trpc.taskFlow.answerQuestion.mutate).mockImplementation(async () => { current = [next]; return { outcome: "answered" }; });
    const neverSettles = vi.fn(() => new Promise<void>(() => {}));
    render(<RunQuestions target={FLOW_TARGET} runId="run1" canAct onAnswered={neverSettles} />);
    await userEvent.click(await screen.findByLabelText("Resumo"));
    await userEvent.click(screen.getByRole("button", { name: "Responder e continuar" }));
    const choice = await screen.findByLabelText("Erro claro", undefined, { timeout: 5000 });
    await userEvent.click(choice);
    expect(choice).toHaveProperty("checked", true);
    expect(screen.getByRole("button", { name: "Responder e continuar" })).toHaveProperty("disabled", false);
  });

  it("keeps readers informed without giving them a response control", async () => {
    vi.mocked(trpc.taskFlow.questions.query).mockResolvedValue([QUESTION]);
    render(<RunQuestions target={FLOW_TARGET} runId="run1" canAct={false} onAnswered={vi.fn()} />);
    expect(await screen.findByText(/Aguardando a pessoa operadora/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Responder e continuar" })).toBeNull();
  });
});
