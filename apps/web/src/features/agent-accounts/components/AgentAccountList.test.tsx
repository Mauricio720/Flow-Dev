import { act, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ShellHeader } from "@/features/projects/project-shell/components/ShellHeader";
import { trpc } from "@/lib/trpc/client";
import { accountOf } from "@/test/agentAccounts";
import { P1 } from "@/test/projects";
import { BACKGROUND_CHECK_REREAD_MS } from "../hooks/useAgentAccounts";
import { AgentAccountsPage } from "./AgentAccountsPage";

const list = vi.mocked(trpc.agentAccounts.list.query);
const PENDING = accountOf("a1", { label: "Pessoal" });
const LOGGED = accountOf("a2", { label: "Trabalho", status: "logged_in", identity: "ana@exemplo.com", plan: "max" });
const LOGGED_OUT = accountOf("a3", { label: "Codex A", provider: "codex", status: "logged_out" });
const FAILED = accountOf("a4", { label: "Codex B", provider: "codex", status: "check_failed" });

function rowOf(label: string) {
  return within(screen.getByRole("list", { name: "Contas cadastradas" })).getByRole("listitem", { name: label });
}

describe("V-11a AI accounts page", () => {
  it("shows the name, the provider and the state in text for each account", () => {
    render(<AgentAccountsPage initial={[PENDING, LOGGED, LOGGED_OUT, FAILED]} />);
    expect(rowOf("Pessoal").textContent).toContain("Claude Code");
    expect(within(rowOf("Pessoal")).getByText("Aguardando login")).toBeDefined();
    expect(within(rowOf("Trabalho")).getByText("Logada")).toBeDefined();
    expect(within(rowOf("Codex A")).getByText("Deslogada")).toBeDefined();
    expect(rowOf("Codex A").textContent).toContain("Codex");
    expect(within(rowOf("Codex B")).getByText("Falha na verificação")).toBeDefined();
  });

  it("shows the e-mail and the plan of the logged Claude account only", () => {
    render(<AgentAccountsPage initial={[PENDING, LOGGED]} />);
    expect(within(rowOf("Trabalho")).getByText("ana@exemplo.com")).toBeDefined();
    expect(rowOf("Trabalho").textContent).toContain("Plano max");
    expect(rowOf("Pessoal").textContent).not.toContain("Plano");
  });

  it("re-reads the list after the background check and shows the new state", async () => {
    vi.useFakeTimers();
    list.mockResolvedValue([{ ...PENDING, status: "logged_in", identity: "ana@exemplo.com", plan: "pro" }]);
    render(<AgentAccountsPage initial={[PENDING]} />);
    expect(within(rowOf("Pessoal")).getByText("Aguardando login")).toBeDefined();
    await act(async () => { await vi.advanceTimersByTimeAsync(BACKGROUND_CHECK_REREAD_MS); });
    expect(list).toHaveBeenCalledTimes(1);
    expect(within(rowOf("Pessoal")).getByText("Logada")).toBeDefined();
  });

  it("tells that the default login is used when there are no accounts", () => {
    render(<AgentAccountsPage initial={[]} />);
    expect(screen.getByText("Nenhuma conta cadastrada ainda. Sem contas, as sessões usam o login padrão desta máquina.")).toBeDefined();
  });

  it("links the shell header to the AI accounts page", () => {
    render(<ShellHeader project={P1} section="issues" drawer={null} />);
    expect(screen.getByRole("link", { name: "Contas de IA" }).getAttribute("href")).toBe("/settings/ai-accounts");
  });
});
