import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { trpc } from "@/lib/trpc/client";
import { detailWith } from "@/test/execution";
import { P, T } from "@/test/tasks";
import { FOLDER, MANIFEST_ID, setOf, taskOf, viewOf } from "@/test/taskSet";
import { ArtifactList } from "./ArtifactList";
import { TasksStage } from "./TasksStage";

const getSet = vi.mocked(trpc.tasks.taskSet.get.query);
const list = vi.mocked(trpc.tasks.artifacts.list.query);
const get = vi.mocked(trpc.tasks.artifacts.get.query);
const SCOPE = { projectId: P, taskId: T };
const TWO = taskOf("02", { title: "Rotas", miniDone: 1, miniTotal: 2 });
const TWO_PATH = `${FOLDER}/task_02.md`;
const TWO_ID = TWO.artifactId!;

const version = (number: number, skill: string) => ({ version: number, skill, sessionId: null, capturedAt: "2026-11-23T10:00:00.000Z", byteSize: 10 });
const content = (path: string, number: number, skill: string, text: string) => ({ path, version: number, skill, sessionId: null, capturedAt: "2026-11-23T10:00:00.000Z", content: text });

beforeEach(() => {
  getSet.mockResolvedValue(viewOf(setOf([taskOf("01"), TWO])));
});

async function openTwo() {
  render(<TasksStage scope={SCOPE} detail={detailWith([])} reader={false} />);
  await userEvent.click(await screen.findByRole("button", { name: /^02 — Rotas/ }));
  return screen.findByRole("article");
}

describe("opening a task and the overview", () => {
  it("V-40h renders the task with its checkboxes read-only, marked or not, and the version picker", async () => {
    list.mockResolvedValue([{ id: TWO_ID, path: TWO_PATH, versions: [version(1, "spec-to-tasks")] }]);
    get.mockResolvedValue(content(TWO_PATH, 1, "spec-to-tasks", "## Mini-tarefas\n\n- [x] primeira\n- [ ] segunda"));
    const article = await openTwo();
    expect(within(article).getByRole("heading", { level: 2, name: TWO_PATH })).toBeTruthy();
    const boxes = within(article).getAllByRole("checkbox") as HTMLInputElement[];
    expect(boxes.map((box) => [box.checked, box.disabled])).toEqual([[true, true], [false, true]]);
    expect(within(article).getByLabelText("Versão")).toBeTruthy();
    expect(get).toHaveBeenCalledWith({ ...SCOPE, artifactId: TWO_ID });
  });

  it("V-40h opens the overview with the manifest rendered", async () => {
    list.mockResolvedValue([{ id: MANIFEST_ID, path: `${FOLDER}/_tasks.md`, versions: [version(1, "spec-to-tasks")] }]);
    get.mockResolvedValue(content(`${FOLDER}/_tasks.md`, 1, "spec-to-tasks", "# Tarefas: Login"));
    render(<TasksStage scope={SCOPE} detail={detailWith([])} reader={false} />);
    await userEvent.click(await screen.findByRole("button", { name: "Visão geral" }));
    const article = await screen.findByRole("article");
    expect(within(article).getByRole("heading", { level: 2, name: `${FOLDER}/_tasks.md` })).toBeTruthy();
    expect(within(article).getByRole("heading", { level: 3, name: "Tarefas: Login" })).toBeTruthy();
    expect(get).toHaveBeenCalledWith({ ...SCOPE, artifactId: MANIFEST_ID });
  });

  it("V-40i loads version 1 on choice and keeps version 2 in the picker", async () => {
    list.mockResolvedValue([{ id: TWO_ID, path: TWO_PATH, versions: [version(1, "spec-to-tasks"), version(2, "plano-de-execucao")] }]);
    get.mockResolvedValue(content(TWO_PATH, 2, "plano-de-execucao", "versão dois"));
    const article = await openTwo();
    const picker = within(article).getByLabelText("Versão") as HTMLSelectElement;
    await waitFor(() => expect(picker.options).toHaveLength(2));
    get.mockResolvedValue(content(TWO_PATH, 1, "spec-to-tasks", "versão um"));
    await userEvent.selectOptions(picker, "1");
    expect(await within(article).findByText("versão um")).toBeTruthy();
    expect([...picker.options].map((option) => option.text)).toEqual(["Versão 2 · Plano de execução", "Versão 1 · spec-to-tasks"]);
  });

  it("V-40j writes the plan skill as Plano de execução in the list, and keeps other skills as they are", async () => {
    const artifacts = [
      { id: "a1", path: "task_01.md", skill: "plano-de-execucao", versions: 2, updatedAt: "2026-11-23T10:00:00.000Z", lastFailure: null },
      { id: "a2", path: "spec.md", skill: "spec-writer", versions: 1, updatedAt: "2026-11-23T10:00:00.000Z", lastFailure: null },
    ];
    render(<ArtifactList artifacts={artifacts} openId={null} onOpen={() => undefined} />);
    expect(screen.getByRole("button", { name: /task_01\.md · Plano de execução · versão 2/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /spec\.md · spec-writer · versão 1/ })).toBeTruthy();
  });
});
