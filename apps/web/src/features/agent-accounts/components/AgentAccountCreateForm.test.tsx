import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { trpc } from "@/lib/trpc/client";
import { accountOf } from "@/test/agentAccounts";
import { AgentAccountsPage } from "./AgentAccountsPage";

const create = vi.mocked(trpc.agentAccounts.create.mutate);
const verify = vi.mocked(trpc.agentAccounts.verify.mutate);
const PERSONAL = accountOf("a1", { label: "Pessoal" });
const LOGIN_COMMAND = "CLAUDE_CONFIG_DIR='/home/ana/.local/state/flow-dev/agent-accounts/a1' claude auth login";
const DUPLICATE_MESSAGE = "Você já tem uma conta do Claude Code com esse nome";

function rowOf(label: string) {
  return within(screen.getByRole("list", { name: "Contas cadastradas" })).getByRole("listitem", { name: label });
}

function stubClipboard(user: ReturnType<typeof userEvent.setup>) {
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(window.navigator, "clipboard", { configurable: true, value: { writeText } });
  return { user, writeText };
}

async function createPersonal(user: ReturnType<typeof userEvent.setup>) {
  await user.selectOptions(screen.getByLabelText("Provedor"), "Claude Code");
  await user.type(screen.getByLabelText("Nome da conta"), "Pessoal");
  await user.click(screen.getByRole("button", { name: "Cadastrar conta" }));
}

describe("V-11b register, login command and verification", () => {
  it("shows the new account waiting for login with the command to copy", async () => {
    create.mockResolvedValue(PERSONAL);
    render(<AgentAccountsPage initial={[]} />);
    const { user, writeText } = stubClipboard(userEvent.setup());
    await createPersonal(user);
    expect(create).toHaveBeenCalledWith({ provider: "claude", label: "Pessoal" });
    expect(within(rowOf("Pessoal")).getByText("Aguardando login")).toBeDefined();
    expect(within(rowOf("Pessoal")).getByText(LOGIN_COMMAND)).toBeDefined();
    await user.click(within(rowOf("Pessoal")).getByRole("button", { name: "Copiar comando" }));
    expect(writeText).toHaveBeenCalledWith(LOGIN_COMMAND);
    expect(within(rowOf("Pessoal")).getByRole("status").textContent).toBe("Comando copiado");
    expect((screen.getByLabelText("Nome da conta") as HTMLInputElement).value).toBe("");
  });

  it("shows the duplicate name refusal next to the name field", async () => {
    create.mockRejectedValue(Object.assign(new Error(DUPLICATE_MESSAGE), { data: { code: "CONFLICT" } }));
    render(<AgentAccountsPage initial={[accountOf("a0", { label: "pessoal" })]} />);
    const user = userEvent.setup();
    await createPersonal(user);
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toBe(DUPLICATE_MESSAGE);
    expect(screen.getByLabelText("Nome da conta").getAttribute("aria-describedby")).toBe(alert.id);
    expect((screen.getByLabelText("Nome da conta") as HTMLInputElement).value).toBe("Pessoal");
  });

  it("verifies the login and shows the new state without the login command", async () => {
    verify.mockResolvedValue({ ...PERSONAL, status: "logged_in", identity: "ana@exemplo.com", plan: "max" });
    render(<AgentAccountsPage initial={[PERSONAL]} />);
    const user = userEvent.setup();
    await user.click(within(rowOf("Pessoal")).getByRole("button", { name: "Verificar login" }));
    expect(verify).toHaveBeenCalledWith({ id: "a1" });
    expect(await within(rowOf("Pessoal")).findByText("Logada")).toBeDefined();
    expect(within(rowOf("Pessoal")).getByText("ana@exemplo.com")).toBeDefined();
    expect(within(rowOf("Pessoal")).queryByRole("button", { name: "Copiar comando" })).toBeNull();
  });

  it("keeps the login command for a logged out account", () => {
    render(<AgentAccountsPage initial={[{ ...PERSONAL, status: "logged_out" }]} />);
    expect(within(rowOf("Pessoal")).getByText("Deslogada")).toBeDefined();
    expect(within(rowOf("Pessoal")).getByRole("button", { name: "Copiar comando" })).toBeDefined();
  });
});
