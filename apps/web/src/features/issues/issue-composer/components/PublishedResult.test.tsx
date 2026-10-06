import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { publishedDetail } from "@/test/tasks";
import { PublishedResult } from "./PublishedResult";

describe("PublishedResult", () => {
  it("UT-068 shows the rendered snapshot with raw Markdown in optional labeled details", () => {
    const publication = publishedDetail().publication!;
    const { container } = render(<PublishedResult publication={publication} authorName="Ana" />);
    expect(screen.getByRole("link", { name: /Abrir no GitHub/ }).getAttribute("href")).toBe(publication.issueUrl);
    expect(screen.getByText(/Criada por Ana/)).toBeTruthy();
    const details = container.querySelector("details");
    expect(details?.hasAttribute("open")).toBe(false);
    expect(details?.querySelector("summary")?.textContent).toContain("Markdown bruto");
    expect(details?.querySelector("pre")?.getAttribute("aria-label")).toBe("Corpo publicado em Markdown");
  });
});
