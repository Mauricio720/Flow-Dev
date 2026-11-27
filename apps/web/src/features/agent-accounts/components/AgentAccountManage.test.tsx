import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { trpc } from "@/lib/trpc/client";
import { accountOf } from "@/test/agentAccounts";
import { AgentAccountsPage } from "./AgentAccountsPage";

const rename = vi.mocked(trpc.agentAccounts.rename.mutate);
const remove = vi.mocked(trpc.agentAccounts.remove.mutate);
const CODEX_A = accountOf("a1", { label: "Codex A", provider: "codex", status: "logged_in", version: 3 });
const OPEN_SESSION_MESSAGE = "Esta conta tem 1 sessão não encerrada. Encerre-a antes de remover a conta.";

function rowOf(label: string) {
  return within(screen.getByRole("list", { name: "Contas cadastradas" })).getByRole("listitem", { name: label });
}

describe("rename and remove an AI account", () => {
  it("renames with the account version and shows the new name", async () => {
    rename.mockResolvedValue({ ...CODEX_A, label: "Codex Pessoal", version: 4 });
    render(<AgentAccountsPage initial={[CODEX_A]} />);
    const user = userEvent.setup();
    await user.click(within(rowOf("Codex A")).getByRole("button", { name: "Renomear" }));
    await user.clear(screen.getByLabelText("Novo nome"));
    await user.type(screen.getByLabelText("Novo nome"), "Codex Pessoal");
    await user.click(screen.getByRole("button", { name: "Salvar nome" }));
    expect(rename).toHaveBeenCalledWith({ id: "a1", label: "Codex Pessoal", version: 3 });
    expect(await screen.findByRole("listitem", { name: "Codex Pessoal" })).toBeDefined();
    expect(screen.queryByLabelText("Novo nome")).toBeNull();
  });

  it("keeps the account and shows the refusal when it has open sessions", async () => {
    remove.mockRejectedValue(Object.assign(new Error(OPEN_SESSION_MESSAGE), { data: { code: "CONFLICT" } }));
    render(<AgentAccountsPage initial={[CODEX_A]} />);
    const user = userEvent.setup();
    await user.click(within(rowOf("Codex A")).getByRole("button", { name: "Remover" }));
    await user.click(screen.getByRole("button", { name: "Remover conta" }));
    expect((await within(rowOf("Codex A")).findByRole("alert")).textContent).toBe(OPEN_SESSION_MESSAGE);
    expect(remove).toHaveBeenCalledWith({ id: "a1" });
  });

  it("drops the removed account from the list", async () => {
    remove.mockResolvedValue({ removed: true });
    render(<AgentAccountsPage initial={[CODEX_A, accountOf("a2", { label: "Pessoal" })]} />);
    const user = userEvent.setup();
    await user.click(within(rowOf("Codex A")).getByRole("button", { name: "Remover" }));
    await user.click(screen.getByRole("button", { name: "Remover conta" }));
    expect(await screen.findByRole("listitem", { name: "Pessoal" })).toBeDefined();
    expect(screen.queryByRole("listitem", { name: "Codex A" })).toBeNull();
  });
});
