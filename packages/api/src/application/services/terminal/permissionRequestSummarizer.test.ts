import { describe, expect, it } from "vitest";
import { summarizePermissionRequest } from "./permissionRequestSummarizer";
import { MAX_DISPLAY_LENGTH, TRUNCATION_MARKER } from "./sessionInteractionLimits";

const CWD = "/work/shop";
const summarize = (toolName: string, input: Record<string, unknown>) => summarizePermissionRequest({ toolName, input, cwd: CWD });

describe("permission request summarizer", () => {
  it("V-22e shows the whole command and the description for Bash", () => {
    const summary = summarize("Bash", { command: "pnpm test", description: "Roda os testes" });
    expect(summary).toEqual({ title: "Rodar comando:", body: "pnpm test\n\nRoda os testes", truncated: false });
  });

  it("V-22e shows only the command when Bash has no description", () => {
    expect(summarize("Bash", { command: "pnpm lint" }).body).toBe("pnpm lint");
  });

  it("V-22e shows the clone-relative path and the before and after of an Edit", () => {
    const summary = summarize("Edit", { file_path: "/work/shop/src/a.ts", old_string: "ola", new_string: "oi" });
    expect(summary.title).toBe("Editar src/a.ts");
    expect(summary.body).toBe("Antes:\nola\n\nDepois:\noi");
  });

  it("V-22e keeps the absolute path of a file outside the clone", () => {
    expect(summarize("Edit", { file_path: "/etc/hosts", old_string: "a", new_string: "b" }).title).toBe("Editar /etc/hosts");
    expect(summarize("Write", { file_path: "/work/shop-other/x.md", content: "c" }).title).toBe("Criar /work/shop-other/x.md");
  });

  it("V-22e shows both pairs of a MultiEdit with two edits", () => {
    const summary = summarize("MultiEdit", { file_path: "/work/shop/src/a.ts", edits: [{ old_string: "a1", new_string: "a2" }, { old_string: "b1", new_string: "b2" }] });
    expect(summary.title).toBe("Editar src/a.ts");
    expect(summary.body).toBe("Antes:\na1\n\nDepois:\na2\n\nAntes:\nb1\n\nDepois:\nb2");
  });

  it("V-22e shows the new file path and content for Write", () => {
    expect(summarize("Write", { file_path: "/work/shop/docs/nota.md", content: "# Nota" })).toEqual({ title: "Criar docs/nota.md", body: "# Nota", truncated: false });
  });

  it("V-22e shows the URL for WebFetch and the query for WebSearch", () => {
    expect(summarize("WebFetch", { url: "https://example.com/doc", prompt: "resuma" })).toMatchObject({ title: "Buscar na web:", body: "https://example.com/doc" });
    expect(summarize("WebSearch", { query: "drizzle skipLocked" })).toMatchObject({ title: "Buscar na web:", body: "drizzle skipLocked" });
  });

  it("V-22e shows the tool name and the formatted input for any other tool", () => {
    const summary = summarize("mcp__x__y", { id: 7, nome: "a" });
    expect(summary.title).toBe("mcp__x__y");
    expect(summary.body).toBe('{\n  "id": 7,\n  "nome": "a"\n}');
  });

  it("V-22f cuts a 25000-character Write at 20000 characters ending with the marker", () => {
    const summary = summarize("Write", { file_path: "/work/shop/big.txt", content: "x".repeat(25_000) });
    expect(summary.truncated).toBe(true);
    expect(summary.body).toHaveLength(MAX_DISPLAY_LENGTH);
    expect(summary.body.endsWith(TRUNCATION_MARKER)).toBe(true);
  });

  it("V-22f keeps a body of exactly 20000 characters whole", () => {
    const summary = summarize("Write", { file_path: "/work/shop/ok.txt", content: "y".repeat(MAX_DISPLAY_LENGTH) });
    expect(summary).toMatchObject({ truncated: false });
    expect(summary.body).toHaveLength(MAX_DISPLAY_LENGTH);
  });
});
