import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { trpc } from "@/lib/trpc/client";
import { CART_PROJECT, T, publishedDetail } from "@/test/tasks";
import { snapshotOf } from "@/test/work";
import { PERSONAL, WORK, WORK_ID, chosen, defaultChoice, workAccountsOf } from "@/test/workAccounts";
import { WorkAccountsScope } from "./WorkAccountsScope";
import { WorkAccountsSection } from "./WorkAccountsSection";
import { WorkDetail } from "./WorkDetail";

const get = vi.mocked(trpc.tasks.workAccounts.get.query);
const set = vi.mocked(trpc.tasks.workAccounts.set.mutate);
const STALE = "A escolha mudou; recarregue";

function renderSection() {
  return render(<WorkAccountsScope taskId={T} operate><WorkAccountsSection /></WorkAccountsScope>);
}

function optionTexts(select: HTMLElement) {
  return within(select).getAllByRole("option").map((option) => option.textContent);
}

describe("V-11c work accounts section", () => {
  it("lists the default login and the operator's Claude accounts with their state in text", async () => {
    get.mockResolvedValue(workAccountsOf({ options: { claude: [PERSONAL, WORK], codex: [] } }));
    renderSection();
    const select = await screen.findByRole("combobox", { name: "Conta do Claude Code" });
    expect(get).toHaveBeenCalledWith({ taskId: T });
    expect(optionTexts(select)).toEqual(["Login padrão desta máquina", "Pessoal · Logada", "Trabalho · Deslogada"]);
    expect((select as HTMLSelectElement).value).toBe("");
    expect(screen.getByRole("combobox", { name: "Conta do Codex" })).toBeDefined();
  });

  it("reaches the selector by keyboard", async () => {
    get.mockResolvedValue(workAccountsOf({ options: { claude: [PERSONAL, WORK], codex: [] } }));
    renderSection();
    const select = await screen.findByRole("combobox", { name: "Conta do Claude Code" });
    await userEvent.tab();
    expect(document.activeElement).toBe(select);
  });

  it("offers only the default login and a link to register accounts when there are none", async () => {
    get.mockResolvedValue(workAccountsOf());
    renderSection();
    const select = await screen.findByRole("combobox", { name: "Conta do Claude Code" });
    expect(optionTexts(select)).toEqual(["Login padrão desta máquina"]);
    const links = screen.getAllByRole("link", { name: "Cadastrar contas" });
    expect(links.map((link) => link.getAttribute("href"))).toEqual(["/settings/ai-accounts", "/settings/ai-accounts"]);
  });

  it("does not show the section nor read the choice for a person who only reads the work", () => {
    render(<WorkDetail project={CART_PROJECT} initial={{ taskId: T, work: { kind: "ready", snapshot: snapshotOf({ viewerCanOperate: false, reason: "operator_required" }, publishedDetail()) } }} />);
    expect(screen.queryByRole("heading", { name: "Contas deste trabalho" })).toBeNull();
    expect(get).not.toHaveBeenCalled();
  });

  it("shows the section to the operator on the work screen", async () => {
    get.mockResolvedValue(workAccountsOf({ options: { claude: [PERSONAL], codex: [] } }));
    render(<WorkDetail project={CART_PROJECT} initial={{ taskId: T, work: { kind: "ready", snapshot: snapshotOf({}, publishedDetail()) } }} />);
    expect(await screen.findByRole("heading", { name: "Contas deste trabalho" })).toBeDefined();
  });
});

describe("V-11d saving the work account choice", () => {
  it("saves the chosen account with the version read and shows the new choice", async () => {
    get.mockResolvedValueOnce(workAccountsOf({ options: { claude: [PERSONAL, WORK], codex: [] }, version: 2 }));
    get.mockResolvedValueOnce(workAccountsOf({ choices: [chosen(WORK), defaultChoice("codex")], options: { claude: [PERSONAL, WORK], codex: [] }, version: 3 }));
    set.mockResolvedValue(chosen(WORK));
    renderSection();
    const select = await screen.findByRole("combobox", { name: "Conta do Claude Code" });
    await userEvent.selectOptions(select, "Trabalho · Deslogada");
    expect(set).toHaveBeenCalledWith({ taskId: T, provider: "claude", accountId: WORK_ID, version: 2 });
    await vi.waitFor(() => expect((select as HTMLSelectElement).value).toBe(WORK_ID));
    expect(get).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("tells that the choice changed and reads it again when the version is stale", async () => {
    get.mockResolvedValueOnce(workAccountsOf({ options: { claude: [PERSONAL, WORK], codex: [] }, version: 1 }));
    get.mockResolvedValueOnce(workAccountsOf({ choices: [chosen(PERSONAL), defaultChoice("codex")], options: { claude: [PERSONAL, WORK], codex: [] }, version: 2 }));
    set.mockRejectedValue(Object.assign(new Error(STALE), { data: { code: "CONFLICT" } }));
    renderSection();
    const select = await screen.findByRole("combobox", { name: "Conta do Claude Code" });
    await userEvent.selectOptions(select, "Trabalho · Deslogada");
    expect((await screen.findByRole("alert")).textContent).toBe(STALE);
    expect(get).toHaveBeenCalledTimes(2);
    await vi.waitFor(() => expect((select as HTMLSelectElement).value).toBe(PERSONAL.id));
  });

  it("goes back to the default login by choosing it", async () => {
    get.mockResolvedValue(workAccountsOf({ choices: [chosen(WORK), defaultChoice("codex")], options: { claude: [WORK], codex: [] }, version: 4 }));
    set.mockResolvedValue(defaultChoice("claude"));
    renderSection();
    await userEvent.selectOptions(await screen.findByRole("combobox", { name: "Conta do Claude Code" }), "Login padrão desta máquina");
    expect(set).toHaveBeenCalledWith({ taskId: T, provider: "claude", accountId: null, version: 4 });
  });
});

