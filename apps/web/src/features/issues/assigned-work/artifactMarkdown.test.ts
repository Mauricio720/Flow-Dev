import { describe, expect, it } from "vitest";
import { renderArtifactMarkdown } from "./artifactMarkdown";

describe("renderArtifactMarkdown", () => {
  it("renders headings two levels below the document level", () => {
    expect(renderArtifactMarkdown("# Spec\n\n## Parte")).toMatch(/<h3>Spec<\/h3>[\s\S]*<h4>Parte<\/h4>/);
  });

  it("renders lists and code", () => {
    const html = renderArtifactMarkdown("- um\n- dois\n\n```ts\nconst a = 1;\n```");
    expect(html).toContain("<li>um</li>");
    expect(html).toContain("<pre>");
  });

  it("escapes block and inline raw HTML", () => {
    const html = renderArtifactMarkdown("<script>alert(1)</script>\n\ntexto <img src=x onerror=alert(1)> fim");
    expect(html).not.toContain("<script");
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).toContain("&lt;img src=x onerror=alert(1)&gt;");
  });

  it("drops the href of an unsafe link and keeps http links safe", () => {
    expect(renderArtifactMarkdown("[x](javascript:alert(1))")).not.toContain("href");
    expect(renderArtifactMarkdown("[x](JaVaScRiPt:alert(1))")).not.toContain("href");
    expect(renderArtifactMarkdown("[ok](https://exemplo.com)")).toContain('href="https://exemplo.com"');
  });

  it("never loads remote images", () => {
    expect(renderArtifactMarkdown("![logo](https://exemplo.com/a.png)")).not.toContain("<img");
  });
});
