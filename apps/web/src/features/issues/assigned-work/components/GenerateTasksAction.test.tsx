import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { trpc } from "@/lib/trpc/client";
import { approvedDetail } from "@/test/tasks";
import { specOf } from "@/test/taskSet";
import { CODEX_REASON, OPUS_MAX, preflightOf } from "@/test/terminal";
import type { TaskDetail } from "../contract";
import { GenerateTasksAction } from "./GenerateTasksAction";

const preflight = vi.mocked(trpc.tasks.terminal.preflight.query);
const open = vi.mocked(trpc.tasks.terminal.open.mutate);
const NEWER = specOf("docs/specs/b/spec.md");
const OLDER = { ...specOf("docs/specs/a/spec.md"), artifactId: "00000000-0000-4000-8000-0000000000a2" };
const generation = (path: string) => `/flow-dev:spec-to-tasks Quebre em tarefas a spec ${path}. Salve os arquivos na pasta dela e pare para minha revisão. Não implemente.`;

async function openDialog(specs = [NEWER], detail: TaskDetail = approvedDetail()) {
  render(<GenerateTasksAction detail={detail} specs={specs} onOpened={vi.fn()} />);
  await userEvent.click(screen.getByRole("button", { name: "Gerar tarefas" }));
  const dialog = await screen.findByRole("dialog", { name: "Gerar as tarefas da spec" });
  await within(dialog).findByLabelText("Prompt");
  return dialog;
}

describe("GenerateTasksAction", () => {
  it("V-40k opens with Claude Code, Opus and Maximum and the editable prompt, and opens with the changed choice", async () => {
    preflight.mockResolvedValue(preflightOf({ prompt: generation("docs/specs/b/spec.md"), choice: OPUS_MAX }));
    open.mockResolvedValue({ sessionId: "s1", unavailableIssueImages: 0 });
    const dialog = await openDialog();
    expect((within(dialog).getByRole("radio", { name: "Claude Code" }) as HTMLInputElement).checked).toBe(true);
    expect((within(dialog).getByLabelText("Modelo") as HTMLSelectElement).value).toBe("opus");
    expect((within(dialog).getByLabelText("Esforço") as HTMLSelectElement).value).toBe("max");
    expect((within(dialog).getByLabelText("Prompt") as HTMLTextAreaElement).value).toBe(generation("docs/specs/b/spec.md"));
    await userEvent.selectOptions(within(dialog).getByLabelText("Modelo"), "sonnet");
    await userEvent.selectOptions(within(dialog).getByLabelText("Esforço"), "high");
    await userEvent.click(within(dialog).getByRole("button", { name: "Iniciar sessão" }));
    await waitFor(() => expect(open).toHaveBeenCalledOnce());
    expect(open.mock.calls[0]![0]).toMatchObject({ purpose: { kind: "generate_tasks", specArtifactId: NEWER.artifactId, choice: { agent: "claude", model: "sonnet", effort: "high" } } });
  });

  it("V-40l asks which spec to break down with the newest selected, and reloads the prompt when another is chosen", async () => {
    preflight.mockImplementation(async (input) => preflightOf({ prompt: generation(input.purpose?.kind === "generate_tasks" && input.purpose.specArtifactId === OLDER.artifactId ? "docs/specs/a/spec.md" : "docs/specs/b/spec.md"), choice: OPUS_MAX }));
    const dialog = await openDialog([NEWER, OLDER]);
    const picker = within(dialog).getByLabelText("Spec") as HTMLSelectElement;
    expect(picker.value).toBe(NEWER.artifactId);
    expect((within(dialog).getByLabelText("Prompt") as HTMLTextAreaElement).value).toContain("docs/specs/b/spec.md");
    await userEvent.selectOptions(picker, OLDER.artifactId);
    await waitFor(() => expect((within(dialog).getByLabelText("Prompt") as HTMLTextAreaElement).value).toContain("docs/specs/a/spec.md"));
    expect(preflight).toHaveBeenLastCalledWith(expect.objectContaining({ purpose: { kind: "generate_tasks", specArtifactId: OLDER.artifactId } }));
  });

  it("V-40l does not ask when there is only one spec", async () => {
    preflight.mockResolvedValue(preflightOf({ prompt: generation("docs/specs/b/spec.md"), choice: OPUS_MAX }));
    const dialog = await openDialog([NEWER]);
    expect(within(dialog).queryByLabelText("Spec")).toBeNull();
  });

  it("V-40m shows the Codex disabled with its reason, and offers no button to a person who cannot open sessions", async () => {
    preflight.mockResolvedValue(preflightOf({ prompt: generation("docs/specs/b/spec.md"), choice: OPUS_MAX }));
    const dialog = await openDialog();
    expect((within(dialog).getByRole("radio", { name: /^Codex/ }) as HTMLInputElement).disabled).toBe(true);
    expect(within(dialog).getByText(CODEX_REASON)).toBeTruthy();
    const reader = approvedDetail({}, false);
    const { container } = render(<GenerateTasksAction detail={reader} specs={[NEWER]} onOpened={vi.fn()} />);
    expect(within(container).queryByRole("button", { name: "Gerar tarefas" })).toBeNull();
  });

  it("regenerates with a confirmation and offers the spec of the set folder first, even when another spec is newer", async () => {
    preflight.mockResolvedValue(preflightOf({ prompt: generation("docs/specs/a/spec.md"), choice: OPUS_MAX }));
    render(<GenerateTasksAction detail={approvedDetail()} specs={[NEWER, OLDER]} onOpened={vi.fn()} regenerate={{ folder: "docs/specs/a" }} />);
    await userEvent.click(screen.getByRole("button", { name: "Gerar tarefas de novo" }));
    expect(within(screen.getByRole("alert")).getByText(/^Gerar de novo escreve/).textContent).toBe("Gerar de novo escreve outra vez os arquivos de tarefa de docs/specs/a. O status e o registro de execução desses arquivos podem voltar ao começo; as versões já capturadas continuam acessíveis. Gerar de novo?");
    expect(screen.queryByRole("dialog")).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Gerar de novo" }));
    const dialog = await screen.findByRole("dialog", { name: "Gerar as tarefas da spec" });
    await within(dialog).findByLabelText("Prompt");
    expect((within(dialog).getByLabelText("Spec") as HTMLSelectElement).value).toBe(OLDER.artifactId);
    expect(preflight).toHaveBeenCalledWith(expect.objectContaining({ purpose: { kind: "generate_tasks", specArtifactId: OLDER.artifactId } }));
  });

  it("does not open the dialog when the regeneration is not confirmed", async () => {
    render(<GenerateTasksAction detail={approvedDetail()} specs={[NEWER]} onOpened={vi.fn()} regenerate={{ folder: "docs/specs/b" }} />);
    await userEvent.click(screen.getByRole("button", { name: "Gerar tarefas de novo" }));
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("button", { name: "Gerar tarefas de novo" })).toBeTruthy();
  });
});
