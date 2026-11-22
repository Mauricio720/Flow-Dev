const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const JPEG_SIGNATURE = [0xff, 0xd8, 0xff];
const WEBP_TAG_OFFSET = 8;

export type BinaryKind = { contentType: string; extension: string };

function startsWith(content: Uint8Array, signature: number[]) {
  return signature.every((byte, index) => content[index] === byte);
}

function asciiAt(content: Uint8Array, offset: number, text: string) {
  return [...text].every((character, index) => content[offset + index] === character.charCodeAt(0));
}

export function detectBinaryKind(content: Uint8Array): BinaryKind | null {
  if (startsWith(content, PNG_SIGNATURE)) return { contentType: "image/png", extension: "png" };
  if (startsWith(content, JPEG_SIGNATURE)) return { contentType: "image/jpeg", extension: "jpg" };
  if (asciiAt(content, 0, "GIF87a") || asciiAt(content, 0, "GIF89a")) return { contentType: "image/gif", extension: "gif" };
  if (asciiAt(content, 0, "RIFF") && asciiAt(content, WEBP_TAG_OFFSET, "WEBP")) return { contentType: "image/webp", extension: "webp" };
  if (asciiAt(content, 0, "%PDF")) return { contentType: "application/pdf", extension: "pdf" };
  return null;
}

export function isPlainUtf8(content: Uint8Array) {
  if (content.includes(0)) return false;
  try {
    new TextDecoder("utf-8", { fatal: true }).decode(content);
    return true;
  } catch {
    return false;
  }
}
