import type { PlanningComplexity, PlanningRoute } from "../tasks/planningContracts";
import type { RouteSwitchFromRoute } from "../../terminal/routeSwitch";
import { ATTACHMENTS_HEADING, BODY_TRUNCATION_MARKER, COMPLEXITY_LABEL, NO_UNCERTAINTIES, REASONS_HEADING, ROUTE_INSTRUCTION, ROUTE_LABEL, ROUTE_SWITCHED_SUFFIX, UNCERTAINTIES_HEADING } from "./terminalPromptCopy";

export const MAX_PROMPT_LENGTH = 20_000;
const SECTION_SEPARATOR = "\n\n";
const LINE_SEPARATOR = "\n";

export type PromptSource = {
  route: PlanningRoute;
  switchedFrom: RouteSwitchFromRoute | null;
  issueNumber: number;
  title: string;
  url: string;
  body: string;
  complexity: PlanningComplexity;
  reasons: string[];
  uncertainties: string[];
};

export type PromptAttachment = { name: string; contentType: string; path: string };
export type PromptProblem = "prompt_empty" | "prompt_too_long";

function bulletList(items: string[]) {
  return items.map((item) => `- ${item}`).join(LINE_SEPARATOR);
}

function section(heading: string, items: string[], emptyText?: string) {
  const content = items.length === 0 && emptyText ? emptyText : bulletList(items);
  return `${heading}${LINE_SEPARATOR}${content}`;
}

function fitBody(body: string, room: number) {
  if (body.length <= room) return body;
  const marker = `${LINE_SEPARATOR}${BODY_TRUNCATION_MARKER}`;
  const keep = Math.max(0, room - marker.length);
  return `${body.slice(0, keep)}${marker}`;
}

export function buildDefaultPrompt(source: PromptSource) {
  const head = [ROUTE_INSTRUCTION[source.route], `Issue #${source.issueNumber} — ${source.title}${LINE_SEPARATOR}${source.url}`].join(SECTION_SEPARATOR);
  const route = source.switchedFrom ? `${ROUTE_LABEL[source.switchedFrom]} · ${ROUTE_SWITCHED_SUFFIX}` : ROUTE_LABEL[source.route];
  const routeLine = `Rota aprovada: ${route} · Complexidade: ${COMPLEXITY_LABEL[source.complexity]}`;
  const tail = [routeLine, section(REASONS_HEADING, source.reasons), section(UNCERTAINTIES_HEADING, source.uncertainties, NO_UNCERTAINTIES)].join(SECTION_SEPARATOR);
  const room = MAX_PROMPT_LENGTH - head.length - tail.length - SECTION_SEPARATOR.length * 2;
  return [head, fitBody(source.body, room), tail].join(SECTION_SEPARATOR);
}

export function appendAttachmentsSection(prompt: string, attachments: PromptAttachment[]) {
  if (attachments.length === 0) return prompt;
  const lines = attachments.map((attachment) => `- ${attachment.name} (${attachment.contentType}): ${attachment.path}`);
  return `${prompt}${SECTION_SEPARATOR}${ATTACHMENTS_HEADING}${LINE_SEPARATOR}${lines.join(LINE_SEPARATOR)}`;
}

export function promptProblem(prompt: string): PromptProblem | null {
  if (prompt.trim().length === 0) return "prompt_empty";
  return prompt.length > MAX_PROMPT_LENGTH ? "prompt_too_long" : null;
}
