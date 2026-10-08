import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRouter } from "next/navigation";
import { describe, expect, it, vi } from "vitest";
import { trpc } from "@/lib/trpc/client";
import { BLOCKED_READINESS, connectionRow, connectionsPage, initial, softwareFailure } from "@/test/software";
import { SoftwareCompozy } from "./index";

const compozy = trpc.software.compozy;
const readiness = vi.mocked(compozy.readiness.query);
const saveSettings = vi.mocked(compozy.saveSettings.mutate);
const getSettings = vi.mocked(compozy.get.query);
const connectionsQuery = vi.mocked(compozy.connections.query);
const historyQuery = vi.mocked(compozy.history.query);

function renderPage(overrides = {}) {
  readiness.mockResolvedValue(BLOCKED_READINESS);
  connectionsQuery.mockResolvedValue(connectionsPage());
  historyQuery.mockResolvedValue({ items: [], nextCursor: null });
  return render(<SoftwareCompozy initial={initial(overrides)} />);
}

describe("software compozy page", () => {
  it("IT-008 shows four separate readiness groups with next actions and a checked time", async () => {
    renderPage();
    expect(screen.getByRole("status")).toHaveProperty("textContent", expect.stringContaining("Verificando"));
    const groups = await screen.findAllByRole("heading", { level: 3 });
    expect(groups.map((heading) => heading.textContent)).toEqual(["Configuração do aplicativo", "Conexões", "Runtime CompozyOS", "Pré-requisitos do host"]);
    const host = groups[3]!.closest("li")!;
    expect(within(host).getByText("Bloqueado")).toBeTruthy();
    expect(within(host).getByText(/rootless do Podman/)).toBeTruthy();
    expect(within(host).getByText(/Verificado em/)).toBeTruthy();
  });

  it("does not report readiness after a saved form and shows field errors from the server", async () => {
    renderPage();
    await screen.findAllByRole("heading", { level: 3 });
    saveSettings.mockRejectedValueOnce(softwareFailure("BAD_REQUEST", "docs_proxy_https_required", { docsProxyUrl: "Use uma URL HTTPS sem credenciais" }));
    await userEvent.type(screen.getByLabelText("URL HTTPS do proxy de documentação"), "http://docs.example.com");
    await userEvent.click(screen.getByRole("button", { name: "Salvar configurações" }));
    expect(await screen.findByText("Use uma URL HTTPS sem credenciais")).toBeTruthy();
    saveSettings.mockResolvedValueOnce({ revision: 1, settings: { enabled: false, docsProxyUrl: "https://docs.example.com", maxActiveActions: 1 } });
    getSettings.mockResolvedValue({ revision: 1, updatedAt: "2026-10-06T12:01:00.000Z", runtime: { pinnedRelease: "v0.3.0-beta.29" }, settings: { enabled: false, docsProxyUrl: "https://docs.example.com", maxActiveActions: 1 } });
    await userEvent.clear(screen.getByLabelText("URL HTTPS do proxy de documentação"));
    await userEvent.type(screen.getByLabelText("URL HTTPS do proxy de documentação"), "https://docs.example.com");
    await userEvent.click(screen.getByRole("button", { name: "Salvar configurações" }));
    expect(await screen.findByText(/Salvar não torna conexões ou runtime prontos/)).toBeTruthy();
    await waitFor(() => expect(screen.getAllByText("Bloqueado").length).toBeGreaterThan(0));
    expect(screen.queryAllByText("Pronto").length).toBe(1);
  });

  it("IT-019 reloads current settings after a revision conflict", async () => {
    renderPage();
    saveSettings.mockRejectedValueOnce(softwareFailure("CONFLICT", "plan_version_changed"));
    getSettings.mockResolvedValue({ revision: 5, updatedAt: "2026-10-06T12:01:00.000Z", runtime: { pinnedRelease: "v0.3.0-beta.29" }, settings: { enabled: false, docsProxyUrl: "https://novo.example.com", maxActiveActions: 3 } });
    await userEvent.click(screen.getByRole("button", { name: "Salvar configurações" }));
    expect(await screen.findByText(/mudaram em outra sessão/)).toBeTruthy();
    expect(await screen.findByDisplayValue("https://novo.example.com")).toBeTruthy();
  });

  it("IT-004 closes the page when the administrator role is lost", async () => {
    renderPage();
    saveSettings.mockRejectedValueOnce(softwareFailure("FORBIDDEN", "admin_required"));
    await userEvent.click(screen.getByRole("button", { name: "Salvar configurações" }));
    await waitFor(() => expect(vi.mocked(useRouter().replace)).toHaveBeenCalledWith("/projects"));
  });

  it("IT-031 and IT-038 show an empty state without disconnect or guessed defaults", () => {
    renderPage();
    expect(screen.getByText(/Nenhuma conexão ainda/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Desconectar" })).toBeNull();
    expect(screen.getByText("Nenhuma alteração registrada ainda.")).toBeTruthy();
  });

  it("lists connections with provider, identity, readiness, active runs and per-row actions", () => {
    renderPage({ connections: connectionsPage([connectionRow({ activeRuns: 2 })], "next") });
    const row = screen.getByText("Codex principal").closest("li")!;
    expect(within(row).getByText(/Codex \(ChatGPT\) · Conectada · m\*\*\*@example.com/)).toBeTruthy();
    expect(within(row).getByText(/Execuções ativas: 2/)).toBeTruthy();
    expect(within(row).getByRole("button", { name: "Reconectar" })).toBeTruthy();
    expect(within(row).getByRole("button", { name: "Desconectar" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Carregar mais conexões" })).toBeTruthy();
  });
});
