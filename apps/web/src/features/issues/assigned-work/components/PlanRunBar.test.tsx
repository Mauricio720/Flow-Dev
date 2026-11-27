import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { trpc } from "@/lib/trpc/client";
import { planItemOf, planOf } from "@/test/plan";
import { A, B, mountEditor, removeFromSession, twoSessions } from "@/test/planEditor";
import { terminalRejection } from "@/test/terminal";

const start = vi.mocked(trpc.tasks.plan.run.start.mutate);
const run = (patch = {}) => ({ state: "running" as const, reason: null, pausedBy: null, currentItemId: A, revision: 2, ...patch });
const region = () => screen.queryByRole("region", { name: "Execução do plano" });
const button = (name: string) => screen.queryByRole("button", { name });

beforeEach(() => void vi.useFakeTimers({ shouldAdvanceTime: true }));

describe("PlanRunBar", () => {
  it("V-09c offers Executar o plano only with a never started session, no unsaved change and no active run", async () => {
    await mountEditor(twoSessions());
    expect(button("Executar o plano")).toBeTruthy();
    await removeFromSession(1, "Tela");
    expect(button("Executar o plano")).toBeNull();
  });

  it("V-09c hides it while a run is running or paused, and when every session was started", async () => {
    await mountEditor(twoSessions({ run: run({ state: "paused", pausedBy: "Ana" }) }));
    expect(button("Executar o plano")).toBeNull();
    await mountEditor(planOf([planItemOf(A, ["task_01"], { started: true, state: "running" })]));
    expect(screen.getAllByRole("button", { name: "Salvar" })).toBeTruthy();
    expect(button("Executar o plano")).toBeNull();
  });

  it("V-09d shows the running session in a status region and offers Pausar", async () => {
    await mountEditor(twoSessions({ run: run() }));
    expect(within(region()!).getByRole("status").textContent).toBe("Executando · Sessão 1");
    expect(button("Pausar")).toBeTruthy();
  });

  it("V-09e shows who paused with Retomar, and the reason of an automatic pause", async () => {
    await mountEditor(twoSessions({ run: run({ state: "paused", pausedBy: "Ana", currentItemId: null }) }));
    expect(within(region()!).getByRole("status").textContent).toBe("Pausada por Ana");
    expect(button("Retomar")).toBeTruthy();
    await mountEditor(planOf([planItemOf(B, ["task_02"])], { run: run({ state: "paused", reason: "Não foi possível iniciar a Sessão 2. O serviço de sessões do Flow Dev não está rodando. Inicie o Flow Dev com pnpm dev e tente de novo." }) }));
    expect(screen.getAllByRole("status").map((node) => node.textContent)).toContain("Pausada: Não foi possível iniciar a Sessão 2. O serviço de sessões do Flow Dev não está rodando. Inicie o Flow Dev com pnpm dev e tente de novo.");
  });

  it("V-09f shows the refusal of the server in an alert and no run state", async () => {
    start.mockRejectedValue(terminalRejection("plan_run_session_empty", "A Sessão 2 está sem tarefas. Adicione tarefas ou remova a sessão.", "PRECONDITION_FAILED"));
    await mountEditor(twoSessions());
    await userEvent.click(button("Executar o plano")!);
    expect((await within(region()!).findByRole("alert")).textContent).toBe("A Sessão 2 está sem tarefas. Adicione tarefas ou remova a sessão.");
    expect(within(region()!).queryByRole("status")).toBeNull();
  });

  it("V-09g lets a member read the run state without any run button, and shows Plano concluído", async () => {
    await mountEditor(twoSessions({ run: run(), canEdit: false }));
    expect(within(region()!).getByRole("status").textContent).toBe("Executando · Sessão 1");
    for (const name of ["Executar o plano", "Pausar", "Retomar"]) expect(button(name)).toBeNull();
    await mountEditor(twoSessions({ run: run({ state: "completed", currentItemId: null }), canEdit: false }));
    expect(screen.getAllByRole("status").map((node) => node.textContent)).toContain("Plano concluído");
  });
});
