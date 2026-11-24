import { FLOW_DEV_SKILLS } from "../../../terminal/sessionContext";

export type CodexUserInput = { type: "text"; text: string; text_elements: [] } | { type: "skill"; name: string; path: string } | { type: "localImage"; path: string };
export type CodexTurnInput = { prompt: string; contextDir: string };
export type CodexTurnOutput = { input: CodexUserInput[]; displayText: string };

const ROUTE_SKILL = /^\/flow-dev:([A-Za-z0-9_-]+)(?=\s|$)\s*/;
const USER_SKILL = /^\$([A-Za-z0-9_-]+)(?=\s|$)\s*/;
const IMAGE_ATTACHMENT = /^- .+ \((image\/[^)]+)\): (.+)$/;

function skillPrefix(prompt: string) {
  return ROUTE_SKILL.exec(prompt) ?? USER_SKILL.exec(prompt);
}

function knownSkill(name: string | undefined): name is (typeof FLOW_DEV_SKILLS)[number] {
  return name !== undefined && FLOW_DEV_SKILLS.some((skill) => skill === name);
}

function splitImages(prompt: string) {
  const images: string[] = [];
  const text = prompt.split("\n").filter((line) => {
    const match = IMAGE_ATTACHMENT.exec(line);
    if (!match) return true;
    images.push(match[2]!);
    return false;
  }).join("\n");
  return { text, images };
}

export function codexTurnInput(input: CodexTurnInput): CodexTurnOutput {
  const { text: prompt, images } = splitImages(input.prompt);
  const prefix = skillPrefix(prompt);
  const name = prefix?.[1];
  const skill = knownSkill(name) ? { type: "skill" as const, name, path: `${input.contextDir}/skills/${name}/SKILL.md` } : null;
  const text = skill ? prompt.slice(prefix![0].length) : prompt;
  const displayText = skill ? `[${skill.name}]${text ? ` ${text}` : ""}` : text;
  const content: CodexUserInput[] = [...(skill ? [skill] : []), ...(text ? [{ type: "text" as const, text, text_elements: [] as [] }] : []), ...images.map((path) => ({ type: "localImage" as const, path }))];
  return { input: content, displayText };
}
