import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { connectionOf } from "@/test/taskFlow";
import { RuntimePicker } from "./RuntimePicker";

describe("OpenCode runtime choice", () => {
  it("shows the provider and full IDs for models with the same name", async () => {
    const onChange = vi.fn();
    const connection = connectionOf({
      id: "local-opencode",
      label: "OpenCode local",
      providerKind: "opencode",
      executionTarget: "machine",
      machineId: "machine-1",
      models: [
        { modelId: "opencode-go/claude-sonnet-4-5", displayName: "Claude Sonnet 4.5", selectable: true, unselectableReason: null, reasoningChoices: [null] },
        { modelId: "anthropic/claude-sonnet-4-5", displayName: "Claude Sonnet 4.5", selectable: true, unselectableReason: null, reasoningChoices: [null] },
      ],
    });
    const view = render(<RuntimePicker idPrefix="test" connections={[connection]} value={null} disabled={false} onChange={onChange} />);
    expect(within(screen.getByLabelText("Conexão")).getByRole("option", { name: "OpenCode local" })).toBeTruthy();
    await userEvent.selectOptions(screen.getByLabelText("Conexão"), "local-opencode");
    expect(onChange).toHaveBeenCalledWith({ connectionId: "local-opencode", modelId: "", reasoningEffort: null });
    view.rerender(<RuntimePicker idPrefix="test" connections={[connection]} value={{ connectionId: "local-opencode", modelId: "", reasoningEffort: null }} disabled={false} onChange={onChange} />);
    const models = within(screen.getByLabelText("Modelo"));
    expect(models.getByRole("option", { name: "Claude Sonnet 4.5 (opencode-go/claude-sonnet-4-5)" })).toBeTruthy();
    expect(models.getByRole("option", { name: "Claude Sonnet 4.5 (anthropic/claude-sonnet-4-5)" })).toBeTruthy();
    await userEvent.selectOptions(screen.getByLabelText("Modelo"), "opencode-go/claude-sonnet-4-5");
    expect(onChange).toHaveBeenLastCalledWith({ connectionId: "local-opencode", modelId: "opencode-go/claude-sonnet-4-5", reasoningEffort: null });
  });
});
