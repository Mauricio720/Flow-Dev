import { fireEvent, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { installDictation } from "@/test/media";
import { serveTask, taskApi } from "@/test/taskApi";
import { ISSUE_41_URL, detailOf, loadOf, messageOf, publishedDetail, summaryOf } from "@/test/tasks";
import { messageBox } from "@/test/dictationHarness";
import { publishButton, recheck, renderWorkspace, statusRegion } from "@/test/workspaceHarness";
import type { TaskStatus } from "../contract";

const CONFIRMED = [messageOf(1, "user", "O total não atualiza ao remover item")];
const PUBLISHING = detailOf({ task: summaryOf({ status: "publishing", version: 8 }) });
const UNSENT = "Corrigir total";

function countAnnouncements() {
  let changes = 0;
  new MutationObserver((records) => (changes += records.length)).observe(statusRegion(), { childList: true, characterData: true, subtree: true });
  return () => changes;
}

describe("workspace states", () => {
  it("UT-141 gives accessible empty guidance with no fake history, evidence or draft", () => {
    renderWorkspace(loadOf(null));
    expect(screen.getByRole("heading", { name: "O que você quer mudar?" })).toBeTruthy();
    expect(screen.getByText(/Nenhuma tarefa salva neste projeto ainda/)).toBeTruthy();
    expect(screen.getByText("Nenhuma consulta foi registrada nesta tarefa.")).toBeTruthy();
    expect(screen.getByText("Ainda não há draft nesta tarefa, então não há fontes citadas.")).toBeTruthy();
    expect(screen.queryByRole("article")).toBeNull();
    expect(within(screen.getByRole("navigation", { name: "Intenções" })).queryAllByRole("link")).toHaveLength(0);
    expect(document.body.textContent).not.toMatch(/simulação|#148|demonstração/);
  });

  it("UT-110 restores only confirmed messages after a refresh with unsent browser text", async () => {
    const detail = detailOf({ task: summaryOf({ status: "awaiting_clarification" }), currentRevision: null });
    serveTask(detail, CONFIRMED);
    const first = renderWorkspace(loadOf(detail, CONFIRMED));
    await userEvent.type(messageBox(), UNSENT);
    first.unmount();
    renderWorkspace(loadOf(detail, CONFIRMED));
    const thread = screen.getByRole("list", { name: "Conversa: Corrigir total" });
    expect(within(thread).getAllByRole("listitem")).toHaveLength(1);
    expect(thread.textContent).toContain("O total não atualiza ao remover item");
    expect(messageBox().value).toBe("");
    expect(taskApi.start.mutate).not.toHaveBeenCalled();
    expect(taskApi.send.mutate).not.toHaveBeenCalled();
  });

  it("UT-138 replaces stale publication controls with the same #41 result after a poll", async () => {
    serveTask(detailOf(), CONFIRMED);
    renderWorkspace(loadOf(detailOf(), CONFIRMED));
    expect(publishButton()).toBeTruthy();
    taskApi.byId.query.mockResolvedValue(publishedDetail());
    await recheck();
    expect(await screen.findByRole("heading", { name: "Issue #41" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Abrir no GitHub" }).getAttribute("href")).toBe(ISSUE_41_URL);
    expect(screen.queryByRole("button", { name: "Criar Issue" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Editar" })).toBeNull();
  });

  it("UT-144 announces one status change for a repeated polling status and version", async () => {
    const generating = detailOf({ task: summaryOf({ status: "generating" }), currentRevision: null });
    serveTask(generating, CONFIRMED);
    renderWorkspace(loadOf(generating, CONFIRMED));
    const announcements = countAnnouncements();
    expect(statusRegion().textContent).toBe("");
    taskApi.byId.query.mockResolvedValue(detailOf({ task: summaryOf({ version: 8 }) }));
    for (let poll = 0; poll < 4; poll++) await recheck();
    expect(statusRegion().textContent).toBe("Draft pronto para revisão.");
    expect(announcements()).toBe(1);
  });

  it("UT-146 exposes publishing and then published with the actions available in each state", async () => {
    serveTask(detailOf(), CONFIRMED);
    renderWorkspace(loadOf(detailOf(), CONFIRMED));
    taskApi.byId.query.mockResolvedValue(PUBLISHING);
    await recheck();
    expect(statusRegion().textContent).toContain("Publicando a Issue no GitHub");
    expect(screen.getByRole<HTMLButtonElement>("button", { name: "Publicando…" })).toMatchObject({ disabled: true, ariaBusy: "true" });
    expect(screen.queryByRole("button", { name: "Editar" })).toBeNull();
    taskApi.byId.query.mockResolvedValue(publishedDetail());
    await recheck();
    expect(statusRegion().textContent).toContain("Issue publicada");
    expect(screen.getByRole("link", { name: "Abrir no GitHub" })).toBeTruthy();
    expect(screen.queryByRole("textbox", { name: "Mensagem para o Issue Author" })).toBeNull();
    expect(screen.getByRole("button", { name: "Começar uma nova intenção" })).toBeTruthy();
  });

  it.each<TaskStatus>(["generating", "publishing", "published"])("UT-119 keeps Start unavailable while the task is %s", (status) => {
    const media = installDictation();
    const detail = status === "published" ? publishedDetail() : detailOf({ task: summaryOf({ status }) });
    serveTask(detail, CONFIRMED);
    renderWorkspace(loadOf(detail, CONFIRMED));
    const start = screen.queryByRole<HTMLButtonElement>("button", { name: "Iniciar ditado" });
    expect(start === null || start.disabled).toBe(true);
    if (start) fireEvent.click(start);
    expect(media.getUserMedia).not.toHaveBeenCalled();
    expect(media.preflight).not.toHaveBeenCalled();
  });
});
