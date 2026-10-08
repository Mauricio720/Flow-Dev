const encoder = new TextEncoder();
const decoder = new TextDecoder("utf-8");

export function sliceSource(source: string, startByte: number, endByte: number) {
  return decoder.decode(encoder.encode(source).subarray(startByte, endByte));
}

export function byteLength(text: string) {
  return encoder.encode(text).length;
}

export function stripHeading(content: string) {
  return content.replace(/^#+\s*/, "").trim();
}
