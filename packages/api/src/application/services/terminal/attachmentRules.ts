import { detectBinaryKind, isPlainUtf8 } from "./attachmentSignatures";

export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
export const MAX_ATTACHMENTS = 10;
export const MAX_ATTACHMENTS_TOTAL_BYTES = 30 * 1024 * 1024;
export const MAX_ATTACHMENT_NAME_LENGTH = 255;
const MAX_SAFE_NAME_LENGTH = 60;
const FALLBACK_SAFE_NAME = "anexo";
const INDEX_WIDTH = 2;
const EXTENSION_PATTERN = /\.([A-Za-z0-9]+)$/;
const BINARY_EXTENSIONS = new Set(["png", "jpg", "jpeg", "gif", "webp", "pdf"]);
const TEXT_CONTENT_TYPES: Record<string, string> = { md: "text/markdown", json: "application/json", csv: "text/csv", yaml: "application/yaml", yml: "application/yaml", xml: "application/xml", html: "text/html", css: "text/css", sql: "application/sql" };
const PLAIN_TEXT_EXTENSIONS = ["txt", "log", "ts", "tsx", "js", "jsx", "py", "go", "rs", "java", "rb", "php", "sh"];
const TEXT_EXTENSIONS = new Set([...Object.keys(TEXT_CONTENT_TYPES), ...PLAIN_TEXT_EXTENSIONS]);

const CONTENT_TYPE_EXTENSIONS: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/gif": "gif", "image/webp": "webp", "application/pdf": "pdf" };
const DEFAULT_TEXT_EXTENSION = "txt";

export type AttachmentRejection = "attachment_type_rejected" | "attachment_too_large";
export type ClassifiedAttachment = { ok: true; contentType: string; extension: string } | { ok: false; reason: AttachmentRejection };

function nameExtension(name: string) {
  return EXTENSION_PATTERN.exec(name)?.[1]?.toLowerCase() ?? null;
}

export function storedExtension(name: string, contentType: string) {
  return CONTENT_TYPE_EXTENSIONS[contentType] ?? nameExtension(name) ?? DEFAULT_TEXT_EXTENSION;
}

function normalizedExtension(extension: string) {
  return extension === "jpeg" ? "jpg" : extension;
}

function classifyBinary(content: Uint8Array, claimed: string | null): ClassifiedAttachment | null {
  const kind = detectBinaryKind(content);
  if (!kind) return null;
  if (claimed && BINARY_EXTENSIONS.has(claimed) && normalizedExtension(claimed) !== kind.extension) return { ok: false, reason: "attachment_type_rejected" };
  if (claimed && TEXT_EXTENSIONS.has(claimed)) return { ok: false, reason: "attachment_type_rejected" };
  return { ok: true, ...kind };
}

export function classifyAttachment(input: { name: string; content: Uint8Array }): ClassifiedAttachment {
  if (input.content.byteLength > MAX_ATTACHMENT_BYTES) return { ok: false, reason: "attachment_too_large" };
  const rejected: ClassifiedAttachment = { ok: false, reason: "attachment_type_rejected" };
  if (input.content.byteLength === 0) return rejected;
  const claimed = nameExtension(input.name);
  const binary = classifyBinary(input.content, claimed);
  if (binary) return binary;
  if (!claimed || !TEXT_EXTENSIONS.has(claimed) || !isPlainUtf8(input.content)) return rejected;
  return { ok: true, contentType: TEXT_CONTENT_TYPES[claimed] ?? "text/plain", extension: claimed };
}

function slugOf(originalName: string) {
  const withoutExtension = originalName.replace(EXTENSION_PATTERN, "");
  const ascii = withoutExtension.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const slug = ascii.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, MAX_SAFE_NAME_LENGTH).replace(/-+$/g, "");
  return slug || FALLBACK_SAFE_NAME;
}

export function safeAttachmentName(index: number, originalName: string, extension: string) {
  const safeExtension = extension.toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
  return `${String(index).padStart(INDEX_WIDTH, "0")}-${slugOf(originalName)}.${safeExtension}`;
}
