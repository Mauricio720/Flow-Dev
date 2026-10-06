import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ACME_PRIVATE, OCTO_DOCS, projectFixture } from "@/test/projects";
import { ProjectEntry } from "./ProjectEntry";

const NAME_LIMIT = 60;
const DESCRIPTION_LIMIT = 280;

function renderEntry(project: ReturnType<typeof projectFixture>) {
  return render(<ul><ProjectEntry project={project} connection="checking" opening={false} recent={false} onChoose={vi.fn()} /></ul>);
}

describe("catalog entry", () => {
  it("UT-001 shows the name and octo/docs without inventing a description", () => {
    renderEntry(projectFixture("p2", "Projeto Docs", OCTO_DOCS, null));
    const entry = screen.getByRole("link", { name: "Projeto Docs octo/docs" });
    expect(entry.getAttribute("href")).toBe("/projects/p2");
    expect(entry.textContent).toBe("Projeto Docsocto/docsVerificando acesso");
    expect(entry.getAttribute("aria-describedby")).toBe("project-p2-state");
  });

  it("UT-003 keeps a 60-character name and a special owner/repo accessible without running supplied HTML", () => {
    const name = "<img src=x onerror=alert(1)>".padEnd(NAME_LIMIT, "é");
    const repository = { ...ACME_PRIVATE, owner: "<b>acme</b>", name: "re&po.\"x\"" };
    const { container } = renderEntry(projectFixture("p1", name, repository));
    expect(name).toHaveLength(NAME_LIMIT);
    expect(screen.getByRole("link", { name: `${name} <b>acme</b>/re&po."x"` })).toBeTruthy();
    expect(container.querySelector("img, b")).toBeNull();
  });

  it("UT-012 keeps the project, acme/private and the destination reachable with the longest details", () => {
    const name = "N".repeat(NAME_LIMIT);
    renderEntry(projectFixture("p1", name, ACME_PRIVATE, "d".repeat(DESCRIPTION_LIMIT)));
    const entry = screen.getByRole("link", { name: `${name} acme/private` });
    expect(entry.getAttribute("href")).toBe("/projects/p1");
    expect(entry.getAttribute("aria-describedby")).toBe("project-p1-state project-p1-description");
  });
});
