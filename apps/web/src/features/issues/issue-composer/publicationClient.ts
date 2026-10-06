import { trpc } from "@/lib/trpc/client";

export type PublicationPreview = { title: string; bodyMarkdown: string; repositoryLabel: string; publisherLogin: string | null; labels: string[]; revisionId: string; version: number; previewHash: string };
export type PreviewInput = { projectId: string; taskId: string; revisionId: string };
export type PublishInput = PreviewInput & { requestKey: string; expectedVersion: number; repositoryId: string; previewHash: string };

type PublicationProcedures = { preview: { query: (input: PreviewInput) => Promise<unknown> }; publish: { mutate: (input: PublishInput) => Promise<unknown> } };

export class PreviewContractError extends Error {}

const procedures = trpc.tasks as unknown as PublicationProcedures;

function textAt(value: object, key: string) {
  const field = (value as Record<string, unknown>)[key];
  return typeof field === "string" ? field : null;
}

function labelOf(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const owner = textAt(value, "owner");
  const name = textAt(value, "name");
  return textAt(value, "label") ?? (owner && name ? `${owner}/${name}` : null);
}

function labelsAt(value: unknown) {
  return Array.isArray(value) ? value.filter((label): label is string => typeof label === "string") : [];
}

function parsePreview(value: unknown): PublicationPreview | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const [title, bodyMarkdown, revisionId, previewHash] = ["title", "bodyMarkdown", "revisionId", "previewHash"].map((key) => textAt(value, key));
  const repositoryLabel = labelOf(record.repository);
  if (title === null || bodyMarkdown === null || !revisionId || !previewHash || !repositoryLabel || typeof record.version !== "number") return null;
  const publisherLogin = record.publisher && typeof record.publisher === "object" ? textAt(record.publisher, "login") : null;
  return { title, bodyMarkdown, repositoryLabel, publisherLogin, labels: labelsAt(record.labels), revisionId, version: record.version, previewHash };
}

export async function loadPublicationPreview(input: PreviewInput) {
  const preview = parsePreview(await procedures.preview.query(input));
  if (!preview) throw new PreviewContractError();
  return preview;
}

export function requestPublication(input: PublishInput) {
  return procedures.publish.mutate(input);
}
