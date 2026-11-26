import { ROUTE_SWITCH_MAX_REASONS, ROUTE_SWITCH_REASON_LIMIT, ROUTE_SWITCH_SUMMARY_LIMIT } from "../../terminal/routeSwitch";

export const ROUTE_SWITCH_FENCE = "flow-dev-troca-de-rota";
export type RouteSwitchBlock = { valid: true; summary: string; reasons: string[] } | { valid: false };
export type ParsedAssistantText = { text: string; block: RouteSwitchBlock | null };

const FENCE_PATTERN = /```flow-dev-troca-de-rota[ \t]*\r?\n[\s\S]*?```/g;
const VALID_BODY_PATTERN = /^rota: execucao_direta\nresumo: (.+?)(?:\n(- .+))*$/;

function extractOutsideText(text: string, blocks: RegExpExecArray[]): string {
  let result = text;
  for (const block of [...blocks].reverse()) result = result.slice(0, block.index) + result.slice(block.index + block[0].length);
  return result.replace(/\s+$/, "").replace(/^\s+/, "").replace(/\n{2,}/g, "\n\n");
}

function parseBlock(block: string): RouteSwitchBlock {
  const body = block.slice(block.indexOf("\n") + 1, -3).replace(/\r/g, "").trimEnd();
  const match = VALID_BODY_PATTERN.exec(body);
  if (!match) return { valid: false };
  const summary = match[1];
  if (!summary) return { valid: false };
  const reasons = [...body.matchAll(/^(- .+)$/gm)].map(([line]) => line.slice(2));
  if (!summary.trim() || summary.length > ROUTE_SWITCH_SUMMARY_LIMIT) return { valid: false };
  if (reasons.length < 1 || reasons.length > ROUTE_SWITCH_MAX_REASONS) return { valid: false };
  if (reasons.some((reason) => !reason.trim() || reason.length > ROUTE_SWITCH_REASON_LIMIT)) return { valid: false };
  return { valid: true, summary, reasons };
}

export function parseRouteSwitchBlock(text: string): ParsedAssistantText {
  const blocks = [...text.matchAll(FENCE_PATTERN)];
  if (blocks.length === 0) return { text, block: null };
  const cleanedText = extractOutsideText(text, blocks);
  if (blocks.length !== 1) return { text: cleanedText, block: { valid: false } };
  const onlyBlock = blocks[0];
  return onlyBlock ? { text: cleanedText, block: parseBlock(onlyBlock[0]) } : { text: cleanedText, block: { valid: false } };
}
