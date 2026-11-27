import type { ImageCandidate, OmittedImage, AgentImage } from "../../../../application/agents/agentImages";
import { issueImageReferences } from "../../../../application/services/terminal/issueImageSelection";
import { selectAgentImages } from "../../../../application/agents/agentImages";
import type { Database } from "../../client";
import { findTaskImageMetadata, readTaskImageContents } from "./taskImageReads";

export async function loadPlanningImages(database: Database, input: { taskId: string; bodyMarkdown: string }): Promise<{ images: AgentImage[]; omittedImages: OmittedImage[] }> {
  const references = issueImageReferences(input.bodyMarkdown);
  const metadata = await findTaskImageMetadata(database, { taskId: input.taskId, ids: references.map(({ id }) => id) });
  const byId = new Map(metadata.map((image) => [image.id, image]));
  const candidates = references.map((reference, index): ImageCandidate => {
    const image = byId.get(reference.id);
    const origin = { kind: "issue_body", position: index + 1, caption: reference.alt } as const;
    if (!image) return { id: reference.id, contentType: "", byteSize: 0, createdAt: new Date(0), origin, available: false };
    return { id: image.id, contentType: image.contentType, byteSize: image.byteSize, createdAt: image.createdAt, origin, available: true };
  });
  const selection = selectAgentImages(candidates);
  return loadSelected(database, input.taskId, selection.selected, selection.omitted);
}

async function loadSelected(database: Database, taskId: string, selected: ImageCandidate[], omitted: OmittedImage[]) {
  const contents = await readTaskImageContents(database, { taskId, ids: selected.map(({ id }) => id) });
  const images: AgentImage[] = [];
  const missing: OmittedImage[] = [];
  for (const candidate of selected) {
    const content = contents.get(candidate.id);
    if (!content) missing.push({ id: candidate.id, origin: candidate.origin, reason: "unavailable" });
    else images.push({ id: candidate.id, contentType: candidate.contentType, content, origin: candidate.origin });
  }
  return { images, omittedImages: [...omitted, ...missing] };
}
