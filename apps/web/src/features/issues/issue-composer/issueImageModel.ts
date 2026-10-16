export type ImageScope = { projectId: string; taskId: string };
export type ImageSegment = { kind: "text"; text: string } | { kind: "image"; alt: string; src: string };
export type TextSelection = { start: number; end: number };

export const ACCEPTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp"];
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const IMAGE_ROUTE = "/api/task-images/";
const DEFAULT_ALT = "imagem";
const DRAFT_IMAGE = /^flow-image:([0-9a-f-]{36})$/i;
// Matches the address a draft image receives on the flow-dev-assets branch after publication.
const PUBLISHED_IMAGE = /^https:\/\/github\.com\/[^/]+\/[^/]+\/blob\/flow-dev-assets\/issue-images\/[0-9a-f-]{36}\/([0-9a-f-]{36})\.(?:png|jpg|gif|webp)\?raw=true$/i;
const IMAGE_SYNTAX = /!\[([^\]]*)\]\(([^)\s]+)\)/g;
const ALT_FORBIDDEN = /[[\]()\n\r]+/g;
const FILE_EXTENSION = /\.[^.]+$/;

export function storedImageSource(url: string) {
  const imageId = DRAFT_IMAGE.exec(url)?.[1] ?? PUBLISHED_IMAGE.exec(url)?.[1];
  return imageId ? `${IMAGE_ROUTE}${imageId}` : null;
}

export function imageMarkdown(fileName: string, imageId: string) {
  const alt = fileName.replace(FILE_EXTENSION, "").replace(ALT_FORBIDDEN, " ").trim() || DEFAULT_ALT;
  return `![${alt}](flow-image:${imageId})`;
}

export function insertImage(text: string, selection: TextSelection | null, markdown: string) {
  const end = Math.min(selection?.end ?? text.length, text.length);
  const before = text.slice(0, Math.min(selection?.start ?? end, end));
  const after = text.slice(end);
  const lead = before && !before.endsWith("\n") ? "\n" : "";
  const trail = after.startsWith("\n") ? "" : "\n";
  const inserted = `${lead}${markdown}${trail}`;
  return { text: `${before}${inserted}${after}`, cursor: before.length + inserted.length };
}

export function imageSegments(text: string): ImageSegment[] {
  const segments: ImageSegment[] = [];
  let cursor = 0;
  for (const match of text.matchAll(IMAGE_SYNTAX)) {
    const src = storedImageSource(match[2]!);
    if (!src) continue;
    if (match.index > cursor) segments.push({ kind: "text", text: text.slice(cursor, match.index) });
    segments.push({ kind: "image", alt: match[1]!, src });
    cursor = match.index + match[0].length;
  }
  if (cursor < text.length) segments.push({ kind: "text", text: text.slice(cursor) });
  return segments;
}

export function imageFiles(files: FileList | File[] | null | undefined) {
  return [...(files ?? [])].filter((file) => file.type.startsWith("image/"));
}
