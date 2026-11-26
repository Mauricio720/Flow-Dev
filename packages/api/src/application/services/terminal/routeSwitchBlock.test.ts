import { describe, expect, it } from "vitest";
import { parseRouteSwitchBlock, ROUTE_SWITCH_FENCE } from "./routeSwitchBlock";

const block = `\`\`\`${ROUTE_SWITCH_FENCE}\nrota: execucao_direta\nresumo: Mudança de texto em uma tela, sem regra nova.\n- As respostas fixaram o texto e a tela.\n- Segue o padrão de planningCopy.ts.\n\`\`\``;
const wrap = (body: string) => `\`\`\`${ROUTE_SWITCH_FENCE}\n${body}\n\`\`\``;

describe("parseRouteSwitchBlock", () => {
  it("V-01a parses a final block and removes it from assistant text", () => {
    expect(parseRouteSwitchBlock(`Explicação.\n\n${block}`)).toEqual({ text: "Explicação.", block: { valid: true, summary: "Mudança de texto em uma tela, sem regra nova.", reasons: ["As respostas fixaram o texto e a tela.", "Segue o padrão de planningCopy.ts."] } });
  });
  it("V-01b leaves text unchanged when there is no block", () => {
    expect(parseRouteSwitchBlock("Texto da resposta.")).toEqual({ text: "Texto da resposta.", block: null });
  });
  it("V-01c rejects multiple blocks and removes both from text", () => {
    const result = parseRouteSwitchBlock(`${block}\n\n${block}`);
    expect(result.block).toEqual({ valid: false });
    expect(result.text).not.toContain(ROUTE_SWITCH_FENCE);
  });
  it.each([0, 9])("V-01d rejects %i reasons", (count) => {
    const reasons = Array.from({ length: count }, (_, index) => `- Motivo ${index + 1}`).join("\n");
    expect(parseRouteSwitchBlock(wrap(`rota: execucao_direta\nresumo: Resumo\n${reasons}`)).block).toEqual({ valid: false });
  });
  it("V-01d accepts eight reasons", () => {
    const reasons = Array.from({ length: 8 }, (_, index) => `- Motivo ${index + 1}`).join("\n");
    expect(parseRouteSwitchBlock(wrap(`rota: execucao_direta\nresumo: Resumo\n${reasons}`)).block).toMatchObject({ valid: true, reasons: expect.arrayContaining(["Motivo 8"]) });
  });
  it.each([501, 500])("V-01e applies the summary limit at %i characters", (length) => {
    const result = parseRouteSwitchBlock(wrap(`rota: execucao_direta\nresumo: ${"x".repeat(length)}\n- Motivo`));
    expect(result.block?.valid).toBe(length === 500);
  });
  it("V-01f rejects a route other than execucao_direta", () => {
    expect(parseRouteSwitchBlock(wrap("rota: tech_spec\nresumo: Resumo\n- Motivo")).block).toEqual({ valid: false });
  });
  it.each([301, 300])("V-01g applies the reason limit at %i characters", (length) => {
    const result = parseRouteSwitchBlock(wrap(`rota: execucao_direta\nresumo: Resumo\n- ${"x".repeat(length)}`));
    expect(result.block?.valid).toBe(length === 300);
  });
  it("V-01h recognizes a block in the middle and preserves text on both sides", () => {
    const result = parseRouteSwitchBlock(`Antes.\n\n${block}\n\nDepois.`);
    expect(result.block?.valid).toBe(true);
    expect(result.text).toContain("Antes.");
    expect(result.text).toContain("Depois.");
    expect(result.text).not.toContain(ROUTE_SWITCH_FENCE);
  });
});
