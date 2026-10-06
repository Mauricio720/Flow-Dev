import { describe, expect, it } from "vitest";
import { safeSpecLink } from "./safeSpecLink";

const context = { currentPath: "_techspec.md", documents: [{ id: "D1", path: "_tests.md" }, { id: "D2", path: "adrs/adr-001.md" }] };

describe("safeSpecLink", () => {
  it("UT-061 resolves a package-relative document link to its captured document identity", () => {
    expect(safeSpecLink("_tests.md", context)).toEqual({ kind: "document", documentId: "D1" });
    expect(safeSpecLink("./adrs/adr-001.md#decisao", context)).toEqual({ kind: "document", documentId: "D2" });
    expect(safeSpecLink("../outside.md", context)).toEqual({ kind: "inert" });
  });
  it("UT-062 keeps scripts, data, file and plain-http links inert", () => {
    for (const href of ["javascript:alert(1)", " JaVaScRiPt:alert(1)", "data:text/html,<script>", "file:///etc/passwd", "http://example.com", "//evil.example", "vbscript:x", ""]) expect(safeSpecLink(href, context)).toEqual({ kind: "inert" });
  });
  it("allows safe HTTPS references and in-page anchors only", () => {
    expect(safeSpecLink("https://example.com/a?b=1", context)).toEqual({ kind: "external", href: "https://example.com/a?b=1" });
    expect(safeSpecLink("#secao", context)).toEqual({ kind: "anchor", id: "secao" });
    expect(safeSpecLink("missing.md", context)).toEqual({ kind: "inert" });
  });
});
