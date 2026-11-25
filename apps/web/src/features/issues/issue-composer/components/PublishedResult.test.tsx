import { render, screen } from "@testing-library/react";
import type { TaskPublication } from "../contract";
import { READY_ASSIGNMENT_MESSAGE } from "../readyAssignmentCopy";
import { describe, expect, it } from "vitest";
import { publishedDetail } from "@/test/tasks";
import { PublishedResult } from "./PublishedResult";

const READY_CASES = [
  ["pending", "Atribuindo a você e colocando em Ready…"],
  ["ready", "Atribuída a você e colocada em Ready. Ela já aparece em Trabalho atribuído, em “Atribuídas a você em Ready”, para você reivindicar."],
  ["not_assigned", "O GitHub não manteve você como responsável pela Issue, então ela foi para Backlog. Atribua-se e mova a Issue para Ready no GitHub."],
  ["ready_failed", "Atribuída a você, mas não foi possível colocar a Issue em Ready. Mova-a para Ready no quadro do GitHub."],
  ["unconfirmed", "Não foi possível confirmar a atribuição e o Ready desta Issue. Confira no GitHub."],
] as const;

describe("PublishedResult", () => {
  it("UT-068 shows the rendered snapshot with raw Markdown in optional labeled details", () => {
    const publication = publishedDetail().publication!;
    const { container } = render(<PublishedResult publication={publication} authorName="Ana" workHref="/projects/p1/work" />);
    expect(screen.getByRole("link", { name: /Abrir no GitHub/ }).getAttribute("href")).toBe(publication.issueUrl);
    expect(screen.getByText(/Criada por Ana/)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Ir para Trabalho atribuído" }).getAttribute("href")).toBe("/projects/p1/work");
    const details = container.querySelector("details");
    expect(details?.hasAttribute("open")).toBe(false);
    expect(details?.querySelector("summary")?.textContent).toContain("Markdown bruto");
    expect(details?.querySelector("pre")?.getAttribute("aria-label")).toBe("Corpo publicado em Markdown");
  });

  it.each(READY_CASES)("V-09a shows the literal %s text in a status region with no retry button", (state, text) => {
    const publication = { ...publishedDetail().publication!, readyAssignment: { state } } as TaskPublication;
    render(<PublishedResult publication={publication} authorName="Ana" workHref="/projects/p1/work" />);
    expect(screen.getByRole("status").textContent).toBe(text);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("V-09b shows no assignment text when there is no result", () => {
    render(<PublishedResult publication={publishedDetail().publication!} authorName="Ana" workHref="/projects/p1/work" />);
    expect(screen.queryByRole("status")).toBeNull();
    Object.values(READY_ASSIGNMENT_MESSAGE).forEach((text) => expect(screen.queryByText(text)).toBeNull());
  });

  it.each(READY_CASES)("V-09d keeps the work note and link with %s", (state) => {
    const publication = { ...publishedDetail().publication!, readyAssignment: { state } } as TaskPublication;
    render(<PublishedResult publication={publication} authorName="Ana" workHref="/projects/p1/work" />);
    expect(screen.getByText(/Publicar não inicia planejamento nem execução/)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Ir para Trabalho atribuído" }).getAttribute("href")).toBe("/projects/p1/work");
  });
});

