import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CHECKS_QUESTION, VISIBILITY_QUESTION, questionOf } from "@/test/session";
import { QuestionRequestCard } from "./QuestionRequestCard";

const SUBMIT = { name: "Enviar respostas" };

function show(entry = questionOf(), onAnswer = vi.fn().mockResolvedValue(null), canAnswer = true) {
  render(<QuestionRequestCard entry={entry} canAnswer={canAnswer} busy={false} onAnswer={onAnswer} />);
  return onAnswer;
}

describe("QuestionRequestCard", () => {
  it("submits stable IDs for questions whose labels are identical", async () => {
    const first = { ...VISIBILITY_QUESTION, id: "codex-q1", question: "Confirmar?", options: [{ label: "Sim", description: "" }] };
    const second = { ...first, id: "codex-q2" };
    const onAnswer = show(questionOf({ questions: [first, second] }));
    const groups = screen.getAllByRole("group", { name: "Confirmar?" });
    await userEvent.click(within(groups[0]!).getByRole("radio", { name: "Sim" }));
    await userEvent.click(within(groups[1]!).getByRole("radio", { name: "Sim" }));
    await userEvent.click(screen.getByRole("button", SUBMIT));
    expect(onAnswer).toHaveBeenCalledWith("q1", { "codex-q1": { labels: ["Sim"] }, "codex-q2": { labels: ["Sim"] } });
  });

  it("V-28a shows the question as a labelled group of options with descriptions and Outra, and sends the free text", async () => {
    const onAnswer = show();
    const group = screen.getByRole("group", { name: "Quem pode ver os comentários?" });
    expect(within(group).getAllByRole("radio")).toHaveLength(3);
    expect(within(group).getByRole("radio", { name: /Só membros \(Recomendado\)/ })).toBeTruthy();
    expect(within(group).getByText("Apenas quem é do projeto")).toBeTruthy();
    expect(within(group).getByText("Também visitantes")).toBeTruthy();
    await userEvent.click(within(group).getByRole("radio", { name: "Outra" }));
    await userEvent.type(within(group).getByLabelText("Sua resposta"), "Só o autor e os administradores");
    await userEvent.click(screen.getByRole("button", SUBMIT));
    expect(onAnswer).toHaveBeenCalledWith("q1", { [VISIBILITY_QUESTION.question]: { labels: [], other: "Só o autor e os administradores" } });
  });

  it("REQ-063 shows the short title and says whether one option or several can be chosen", () => {
    show(questionOf({ questions: [VISIBILITY_QUESTION, CHECKS_QUESTION] }));
    expect(screen.getByText("Visibilidade · Escolha uma opção")).toBeTruthy();
    expect(screen.getByText("Verificações · Escolha uma ou mais opções")).toBeTruthy();
  });

  it("V-28a sends the chosen option label alone", async () => {
    const onAnswer = show();
    await userEvent.click(screen.getByRole("radio", { name: /Qualquer pessoa/ }));
    await userEvent.click(screen.getByRole("button", SUBMIT));
    expect(onAnswer).toHaveBeenCalledWith("q1", { [VISIBILITY_QUESTION.question]: { labels: ["Qualquer pessoa"] } });
  });

  it("V-51d sends a secret answer without rendering it, uses a password field, clears local state, and redacts history", async () => {
    const question = { ...VISIBILITY_QUESTION, id: "secret-q", secret: true, allowOther: true };
    const onAnswer = show(questionOf({ questions: [question] }));
    await userEvent.click(screen.getByRole("radio", { name: "Outra" }));
    const field = screen.getByLabelText("Sua resposta") as HTMLInputElement;
    await userEvent.type(field, "senha temporária");
    expect(field.type).toBe("password");
    expect(document.body.textContent).not.toContain("senha temporária");
    await userEvent.click(screen.getByRole("button", SUBMIT));
    expect(onAnswer).toHaveBeenCalledWith("q1", { "secret-q": { labels: [], other: "senha temporária" } });
    expect(screen.queryByLabelText("Sua resposta")).toBeNull();
    await userEvent.click(screen.getByRole("radio", { name: "Outra" }));
    expect((screen.getByLabelText("Sua resposta") as HTMLInputElement).value).toBe("");
    render(<QuestionRequestCard entry={questionOf({ status: "answered", questions: [question], answers: { "secret-q": "senha temporária" } })} canAnswer busy={false} onAnswer={onAnswer} />);
    expect(screen.getByText("(resposta oculta)")).toBeTruthy();
    expect(document.body.textContent).not.toContain("senha temporária");
  });

  it("V-51i hides prohibited Outra and supports an open-ended question when the Codex permits it", async () => {
    const restricted = { ...VISIBILITY_QUESTION, options: [], allowOther: false };
    const view = render(<QuestionRequestCard entry={questionOf({ questions: [restricted] })} canAnswer busy={false} onAnswer={vi.fn()} />);
    expect(screen.queryByRole("radio", { name: "Outra" })).toBeNull();
    expect((screen.getByRole("button", SUBMIT) as HTMLButtonElement).disabled).toBe(true);
    view.unmount();
    const openEnded = { ...VISIBILITY_QUESTION, options: [], allowOther: true };
    render(<QuestionRequestCard entry={questionOf({ questions: [openEnded] })} canAnswer busy={false} onAnswer={vi.fn()} />);
    await userEvent.click(screen.getByRole("radio", { name: "Outra" }));
    expect(screen.getByLabelText("Sua resposta")).toBeTruthy();
    expect((screen.getByRole("button", SUBMIT) as HTMLButtonElement).disabled).toBe(true);
  });

  it("V-28b keeps the submit disabled until every question is answered, then sends both answers", async () => {
    const onAnswer = show(questionOf({ questions: [VISIBILITY_QUESTION, CHECKS_QUESTION] }));
    const submit = () => screen.getByRole("button", SUBMIT) as HTMLButtonElement;
    await userEvent.click(screen.getByRole("radio", { name: /Só membros/ }));
    expect(submit().disabled).toBe(true);
    await userEvent.click(screen.getByRole("checkbox", { name: /lint/ }));
    await userEvent.click(screen.getByRole("checkbox", { name: /test/ }));
    expect(submit().disabled).toBe(false);
    await userEvent.click(submit());
    expect(onAnswer).toHaveBeenCalledWith("q1", { [VISIBILITY_QUESTION.question]: { labels: ["Só membros (Recomendado)"] }, [CHECKS_QUESTION.question]: { labels: ["lint", "test"] } });
  });

  it("V-28b lets the person untick a box and keeps the submit disabled for an empty Outra or one over 2000 characters", async () => {
    show(questionOf({ questions: [CHECKS_QUESTION] }));
    const submit = () => screen.getByRole("button", SUBMIT) as HTMLButtonElement;
    await userEvent.click(screen.getByRole("checkbox", { name: /lint/ }));
    expect(submit().disabled).toBe(false);
    await userEvent.click(screen.getByRole("checkbox", { name: /lint/ }));
    expect(submit().disabled).toBe(true);
    await userEvent.click(screen.getByRole("checkbox", { name: "Outra" }));
    expect(submit().disabled).toBe(true);
    await userEvent.click(screen.getByLabelText("Sua resposta"));
    await userEvent.paste("x".repeat(2_001));
    expect(submit().disabled).toBe(true);
    expect(screen.getByText("A resposta pode ter até 2.000 caracteres.")).toBeTruthy();
  });

  it("V-28b shows the server refusal when the request was already answered", async () => {
    show(questionOf(), vi.fn().mockResolvedValue("Este pedido já foi respondido."));
    await userEvent.click(screen.getByRole("radio", { name: /Qualquer pessoa/ }));
    await userEvent.click(screen.getByRole("button", SUBMIT));
    expect((await screen.findByRole("alert")).textContent).toBe("Este pedido já foi respondido.");
  });

  it("V-28c shows an option preview as escaped Markdown in a monospace block", () => {
    const withPreview = { ...VISIBILITY_QUESTION, options: [{ label: "A | B", description: "Tabela", preview: "```\nA | B\n```\n<script>x</script>" }, VISIBILITY_QUESTION.options[1]!] };
    show(questionOf({ questions: [withPreview] }));
    const block = screen.getByText("A | B", { selector: "code" });
    expect(block.closest("span.font-mono")).not.toBeNull();
    expect(document.querySelector("script")).toBeNull();
    expect(screen.getByText(/<script>x<\/script>/)).toBeTruthy();
  });

  it("shows an answered request with the answers and no controls, and a cancelled one as Cancelada", () => {
    show(questionOf({ status: "answered", answers: { [VISIBILITY_QUESTION.question]: "Qualquer pessoa" } }));
    expect(screen.getByText("Qualquer pessoa")).toBeTruthy();
    expect(screen.getByText("Respondida")).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("shows a cancelled request as Cancelada and a pending one to a reader as waiting for the operator", () => {
    const { rerender } = render(<QuestionRequestCard entry={questionOf({ status: "cancelled" })} canAnswer busy={false} onAnswer={vi.fn()} />);
    expect(screen.getByText("Cancelada")).toBeTruthy();
    rerender(<QuestionRequestCard entry={questionOf()} canAnswer={false} busy={false} onAnswer={vi.fn()} />);
    expect(screen.getByText("Aguardando a pessoa operadora")).toBeTruthy();
    expect(screen.queryByRole("radio")).toBeNull();
  });
});
