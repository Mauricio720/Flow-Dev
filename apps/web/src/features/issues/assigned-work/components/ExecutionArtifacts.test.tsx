import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { trpc } from "@/lib/trpc/client";
import { artifactOf, detailWith, eventOf, sessionOf } from "@/test/execution";
import { ExecutionStage } from "./ExecutionStage";

const list = vi.mocked(trpc.tasks.artifacts.list.query);
const get = vi.mocked(trpc.tasks.artifacts.get.query);
const SPEC = artifactOf({ id: "a1", versions: 1 });

beforeEach(() => {
  list.mockReset().mockResolvedValue([{ id: "a1", path: SPEC.path, versions: [{ version: 1, skill: "spec-writer", sessionId: null, capturedAt: "2026-11-22T10:00:00.000Z", byteSize: 6 }] }]);
  get.mockReset().mockResolvedValue({ path: SPEC.path, version: 1, skill: "spec-writer", sessionId: null, capturedAt: "2026-11-22T10:00:00.000Z", content: "# Spec do login" });
});

describe("artifacts inside the execution stage", () => {
  it("V-18f lets a reader open an artifact and offers no edit, delete or rename action", async () => {
    render(<ExecutionStage detail={detailWith([sessionOf({ events: [eventOf()] })], [SPEC])} reader />);
    expect(screen.getByRole("heading", { name: "Artefatos" })).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: /spec\.md · spec-writer · versão 1/ }));
    expect(await screen.findByRole("heading", { level: 3, name: "Spec do login" })).toBeTruthy();
    for (const name of [/editar/i, /apagar|excluir|remover/i, /renomear/i]) expect(screen.queryByRole("button", { name })).toBeNull();
  });

  it("shows the empty note when the task has no artifact", () => {
    render(<ExecutionStage detail={detailWith([sessionOf()], [])} reader={false} />);
    expect(screen.getByText("Nenhum artefato guardado ainda.")).toBeTruthy();
  });
});
