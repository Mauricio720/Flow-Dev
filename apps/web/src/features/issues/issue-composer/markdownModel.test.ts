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

  it("renders only images stored by Flow Dev, before and after publication, through the authenticated route", () => {
    const image = "00000000-0000-4000-8000-0000000000a1";
    const published = `https://github.com/acme/cart/blob/flow-dev-assets/issue-images/00000000-0000-4000-8000-000000000011/${image}.png?raw=true`;
    expect(markdownSpans(`![tela](flow-image:${image}) ![depois](${published})`)).toEqual([
      { kind: "image", alt: "tela", src: `/api/task-images/${image}` },
      { kind: "text", text: " " },
      { kind: "image", alt: "depois", src: `/api/task-images/${image}` },
    ]);
    expect(markdownSpans("![rastreador](https://evil.example/pixel.png)")).toEqual([{ kind: "text", text: "![rastreador](https://evil.example/pixel.png)" }]);
  });
});
