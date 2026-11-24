import { act, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { trpc } from "@/lib/trpc/client";
import { artifactOf, detailWith } from "@/test/execution";
import { P, T, approvedDetail } from "@/test/tasks";
import { FOLDER, setOf, taskOf, viewOf } from "@/test/taskSet";
import { TasksStage } from "./TasksStage";

const get = vi.mocked(trpc.tasks.taskSet.get.query);
const SCOPE = { projectId: P, taskId: T };
const POLL_MS = 5_000;

async function mount(patch: Partial<Parameters<typeof TasksStage>[0]> = {}, detail = detailWith([])) {
  const view = render(<TasksStage scope={SCOPE} detail={detail} reader={false} {...patch} />);
  await act(async () => undefined);
  return view;
}

beforeEach(() => {
  vi.useFakeTimers();
});

describe("TasksStage", () => {
  it("V-40a shows the empty note with a spec and no set", async () => {
    get.mockResolvedValue(viewOf(null));
    await mount();
    expect(screen.getByText("Nenhuma tarefa gerada ainda.")).toBeTruthy();
    expect(screen.queryByRole("list", { name: "Tarefas" })).toBeNull();
  });

  it("V-40b lists the tasks in manifest order with their text and the dependencies as numbers", async () => {
    get.mockResolvedValue(viewOf(setOf([taskOf("01", { title: "Esquema e DAO" }), taskOf("02", { dependsOn: ["task_01"], status: "in_progress", miniDone: 1, miniTotal: 4 }), taskOf("03")])));
    await mount();
    const items = within(screen.getByRole("list", { name: "Tarefas" })).getAllByRole("listitem");
    expect(items.map((item) => within(item).getByRole("button").getAttribute("aria-label"))).toEqual([
      "01 — Esquema e DAO · backend · medium · depende de — · 0/3 · Pendente",
      "02 — Tarefa 02 · backend · medium · depende de 01 · 1/4 · Em andamento",
      "03 — Tarefa 03 · backend · medium · depende de — · 0/3 · Pendente",
    ]);
  });

  it("V-40c shows the reason as a status, lists the folder files as artifacts and shows no task list", async () => {
    get.mockResolvedValue(viewOf(setOf([], { problem: "o grafo de tarefas está ausente" })));
    const detail = detailWith([], [artifactOf({ id: "a2", path: `${FOLDER}/_tasks.md`, skill: "spec-to-tasks" }), artifactOf({ id: "a3", path: "docs/specs/outra/spec.md" })]);
    await mount({}, detail);
    expect(screen.getByRole("status").textContent).toBe("Não foi possível ler o _tasks.md: o grafo de tarefas está ausente.");
    expect(screen.getByRole("button", { name: /docs\/specs\/login\/_tasks\.md/ })).toBeTruthy();
    expect(screen.queryByText(/docs\/specs\/outra\/spec\.md/)).toBeNull();
    expect(screen.queryByRole("list", { name: "Tarefas" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Visão geral" })).toBeNull();
  });

  it("V-40d shows a task without a file as unknown, without a button to open it", async () => {
    get.mockResolvedValue(viewOf(setOf([taskOf("01"), taskOf("03", { artifactId: null, path: null, title: null, type: null, complexity: null, status: "unknown", miniTotal: 0 })])));
    await mount();
    const row = screen.getByText(/Arquivo da tarefa não capturado/);
    expect(row.closest("li")!.textContent).toContain("Desconhecido");
    expect(within(row.closest("li")!).queryByRole("button")).toBeNull();
    expect(screen.getAllByRole("button").filter((button) => button.textContent?.startsWith("0"))).toHaveLength(1);
  });

  it("V-40e warns, as a status, about another set of tasks in another folder", async () => {
    get.mockResolvedValue(viewOf(setOf([taskOf("01")], { otherFolders: ["docs/specs/old"] })));
    await mount();
    expect(screen.getByRole("status").textContent).toBe("Há outro conjunto de tarefas em docs/specs/old.");
  });

  it("V-40g reads again every 5 seconds and shows the new status without reloading, and stops after unmount", async () => {
    get.mockResolvedValueOnce(viewOf(setOf([taskOf("01")])));
    const { unmount } = await mount();
    expect(screen.getByRole("button", { name: /01 — Tarefa 01 .* Pendente/ })).toBeTruthy();
    get.mockResolvedValue(viewOf(setOf([taskOf("01", { status: "completed", miniDone: 3 })])));
    await act(async () => void vi.advanceTimersByTime(POLL_MS));
    expect(screen.getByRole("button", { name: /01 — Tarefa 01 .* 3\/3 · Concluída/ })).toBeTruthy();
    unmount();
    const calls = get.mock.calls.length;
    await act(async () => void vi.advanceTimersByTime(POLL_MS * 3));
    expect(get).toHaveBeenCalledTimes(calls);
  });

  it("keeps showing the last tasks and warns when a new read fails", async () => {
    get.mockResolvedValueOnce(viewOf(setOf([taskOf("01")])));
    await mount();
    get.mockRejectedValue(new Error("falhou"));
    await act(async () => void vi.advanceTimersByTime(POLL_MS));
    expect(screen.getByRole("alert").textContent).toBe("Não foi possível carregar as tarefas agora. Tentaremos de novo.");
    expect(screen.getByRole("button", { name: /01 — Tarefa 01/ })).toBeTruthy();
  });

  it("offers to generate the tasks again to the operator when a set already exists, and not to a reader", async () => {
    get.mockResolvedValue(viewOf(setOf([taskOf("01")])));
    const operator = await mount({}, approvedDetail());
    expect(screen.getByRole("button", { name: "Gerar tarefas de novo" })).toBeTruthy();
    operator.unmount();
    await mount({ reader: true }, approvedDetail());
    expect(screen.queryByRole("button", { name: "Gerar tarefas de novo" })).toBeNull();
  });

  it("offers to generate the tasks again when the manifest cannot be read", async () => {
    get.mockResolvedValue(viewOf({ ...setOf([]), problem: "o grafo de tarefas está ausente" }));
    await mount({}, approvedDetail());
    expect(screen.getByRole("button", { name: "Gerar tarefas de novo" })).toBeTruthy();
  });
});
