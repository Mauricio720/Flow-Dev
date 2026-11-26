import { and, asc, eq, inArray } from "drizzle-orm";
import type { AgentImage, ImageCandidate, ImageOrigin, OmittedImage } from "../../../../application/agents/agentImages";
import { selectAgentImages } from "../../../../application/agents/agentImages";
import { issueImageReferences } from "../../../../application/services/terminal/issueImageSelection";
import type { IssueDraft } from "../../../../application/services/tasks/taskContracts";
import { renderIssueBody } from "../../../../application/services/tasks/draftRules";
import { taskImages, taskMessages } from "../../schema";
import type { Database } from "../../client";
import { findTaskImageMetadata, readTaskImageContents } from "./taskImageReads";

type Message = { id: string; sequence: number };

export async function loadGenerationImages(database: Database, input: { taskId: string; messages: Message[]; draft: IssueDraft | null }): Promise<{ images: AgentImage[]; omittedImages: OmittedImage[] }> {
  const attachments = await findAttachments(database, input.taskId, input.messages.map(({ id }) => id));
  const references = input.draft ? issueImageReferences(renderIssueBody(input.draft)) : [];
  const draftMetadata = await findTaskImageMetadata(database, { taskId: input.taskId, ids: references.map(({ id }) => id) });
  const candidates = buildCandidates(attachments, draftMetadata, references);
  const selection = selectAgentImages(candidates);
  return loadSelectedContents(database, input.taskId, selection.selected, selection.omitted);
}

async function findAttachments(database: Database, taskId: string, messageIds: string[]) {
  if (!messageIds.length) return [];
  return database.select({ id: taskImages.id, sequence: taskMessages.sequence, contentType: taskImages.contentType, byteSize: taskImages.byteSize, createdAt: taskImages.createdAt })
    .from(taskImages).innerJoin(taskMessages, eq(taskMessages.id, taskImages.messageId))
    .where(and(eq(taskImages.taskId, taskId), inArray(taskImages.messageId, messageIds)))
    .orderBy(asc(taskMessages.sequence), asc(taskImages.createdAt), asc(taskImages.id));
}

function buildCandidates(attachments: Awaited<ReturnType<typeof findAttachments>>, draftMetadata: Awaited<ReturnType<typeof findTaskImageMetadata>>, references: Array<{ id: string; alt: string }>) {
  const byId = new Map([...attachments, ...draftMetadata].map((image) => [image.id, image]));
  const attached = attachments.map((image) => candidateFromMetadata(image, { kind: "message", messageNumber: image.sequence }, true));
  const draft = references.map((reference) => candidateFromReference(reference, byId.get(reference.id)));
  return [...attached, ...draft];
}

function candidateFromMetadata(image: { id: string; contentType: string; byteSize: number; createdAt: Date }, origin: ImageOrigin, available: boolean): ImageCandidate {
  return { id: image.id, contentType: image.contentType, byteSize: image.byteSize, createdAt: image.createdAt, origin, available };
}

function candidateFromReference(reference: { id: string; alt: string }, image: { id: string; contentType: string; byteSize: number; createdAt: Date } | undefined): ImageCandidate {
  const origin: ImageOrigin = { kind: "draft", caption: reference.alt };
  if (!image) return { id: reference.id, contentType: "", byteSize: 0, createdAt: new Date(0), origin, available: false };
  return candidateFromMetadata(image, origin, true);
}

async function loadSelectedContents(database: Database, taskId: string, selected: ImageCandidate[], omitted: OmittedImage[]) {
  const contentById = await readTaskImageContents(database, { taskId, ids: selected.map(({ id }) => id) });
  const images: AgentImage[] = [];
  const missing: OmittedImage[] = [];
  for (const candidate of selected) {
    const content = contentById.get(candidate.id);
    if (!content) missing.push({ id: candidate.id, origin: candidate.origin, reason: "unavailable" });
    else images.push({ id: candidate.id, contentType: candidate.contentType, content, origin: candidate.origin });
  }
  return { images, omittedImages: [...omitted, ...missing] };
}
