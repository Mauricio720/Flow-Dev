import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { trpc } from "@/lib/trpc/client";
import { BLOCKED_READINESS, connectionRow, connectionsPage, initial, softwareFailure } from "@/test/software";
import { SoftwareCompozy } from "./index";

const compozy = trpc.software.compozy;
const START = { state: "started" as const, operationId: "op1", connectionId: "c1", connectionRevision: 1, verificationUrl: "https://auth.example/device", userCode: "ABCD-1234", expiresAt: "2026-10-06T12:10:00.000Z" };

function renderPage() {
  vi.mocked(compozy.readiness.query).mockResolvedValue(BLOCKED_READINESS);
  vi.mocked(compozy.connections.query).mockResolvedValue(connectionsPage([connectionRow({ authState: "unconnected", accountLabel: null, readiness: { state: "blocked", blockedBy: "connection", reasonCode: "auth_required", selectableModels: 0 } })]));
  vi.mocked(compozy.history.query).mockResolvedValue({ items: [], nextCursor: null });
  vi.mocked(compozy.get.query).mockResolvedValue(initial().settings);
  return render(<SoftwareCompozy initial={initial({ connections: connectionsPage([connectionRow({ authState: "unconnected", accountLabel: null })]) })} />);
}

async function tick() {
  await act(async () => { await vi.advanceTimersByTimeAsync(3100); });
}

describe("codex device login dialog", () => {
  it("IT-022 shows the code, polls to confirmation and connects without any token field", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    renderPage();
    vi.mocked(compozy.beginCodexLogin.mutate).mockResolvedValue(START);
    vi.mocked(compozy.pollLogin.mutate).mockResolvedValueOnce({ state: "pending" }).mockResolvedValueOnce({ state: "awaiting_confirmation", identityLabel: "m***@example.com", differsFromCurrent: true });
    vi.mocked(compozy.confirmAccount.mutate).mockResolvedValue({ connectionId: "c1", authState: "connected", revision: 2, identityLabel: "m***@example.com" });
    await userEvent.click(screen.getByRole("button", { name: "Conectar" }));
    expect(await screen.findByLabelText("Código de verificação")).toHaveProperty("textContent", "ABCD-1234");
    expect(screen.queryByLabelText(/token|chave de api/i)).toBeNull();
    await tick();
    expect(screen.getByText(/Aguardando a autorização/)).toBeTruthy();
    await tick();
    expect(await screen.findByText(/conta diferente/)).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Confirmar conta" }));
    expect(await screen.findByText(/Conta conectada: m\*\*\*@example.com/)).toBeTruthy();
    expect(compozy.confirmAccount.mutate).toHaveBeenCalledWith({ operationId: "op1", expectedConnectionRevision: 1 });
  });

  it("IT-023 ends in an honest failed state and keeps retry available when authorization expires", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    renderPage();
    vi.mocked(compozy.beginCodexLogin.mutate).mockResolvedValue(START);
    vi.mocked(compozy.pollLogin.mutate).mockResolvedValue({ state: "expired", code: "login_expired" });
    await userEvent.click(screen.getByRole("button", { name: "Conectar" }));
    await tick();
    expect(await screen.findByText(/A autorização expirou/)).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Fechar" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(screen.getByRole("button", { name: "Conectar" })).toBeTruthy();
  });

  it("IT-079 explains that a Claude connection needs host assistance and claims nothing was connected", async () => {
    renderPage();
    vi.mocked(compozy.beginClaudeLogin.mutate).mockResolvedValue({ state: "setup_required", operationId: "op2", connectionId: "c2", connectionRevision: 2 });
    await userEvent.type(screen.getByLabelText("Nome da nova conexão"), "Claude pessoal");
    await userEvent.click(screen.getByRole("button", { name: "Adicionar Claude" }));
    expect(await screen.findByText(/exige ajuda do host/)).toBeTruthy();
    expect(screen.queryByText(/Conta conectada/)).toBeNull();
    expect(compozy.beginClaudeLogin.mutate).toHaveBeenCalledWith(expect.objectContaining({ label: "Claude pessoal" }));
    expect(compozy.beginCodexLogin.mutate).not.toHaveBeenCalled();
  });

  it("IT-026 explains an overlapping login attempt", async () => {
    renderPage();
    vi.mocked(compozy.beginCodexLogin.mutate).mockRejectedValue(softwareFailure("CONFLICT", "login_in_progress"));
    await userEvent.click(screen.getByRole("button", { name: "Conectar" }));
    expect(await screen.findByText(/autenticação em andamento/)).toBeTruthy();
  });
});
