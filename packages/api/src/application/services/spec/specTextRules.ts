import { SPEC_TEXT_MAX_BYTES } from "./specLimits";

export function specTextByteLength(value: string) {
  return new TextEncoder().encode(value).length;
}

export function isBoundedSpecText(value: string) {
  return value.trim().length > 0 && specTextByteLength(value) <= SPEC_TEXT_MAX_BYTES;
}
