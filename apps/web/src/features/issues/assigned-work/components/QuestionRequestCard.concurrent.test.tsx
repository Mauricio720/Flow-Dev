import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { VISIBILITY_QUESTION, questionOf } from "@/test/session";
import { QuestionRequestCard } from "./QuestionRequestCard";

describe("concurrent QuestionRequestCard instances", () => {
  it("isolates identical radio groups and sends the keyboard-selected choice", async () => {
    const onAnswer = vi.fn().mockResolvedValue(null);
    const first = questionOf({ id: "q1", questions: [VISIBILITY_QUESTION] });
    const second = questionOf({ id: "q2", questions: [VISIBILITY_QUESTION] });
    render(<><QuestionRequestCard entry={first} canAnswer busy={false} onAnswer={onAnswer} /><QuestionRequestCard entry={second} canAnswer busy={false} onAnswer={onAnswer} /></>);
    const firstDefault = screen.getAllByRole("radio", { name: /Só membros/ })[0] as HTMLInputElement;
    const secondDefault = screen.getAllByRole("radio", { name: /Só membros/ })[1] as HTMLInputElement;
    await userEvent.tab();
    expect(document.activeElement).toBe(firstDefault);
    await userEvent.keyboard(" ");
    secondDefault.focus();
    await userEvent.keyboard(" ");
    expect(firstDefault.checked).toBe(true);
    expect(secondDefault.checked).toBe(true);
    await userEvent.click(screen.getAllByRole("button", { name: "Enviar respostas" })[1]!);
    expect(onAnswer).toHaveBeenCalledWith("q2", { [VISIBILITY_QUESTION.question]: { labels: ["Só membros (Recomendado)"] } });
  });

  it("gives each identical Outra choice a distinct label target", async () => {
    const onAnswer = vi.fn().mockResolvedValue(null);
    render(<><QuestionRequestCard entry={questionOf({ id: "q1" })} canAnswer busy={false} onAnswer={onAnswer} /><QuestionRequestCard entry={questionOf({ id: "q2" })} canAnswer busy={false} onAnswer={onAnswer} /></>);
    const other = screen.getAllByRole("radio", { name: "Outra" });
    await userEvent.click(other[0]!);
    await userEvent.click(other[1]!);
    const fields = screen.getAllByLabelText("Sua resposta") as HTMLTextAreaElement[];
    expect(fields).toHaveLength(2);
    expect(fields[0]!.id).not.toBe(fields[1]!.id);
    await userEvent.click(screen.getAllByText("Sua resposta", { selector: "label" })[1]!);
    expect(document.activeElement).toBe(fields[1]);
  });
});
