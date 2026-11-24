import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { trpc } from "@/lib/trpc/client";
import { P, T, approvedDetail } from "@/test/tasks";
import { FOLDER, specOf } from "@/test/taskSet";
import { SpecStage } from "./SpecStage";

const list = vi.mocked(trpc.tasks.artifacts.list.query);
const get = vi.mocked(trpc.tasks.artifacts.get.query);
const SCOPE = { projectId: P, taskId: T };
const LATEST = specOf();
const OLDER = { ...specOf("docs/specs/antiga/spec.md"), artifactId: "00000000-0000-4000-8000-0000000000a2" };
const SPEC_TEXT = "---\nstatus: draft\n---\n# Login\n\n| Campo | Tipo |\n| --- | --- |\n| email | texto |";

const contentOf = (path: string) => ({ path, version: 1, skill: "spec-writer", sessionId: null, capturedAt: "2026-11-23T10:00:00.000Z", content: SPEC_TEXT });

function mount(patch: Partial<Parameters<typeof SpecStage>[0]> = {}) {
  list.mockResolvedValue([{ id: LATEST.artifactId, path: LATEST.path, versions: [{ version: 1, skill: "spec-writer", sessionId: null, capturedAt: "2026-11-23T10:00:00.000Z", byteSize: 10 }] }]);
  get.mockImplementation(async (input) => contentOf(input.artifactId === OLDER.artifactId ? OLDER.path : LATEST.path));
  return render(<SpecStage scope={SCOPE} specs={[LATEST]} detail={approvedDetail()} canGenerate onOpened={() => undefined} {...patch} />);
}

describe("SpecStage", () => {
  it("opens the latest spec on its own, with the frontmatter folded and the table scrollable, and offers Gerar tarefas", async () => {
    mount();
    const article = await screen.findByRole("article");
    expect(within(article).getByRole("heading", { level: 2, name: `${FOLDER}/spec.md` })).toBeTruthy();
    expect(within(article).getByText("Metadados do arquivo").closest("details")?.open).toBe(false);
    expect(within(article).getByRole("table").parentElement?.className).toBe("md-table-scroll");
    expect(within(article).queryByRole("button", { name: "Fechar o artefato" })).toBeNull();
    expect(screen.getByRole("button", { name: "Gerar tarefas" })).toBeTruthy();
    expect(get).toHaveBeenCalledWith({ ...SCOPE, artifactId: LATEST.artifactId });
  });

  it("lets the person switch between captured specs and hides Gerar tarefas when it cannot generate", async () => {
    mount({ specs: [LATEST, OLDER], canGenerate: false });
    await screen.findByRole("article");
    await userEvent.click(within(screen.getByRole("list", { name: "Specs capturadas" })).getByRole("button", { name: OLDER.path }));
    expect(await screen.findByRole("heading", { level: 2, name: OLDER.path })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Gerar tarefas" })).toBeNull();
  });
});
