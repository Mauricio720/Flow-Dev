import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { taskApi } from "@/test/taskApi";
import { P, T, U, summaryOf } from "@/test/tasks";
import type { HistoryLoad } from "../contract";
import { useTaskHistory } from "../hooks/useTaskHistory";
import { SessionRail } from "./SessionRail";

const T_TASK = summaryOf();
const U_TASK = summaryOf({ id: U, title: "Exportar pedidos", authorName: "Bruno", createdAt: "2026-10-01T13:00:00.000Z" });
const SEARCH_DELAY_MS = 400;

function Rail({ initial }: { initial: HistoryLoad }) {
  const history = useTaskHistory(P, initial);
  return <SessionRail history={history} items={history.items} activeId={null} canAuthor onSelect={vi.fn()} />;
}

function renderRail(initial: HistoryLoad = { kind: "ready", page: { items: [T_TASK], nextCursor: null } }) {
  return render(<Rail initial={initial} />);
}

describe("task history", () => {
  it("UT-049 renders T and U once each after a refresh repeats T and adds U", async () => {
    renderRail();
    taskApi.list.query.mockResolvedValue({ items: [U_TASK, T_TASK, { ...T_TASK }], nextCursor: null });
    await userEvent.click(screen.getByRole("button", { name: "Atualizar" }));
    await screen.findByRole("link", { name: /Exportar pedidos/ });
    expect(screen.getAllByRole("link").map((link) => link.getAttribute("href"))).toEqual([`/projects/${P}/issues/${U}`, `/projects/${P}/issues/${T}`]);
    expect(screen.getByRole("link", { name: /Corrigir total/ }).textContent).toContain("Ana");
  });

  it("UT-050 shows a load failure instead of an empty history", () => {
    renderRail({ kind: "failed", failure: { code: "INTERNAL_SERVER_ERROR", reason: "service_unavailable" } });
    expect(screen.getByRole("alert").textContent).toContain("Não foi possível carregar as tarefas");
    expect(screen.queryByText(/Nenhuma tarefa salva/)).toBeNull();
    expect(screen.getByRole("button", { name: "Tentar novamente" })).toBeTruthy();
  });

  it("UT-101 answers a 201 code point search with the limit before querying", async () => {
    renderRail();
    fireEvent.change(screen.getByRole("searchbox", { name: "Buscar tarefas por título ou autor" }), { target: { value: "ã".repeat(201) } });
    expect(screen.getByRole("alert").textContent).toContain("até 200 caracteres");
    await act(async () => new Promise((resolve) => setTimeout(resolve, SEARCH_DELAY_MS)));
    expect(taskApi.list.query).not.toHaveBeenCalled();
    taskApi.list.query.mockResolvedValue({ items: [], nextCursor: null });
    fireEvent.change(screen.getByRole("searchbox", { name: "Buscar tarefas por título ou autor" }), { target: { value: "ã".repeat(200) } });
    await waitFor(() => expect(taskApi.list.query).toHaveBeenCalledWith({ projectId: P, search: "ã".repeat(200), cursor: undefined }));
  });

  it("UT-109 keeps the project and loaded tasks on a disconnect and offers Retry", async () => {
    renderRail();
    taskApi.list.query.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    await userEvent.click(screen.getByRole("button", { name: "Atualizar" }));
    expect((await screen.findByRole("alert")).textContent).toContain("Sem resposta do servidor");
    expect(screen.getByRole("link", { name: /Corrigir total/ })).toBeTruthy();
    taskApi.list.query.mockResolvedValue({ items: [T_TASK], nextCursor: null });
    await userEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
    await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
    expect(taskApi.list.query.mock.calls.map(([input]) => input.projectId)).toEqual([P, P]);
  });

  it("tells an empty project apart from a search without matches", async () => {
    renderRail({ kind: "ready", page: { items: [], nextCursor: null } });
    expect(screen.getByText(/Nenhuma tarefa salva neste projeto ainda/)).toBeTruthy();
    taskApi.list.query.mockResolvedValue({ items: [], nextCursor: null });
    await userEvent.type(screen.getByRole("searchbox", { name: "Buscar tarefas por título ou autor" }), "frete");
    expect(await screen.findByText("Nenhuma tarefa encontrada para “frete”.")).toBeTruthy();
    expect(screen.queryByText(/Nenhuma tarefa salva neste projeto ainda/)).toBeNull();
  });
});
