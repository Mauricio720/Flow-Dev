import { ISSUE_IMAGE_BRANCH } from "../tasks/taskImageRules";
import { MAX_ATTACHMENTS } from "./attachmentRules";
import { AGENT_IMAGE_EXTENSIONS } from "../../agents/agentImages";

export type IssueImageReference = { id: string; alt: string };
export type StoredIssueImage = { id: string; contentType: string; byteSize: number; sha256: string };
export type IssueImageChoice = { id: string; name: string; contentType: string; byteSize: number; preselected: boolean };

const IMAGE_SYNTAX = /!\[([^\]]*)\]\(([^)\s]+)\)/g;
const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const DRAFT_IMAGE = new RegExp(`^flow-image:(${UUID})$`, "i");
const PUBLISHED_IMAGE = new RegExp(`^https://github\\.com/[^/]+/[^/]+/blob/${ISSUE_IMAGE_BRANCH}/issue-images/${UUID}/(${UUID})\\.(?:png|jpg|gif|webp)\\?raw=true$`, "i");

function imageIdOf(source: string) {
  return DRAFT_IMAGE.exec(source)?.[1] ?? PUBLISHED_IMAGE.exec(source)?.[1] ?? null;
}

export function issueImageReferences(body: string): IssueImageReference[] {
  const seen = new Set<string>();
  const references: IssueImageReference[] = [];
  for (const match of body.matchAll(IMAGE_SYNTAX)) {
    const id = imageIdOf(match[2]!)?.toLowerCase();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    references.push({ id, alt: match[1]!.trim() });
  }
  return references;
}

export function selectIssueImages(references: IssueImageReference[], stored: StoredIssueImage[]): IssueImageChoice[] {
  const byId = new Map(stored.map((image) => [image.id.toLowerCase(), image]));
  const choices: IssueImageChoice[] = [];
  for (const reference of references) {
    const image = byId.get(reference.id);
    if (!image) continue;
    const position = choices.length + 1;
    const name = reference.alt || `imagem-${position}.${AGENT_IMAGE_EXTENSIONS[image.contentType] ?? "bin"}`;
    choices.push({ id: image.id, name, contentType: image.contentType, byteSize: image.byteSize, preselected: position <= MAX_ATTACHMENTS });
  }
  return choices;
}
