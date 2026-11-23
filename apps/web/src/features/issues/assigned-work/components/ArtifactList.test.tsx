import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { artifactOf } from "@/test/execution";
import { ArtifactList } from "./ArtifactList";

const SPEC = artifactOf({ id: "a1", path: "docs/specs/login/spec.md", skill: "spec-writer", versions: 1 });
const TASKS = artifactOf({ id: "a2", path: "docs/specs/login/_tasks.md", skill: "spec-to-tasks", versions: 2 });

describe("ArtifactList", () => {
  it("V-18a lists path, skill, version and time, and opens the focused item with Tab and Enter", async () => {
    const onOpen = vi.fn();
    const { container } = render(<ArtifactList artifacts={[SPEC, TASKS]} openId={null} onOpen={onOpen} />);
    expect(screen.getByRole("button", { name: /docs\/specs\/login\/spec\.md · spec-writer · versão 1/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /docs\/specs\/login\/_tasks\.md · spec-to-tasks · versão 2/ })).toBeTruthy();
    expect(container.querySelectorAll("time")).toHaveLength(2);
    await userEvent.tab();
    await userEvent.tab();
    await userEvent.keyboard("{Enter}");
    expect(onOpen).toHaveBeenCalledWith("a2");
  });

  it("V-18e shows the failure reason beside the item and offers no open action without versions", () => {
    const failed = artifactOf({ id: "a3", path: "docs/grande.md", skill: null, versions: 0, lastFailure: "Maior que 1 MB" });
    const missing = artifactOf({ id: "a4", lastFailure: "Arquivo não encontrado no clone" });
    render(<ArtifactList artifacts={[failed, missing]} openId={null} onOpen={vi.fn()} />);
    expect(screen.getByText("Maior que 1 MB")).toBeTruthy();
    expect(screen.getByText("Arquivo não encontrado no clone")).toBeTruthy();
    expect(screen.getByText("docs/grande.md")).toBeTruthy();
    expect(screen.getAllByRole("button")).toHaveLength(1);
    expect(screen.getAllByRole("note")).toHaveLength(2);
  });
});
