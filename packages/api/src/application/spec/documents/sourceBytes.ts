import { sha256Hex } from "../../services/spec/specPayload";
import type { SourceReferenceData } from "./specDocumentTypes";

export function utf8OffsetTable(text: string) {
  const table = new Uint32Array(text.length + 1);
  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index);
    const isLowSurrogate = code >= 0xdc00 && code <= 0xdfff;
    const width = code < 0x80 ? 1 : code < 0x800 ? 2 : isLowSurrogate ? 2 : code >= 0xd800 && code <= 0xdbff ? 2 : 3;
    table[index + 1] = table[index]! + width;
  }
  return table;
}

export function isUtf8Boundary(bytes: Buffer, offset: number) {
  if (offset === 0 || offset === bytes.length) return true;
  return offset > 0 && offset < bytes.length && (bytes[offset]! & 0xc0) !== 0x80;
}

export function verifySourceReference(bytes: Buffer, reference: SourceReferenceData) {
  const { startByte, endByte } = reference;
  if (startByte >= endByte || endByte > bytes.length) return false;
  if (!isUtf8Boundary(bytes, startByte) || !isUtf8Boundary(bytes, endByte)) return false;
  return sha256Hex(bytes.subarray(startByte, endByte)) === reference.sourceHash;
}

export function sliceUtf8(bytes: Buffer, startByte: number, endByte: number) {
  return bytes.subarray(startByte, endByte).toString("utf8");
}
