import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { trpc } from "@/lib/trpc/client";
import { artifactOf } from "@/test/execution";
import { ArtifactSection } from "./ArtifactSection";

const list = vi.mocked(trpc.tasks.artifacts.list.query);
const get = vi.mocked(trpc.tasks.artifacts.get.query);
const SCOPE = { projectId: "00000000-0000-4000-8000-000000000001", taskId: "00000000-0000-4000-8000-000000000011" };
const SPEC = artifactOf({ id: "a1", versions: 2 });
const VERSIONS = [{ version: 1, skill: "spec-writer", sessionId: null, capturedAt: "2026-11-22T10:00:00.000Z", byteSize: 5 }, { version: 2, skill: "spec-writer", sessionId: null, capturedAt: "2026-11-22T10:10:00.000Z", byteSize: 9 }];
const content = (version: number, text: string) => ({ path: SPEC.path, version, skill: "spec-writer", sessionId: null, capturedAt: "2026-11-22T10:10:00.000Z", content: text });

beforeEach(() => {
  list.mockReset().mockResolvedValue([{ id: "a1", path: SPEC.path, versions: VERSIONS }]);
  get.mockReset();
});

async function openSpec(text: string) {
  get.mockResolvedValue(content(2, text));
  render(<ArtifactSection scope={SCOPE} artifacts={[SPEC]} />);
  await userEvent.click(screen.getByRole("button", { name: /spec\.md · spec-writer · versão 2/ }));
  return screen.findByRole("article");
}

describe("ArtifactViewer", () => {
  it("V-18b renders the latest version under the path title with a sound heading order", async () => {
    const article = await openSpec("# Spec\n\n- item\n\n```\ncodigo\n```");
    expect(within(article).getByRole("heading", { level: 2, name: SPEC.path })).toBeTruthy();
    expect(within(article).getByRole("heading", { level: 3, name: "Spec" })).toBeTruthy();
    expect(within(article).getByText("item")).toBeTruthy();
    expect(get).toHaveBeenCalledWith({ ...SCOPE, artifactId: "a1" });
  });

  it("V-18c shows scripts and handlers as text and keeps them out of the DOM", async () => {
    const article = await openSpec("<script>alert(1)</script>\n\n<img src=x onerror=alert(1)>\n\n[x](javascript:alert(1))");
    expect(article.querySelector("script")).toBeNull();
    expect(article.querySelector("img")).toBeNull();
    for (const element of article.querySelectorAll("*")) expect([...element.attributes].some((attribute) => attribute.name.startsWith("on"))).toBe(false);
    expect([...article.querySelectorAll("a")].some((link) => link.getAttribute("href")?.startsWith("javascript"))).toBe(false);
    expect(article.textContent).toContain("<script>alert(1)</script>");
  });

  it("V-18d starts at the latest version and loads the older one from the keyboard", async () => {
    const article = await openSpec("versão dois");
    const picker = within(article).getByLabelText("Versão") as HTMLSelectElement;
    await waitFor(() => expect(picker.options).toHaveLength(2));
    expect(picker.value).toBe("2");
    get.mockResolvedValue(content(1, "versão um"));
    picker.focus();
    await userEvent.selectOptions(picker, "1");
    await waitFor(() => expect(get).toHaveBeenLastCalledWith({ ...SCOPE, artifactId: "a1", version: 1 }));
    expect(await within(article).findByText("versão um")).toBeTruthy();
  });

  it("V-40j writes a version made by the plan as Plano de execução in the picker, and keeps the other skills", async () => {
    list.mockResolvedValue([{ id: "a1", path: SPEC.path, versions: [VERSIONS[0]!, { ...VERSIONS[1]!, skill: "plano-de-execucao" }] }]);
    const article = await openSpec("conteúdo");
    const picker = within(article).getByLabelText("Versão") as HTMLSelectElement;
    await waitFor(() => expect(picker.options).toHaveLength(2));
    expect([...picker.options].map((option) => option.text)).toEqual(["Versão 2 · Plano de execução", "Versão 1 · spec-writer"]);
  });
});
