import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const [file, startMarker, endMarker] = process.argv.slice(2);
if (!file || !startMarker) {
  process.stderr.write("usage: node source-ref.mjs <file> <startMarker> [endMarker]\n");
  process.exit(2);
}
const bytes = readFileSync(file);
const text = bytes.toString("utf8");
const startIndex = text.indexOf(startMarker);
if (startIndex < 0) {
  process.stderr.write("start marker not found\n");
  process.exit(1);
}
const endIndex = endMarker ? text.indexOf(endMarker, startIndex + startMarker.length) : text.length;
if (endIndex < 0) {
  process.stderr.write("end marker not found\n");
  process.exit(1);
}
const startByte = Buffer.byteLength(text.slice(0, startIndex));
const endByte = Buffer.byteLength(text.slice(0, endIndex));
const sourceHash = createHash("sha256").update(bytes.subarray(startByte, endByte)).digest("hex");
process.stdout.write(`${JSON.stringify({ documentPath: file.split("/").pop(), startByte, endByte, sourceHash })}\n`);
