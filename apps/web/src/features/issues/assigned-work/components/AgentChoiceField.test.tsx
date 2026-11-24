import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AGENTS, CODEX_REASON, OPUS_MAX } from "@/test/terminal";
import type { AgentOption } from "../terminalContract";
import { AgentChoiceField } from "./AgentChoiceField";

const CODEX_ENABLED: AgentOption = { agent: "codex", available: true, reason: null, models: ["gpt-6.1", "gpt-6.1-sol"], efforts: ["low", "medium", "high"], modelOptions: [
  { id: "gpt-6.1", label: "GPT-6.1", isDefault: false, efforts: ["medium"], defaultEffort: "medium" },
  { id: "gpt-6.1-sol", label: "GPT-6.1 Sol", isDefault: true, efforts: ["medium", "high"], defaultEffort: "medium" },
] };

describe("AgentChoiceField", () => {
  it("V-40k shows the agent, the model and the effort as selected, with the labels of the spec", () => {
    render(<AgentChoiceField agents={AGENTS} value={OPUS_MAX} onChange={vi.fn()} />);
    expect((screen.getByRole("radio", { name: "Claude Code" }) as HTMLInputElement).checked).toBe(true);
    expect((screen.getByLabelText("Modelo") as HTMLSelectElement).selectedOptions[0]!.text).toBe("Opus");
    expect((screen.getByLabelText("Esforço") as HTMLSelectElement).selectedOptions[0]!.text).toBe("Máximo");
    expect([...(screen.getByLabelText("Esforço") as HTMLSelectElement).options].map((option) => option.text)).toEqual(["Baixo", "Médio", "Alto", "Muito alto", "Máximo"]);
    expect([...(screen.getByLabelText("Modelo") as HTMLSelectElement).options].map((option) => option.text)).toEqual(["Opus", "Sonnet", "Haiku"]);
  });

  it("V-40k changes the model and the effort from the keyboard, keeping the rest of the choice", async () => {
    const onChange = vi.fn();
    render(<AgentChoiceField agents={AGENTS} value={OPUS_MAX} onChange={onChange} />);
    await userEvent.selectOptions(screen.getByLabelText("Modelo"), "sonnet");
    expect(onChange).toHaveBeenLastCalledWith({ agent: "claude", model: "sonnet", effort: "max" });
    await userEvent.selectOptions(screen.getByLabelText("Esforço"), "high");
    expect(onChange).toHaveBeenLastCalledWith({ agent: "claude", model: "opus", effort: "high" });
  });

  it("V-40m disables the unavailable agent and ties the reason to its option", () => {
    render(<AgentChoiceField agents={AGENTS} value={OPUS_MAX} onChange={vi.fn()} />);
    const codex = screen.getByRole("radio", { name: /^Codex/ }) as HTMLInputElement;
    expect(codex.disabled).toBe(true);
    const reason = document.getElementById(codex.getAttribute("aria-describedby")!);
    expect(reason?.textContent).toBe(CODEX_REASON);
  });

  it("V-51f selects Codex's published default model and its highest supported effort", async () => {
    const onChange = vi.fn();
    const view = render(<AgentChoiceField agents={[AGENTS[0]!, CODEX_ENABLED]} value={OPUS_MAX} onChange={onChange} />);
    await userEvent.click(screen.getByRole("radio", { name: "Codex" }));
    expect(onChange).toHaveBeenCalledWith({ agent: "codex", model: "gpt-6.1-sol", effort: "high" });
    view.rerender(<AgentChoiceField agents={[AGENTS[0]!, CODEX_ENABLED]} value={{ agent: "codex", model: "gpt-6.1-sol", effort: "high" }} onChange={onChange} />);
    expect((screen.getByLabelText("Modelo") as HTMLSelectElement).options[0]?.text).toBe("GPT-6.1");
    expect((screen.getByLabelText("Esforço") as HTMLSelectElement).options[1]?.text).toBe("Alto");
  });

  it("V-51f filters effort choices by model and preserves an effort that remains supported", async () => {
    const onChange = vi.fn();
    render(<AgentChoiceField agents={[AGENTS[0]!, CODEX_ENABLED]} value={{ agent: "codex", model: "gpt-6.1-sol", effort: "high" }} onChange={onChange} />);
    await userEvent.selectOptions(screen.getByLabelText("Modelo"), "gpt-6.1");
    expect(onChange).toHaveBeenLastCalledWith({ agent: "codex", model: "gpt-6.1", effort: "medium" });
  });

  it("V-51g keeps a saved Codex model that disappeared and explains how to recover", () => {
    render(<AgentChoiceField agents={[AGENTS[0]!, CODEX_ENABLED]} value={{ agent: "codex", model: "removed-model", effort: "high" }} onChange={vi.fn()} />);
    expect(screen.getByRole("alert").textContent).toBe("O modelo removed-model não está mais disponível no Codex. Troque o modelo da sessão.");
    expect((screen.getByLabelText("Modelo") as HTMLSelectElement).value).toBe("removed-model");
  });

  it("writes only the label, with no controls, when it is read-only, and names an unknown model by its technical name", () => {
    render(<AgentChoiceField agents={AGENTS} value={{ agent: "claude", model: "opus", effort: "xhigh" }} readOnly />);
    expect(screen.getByText("Claude Code · Opus · Muito alto")).toBeTruthy();
    expect(screen.queryByRole("radio")).toBeNull();
    expect(screen.queryByRole("combobox")).toBeNull();
    const view = render(<AgentChoiceField agents={AGENTS} value={{ agent: "codex", model: "gpt-6.1-sol", effort: "high" }} readOnly />);
    expect(within(view.container).getByText("Codex · gpt-6.1-sol · Alto")).toBeTruthy();
  });
});
