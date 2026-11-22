import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { trpc } from "@/lib/trpc/client";
import { P1, agentSettingsOf, agentViewOf, trpcFailure } from "@/test/projects";
import { ProjectSettings } from "./index";

const update = vi.mocked(trpc.projects.agentSettings.update.mutate);

function block(name: string) {
  return screen.getByRole("form", { name });
}

describe("agent settings section", () => {
  it("V-09b shows a member the values without selects or buttons", () => {
    const settings = agentSettingsOf({ planning: { provider: "codex", model: "gpt-6.1-sol", effort: "medium", version: 1, isDefault: false } });
    render(<ProjectSettings project={P1} canEdit={false} agentSettings={settings} />);
    expect(screen.getByRole("heading", { name: "Agentes" })).toBeTruthy();
    expect(screen.getByText("Codex")).toBeTruthy();
    expect(screen.getByText("gpt-6.1-sol")).toBeTruthy();
    expect(screen.getByText("Médio")).toBeTruthy();
    expect(screen.queryByRole("combobox")).toBeNull();
    expect(screen.getAllByRole("button").map((button) => button.textContent)).toEqual(["Salvar pasta"]);
  });

  it("V-09d warns that a saved model is no longer available", () => {
    const settings = agentSettingsOf({ planning: { provider: "claude", model: "gpt-antigo", isDefault: false, version: 2, modelAvailable: false } });
    render(<ProjectSettings project={P1} canEdit={false} agentSettings={settings} />);
    expect(screen.getByText("Modelo indisponível, escolha outro")).toBeTruthy();
  });

  it("warns the admin about an unavailable model and keeps it selectable until another is chosen", () => {
    const settings = agentSettingsOf({ planning: { provider: "claude", model: "gpt-antigo", isDefault: false, version: 2, modelAvailable: false } });
    render(<ProjectSettings project={P1} canEdit agentSettings={settings} />);
    expect(within(block("Planejamento")).getByText("Modelo indisponível, escolha outro")).toBeTruthy();
    expect((within(block("Planejamento")).getByLabelText("Modelo") as HTMLSelectElement).value).toBe("gpt-antigo");
  });

  it("V-09a saves Planning with Codex, gpt-6.1-sol and Medium with expected version 0 and leaves the Issue Author alone", async () => {
    update.mockResolvedValue(agentViewOf("planning", { provider: "codex", model: "gpt-6.1-sol", effort: "medium", version: 1, isDefault: false }));
    render(<ProjectSettings project={P1} canEdit agentSettings={agentSettingsOf()} />);
    const planning = block("Planejamento");
    await userEvent.selectOptions(within(planning).getByLabelText("Provedor"), "codex");
    expect((within(planning).getByLabelText("Modelo") as HTMLSelectElement).value).toBe("gpt-6.1-sol");
    await userEvent.selectOptions(within(planning).getByLabelText("Esforço"), "medium");
    await userEvent.click(within(planning).getByRole("button", { name: "Salvar Planejamento" }));
    expect(await within(planning).findByText("Planejamento salvo.")).toBeTruthy();
    expect(update).toHaveBeenCalledWith({ projectId: "p1", agent: "planning", provider: "codex", model: "gpt-6.1-sol", effort: "medium", expectedVersion: 0 });
    expect((within(block("Issue Author")).getByLabelText("Provedor") as HTMLSelectElement).value).toBe("claude");
    expect(within(block("Issue Author")).getByText("Padrão")).toBeTruthy();
  });

  it("sends the next save with the version returned by the previous one", async () => {
    update.mockResolvedValueOnce(agentViewOf("issue_author", { model: "opus", version: 1, isDefault: false }));
    update.mockResolvedValueOnce(agentViewOf("issue_author", { model: "haiku", version: 2, isDefault: false }));
    render(<ProjectSettings project={P1} canEdit agentSettings={agentSettingsOf()} />);
    const author = block("Issue Author");
    await userEvent.selectOptions(within(author).getByLabelText("Modelo"), "opus");
    await userEvent.click(within(author).getByRole("button", { name: "Salvar Issue Author" }));
    await within(author).findByText("Issue Author salvo.");
    await userEvent.selectOptions(within(author).getByLabelText("Modelo"), "haiku");
    await userEvent.click(within(author).getByRole("button", { name: "Salvar Issue Author" }));
    await waitFor(() => expect(update).toHaveBeenCalledTimes(2));
    expect(update).toHaveBeenLastCalledWith(expect.objectContaining({ model: "haiku", expectedVersion: 1 }));
  });

  it("V-09c shows the exact conflict message when the version changed", async () => {
    update.mockRejectedValue(trpcFailure("CONFLICT"));
    render(<ProjectSettings project={P1} canEdit agentSettings={agentSettingsOf()} />);
    const planning = block("Planejamento");
    await userEvent.selectOptions(within(planning).getByLabelText("Esforço"), "high");
    await userEvent.click(within(planning).getByRole("button", { name: "Salvar Planejamento" }));
    expect((await within(planning).findByRole("alert")).textContent).toBe("A configuração mudou desde que você abriu a página. Recarregue para ver a versão atual.");
  });

  it("shows the catalog message when the server refuses the choice", async () => {
    update.mockRejectedValue(trpcFailure("BAD_REQUEST"));
    render(<ProjectSettings project={P1} canEdit agentSettings={agentSettingsOf()} />);
    await userEvent.click(within(block("Issue Author")).getByRole("button", { name: "Salvar Issue Author" }));
    expect((await screen.findByRole("alert")).textContent).toBe("Escolha um modelo e um esforço disponíveis para este provedor.");
  });

  it("lists only the providers of the catalog, so a retired Codex simply does not appear", () => {
    const settings = { ...agentSettingsOf(), catalog: { claude: ["sonnet", "opus", "haiku"] } as never };
    render(<ProjectSettings project={P1} canEdit agentSettings={settings} />);
    const options = within(block("Planejamento")).getByLabelText("Provedor").querySelectorAll("option");
    expect([...options].map((option) => option.textContent)).toEqual(["Claude Code"]);
  });
});
