import { act, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRouter } from "next/navigation";
import { describe, expect, it } from "vitest";
import { startListening } from "@/test/dictationHarness";
import { installDictation } from "@/test/media";
import { serveTask, taskApi } from "@/test/taskApi";
import { P, T, detailOf, loadOf, messageOf, taskRejection } from "@/test/tasks";
import { recheck, renderWorkspace } from "@/test/workspaceHarness";

const READER_DETAIL = detailOf({ permissions: { canEdit: false } });
const MESSAGES = [messageOf(1, "user", "O total não atualiza ao remover item")];
const MUTATION_CONTROLS = ["Enviar", "Iniciar ditado", "Editar", "Salvar", "Revisar publicação", "Criar Issue", "Aplicar selecionados"];
const SIGN_IN_PATH = `/login?erro=sessao_expirada&next=${encodeURIComponent(`/projects/${P}/issues/${T}`)}`;

function openAsAuthor() {
  const detail = detailOf();
  serveTask(detail, MESSAGES);
  renderWorkspace(loadOf(detail, MESSAGES));
}

describe("workspace access", () => {
  it("UT-061 shows author A and the read-only explanation to member B without mutation controls", () => {
    serveTask(READER_DETAIL, MESSAGES);
    renderWorkspace(loadOf(READER_DETAIL, MESSAGES));
    expect(screen.getByRole("heading", { name: "Somente leitura · tarefa de Ana" })).toBeTruthy();
    expect(screen.getByRole("list", { name: "Conversa: Corrigir total" }).textContent).toContain("Ana");
    expect(screen.queryByRole("textbox", { name: "Mensagem para o Issue Author" })).toBeNull();
    MUTATION_CONTROLS.forEach((name) => expect(screen.queryByRole("button", { name })).toBeNull());
  });

  it("UT-142 explains to reader B which actions stay with the author", () => {
    serveTask(READER_DETAIL, MESSAGES);
    renderWorkspace(loadOf(READER_DETAIL, MESSAGES));
    const notice = screen.getByRole("region", { name: "Somente leitura" });
    expect(notice.textContent).toContain("Enviar mensagens, ditar, editar e publicar ficam reservados à pessoa autora");
    expect(notice.textContent).toContain("Estado atual: Draft pronto");
    expect(screen.getByText("Somente leitura. Apenas a pessoa autora pode editar, refinar ou publicar este draft.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Começar uma nova intenção" })).toBeTruthy();
  });

  it("UT-062 stops every microphone track when access is revoked during a capture", async () => {
    const media = installDictation();
    openAsAuthor();
    await startListening("");
    taskApi.byId.query.mockRejectedValue(taskRejection("NOT_FOUND", "project_unavailable"));
    await recheck();
    await waitFor(() => expect(media.tracks[0].stop).toHaveBeenCalled());
    expect(useRouter().replace).toHaveBeenCalledWith("/projects?erro=acesso_revogado");
    expect(screen.getByRole("alert").textContent).toContain("Seu acesso a este projeto mudou");
    expect(screen.queryByText("O total não atualiza ao remover item")).toBeNull();
  });

  it("UT-139 and UT-054 stop the capture and clear protected content when the session expires", async () => {
    const media = installDictation();
    openAsAuthor();
    await startListening("");
    taskApi.byId.query.mockRejectedValue(taskRejection("UNAUTHORIZED"));
    await recheck();
    await waitFor(() => expect(media.tracks[0].stop).toHaveBeenCalled());
    expect(screen.getByRole("link", { name: "Entrar novamente" }).getAttribute("href")).toBe(SIGN_IN_PATH);
    expect(screen.queryByText("Recalcular total")).toBeNull();
    expect(screen.queryByRole("button", { name: "Iniciar ditado" })).toBeNull();
  });

  it("UT-139 keeps the local edit and asks for sign-in when the session expires during a save", async () => {
    openAsAuthor();
    await userEvent.click(screen.getByRole("button", { name: "Editar" }));
    await userEvent.type(screen.getByRole("textbox", { name: "Objetivo" }), " com desconto");
    taskApi.saveDraft.mutate.mockRejectedValue(taskRejection("UNAUTHORIZED"));
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));
    expect((await screen.findByRole("link", { name: "Entrar novamente" })).getAttribute("href")).toBe(SIGN_IN_PATH);
    expect(screen.getByRole<HTMLTextAreaElement>("textbox", { name: "Objetivo" }).value).toBe("Recalcular total com desconto");
    await act(async () => undefined);
    expect(taskApi.byId.query).not.toHaveBeenCalled();
  });

  it("explains repository authorization apart from sign-in and returns to the same task", () => {
    const failure = { code: "PRECONDITION_FAILED", reason: "repository_authorization_needed" };
    renderWorkspace({ taskId: T, history: { kind: "failed", failure }, task: { kind: "failed", failure } });
    expect(screen.getByRole("heading", { name: "Autorize a leitura do repositório" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Autorizar repositórios no GitHub" }).closest("form")?.getAttribute("action")).toBe(`/api/github-repositories/connect?returnTo=${encodeURIComponent(`/projects/${P}/issues/${T}`)}`);
    expect(screen.queryByRole("article")).toBeNull();
    expect(screen.queryByRole("textbox", { name: "Mensagem para o Issue Author" })).toBeNull();
  });
});
