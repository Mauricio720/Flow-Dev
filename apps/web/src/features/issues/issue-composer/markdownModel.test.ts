import { describe, expect, it } from "vitest";
import { markdownBlocks, markdownSpans } from "./markdownModel";

const BODY = "## Contexto\n\nO total fica antigo em `cartTotal`\n\n## Restrições\n\n- Não mudar o frete\n- Manter o IVA";

describe("safe markdown preview", () => {
  it("splits the exact issue body into headings, paragraphs and lists", () => {
    expect(markdownBlocks(BODY)).toEqual([
      { kind: "heading", text: "Contexto" },
      { kind: "paragraph", text: "O total fica antigo em `cartTotal`" },
      { kind: "heading", text: "Restrições" },
      { kind: "list", items: ["Não mudar o frete", "Manter o IVA"] },
    ]);
  });

  it("links only safe GitHub destinations and keeps everything else as literal text", () => {
    expect(markdownSpans("src/cart.ts:10 — [abrir](https://github.com/acme/cart/blob/c1/src/cart.ts#L10)")).toEqual([
      { kind: "text", text: "src/cart.ts:10 — " },
      { kind: "link", text: "abrir", href: "https://github.com/acme/cart/blob/c1/src/cart.ts#L10" },
    ]);
    expect(markdownSpans("[abrir](javascript:alert(1)) <script>x</script> [fora](https://evil.example/x)").map((span) => span.kind)).toEqual(["text", "text", "text"]);
  });
});
