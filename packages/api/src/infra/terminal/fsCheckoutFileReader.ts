import { readFile, readdir, realpath, stat } from "node:fs/promises";
import { isAbsolute, join, posix, relative, resolve, sep } from "node:path";
import type { CheckoutFileReader, CheckoutRead } from "../../application/terminal/checkoutFileReader";
import { MAX_ARTIFACT_BYTES } from "../../application/terminal/artifactCaptureTrigger";

const NOT_FOUND_CODE = "ENOENT";
const PARENT_SEGMENT = "..";
const MARKDOWN_SUFFIX = ".md";

function isInside(root: string, target: string): boolean {
  const path = relative(root, target);
  return path.length > 0 && !path.startsWith(PARENT_SEGMENT) && !isAbsolute(path);
}

function failed(relativePath: string, reason: "too_large" | "not_found" | "unreadable"): CheckoutRead {
  return { kind: "failed", relativePath, reason };
}

async function realPathOf(path: string): Promise<string | NodeJS.ErrnoException> {
  try {
    return await realpath(path);
  } catch (error) {
    return error as NodeJS.ErrnoException;
  }
}

async function readContent(file: string, relativePath: string): Promise<CheckoutRead> {
  try {
    const info = await stat(file);
    if (!info.isFile()) return failed(relativePath, "unreadable");
    if (info.size > MAX_ARTIFACT_BYTES) return failed(relativePath, "too_large");
    const buffer = await readFile(file);
    if (buffer.length > MAX_ARTIFACT_BYTES) return failed(relativePath, "too_large");
    return { kind: "content", relativePath, content: buffer.toString("utf8"), byteSize: buffer.length };
  } catch {
    return failed(relativePath, "unreadable");
  }
}

export class FsCheckoutFileReader implements CheckoutFileReader {
  async read(input: { checkoutPath: string; path: string }): Promise<CheckoutRead> {
    const root = await realPathOf(input.checkoutPath);
    const lexicalBase = typeof root === "string" ? root : resolve(input.checkoutPath);
    const lexical = resolve(lexicalBase, input.path);
    if (!isInside(lexicalBase, lexical)) return { kind: "outside" };
    if (typeof root !== "string") return failed(relative(lexicalBase, lexical), "not_found");
    const real = await realPathOf(lexical);
    if (typeof real !== "string") return failed(relative(root, lexical), real.code === NOT_FOUND_CODE ? "not_found" : "unreadable");
    if (!isInside(root, real)) return { kind: "outside" };
    return readContent(real, relative(root, real));
  }

  async listTopLevelMarkdown(input: { checkoutPath: string; folder: string }): Promise<string[]> {
    const base = resolve(input.checkoutPath);
    const directory = resolve(base, input.folder);
    if (!isInside(base, directory)) return [];
    try {
      const entries = await readdir(directory, { withFileTypes: true });
      return entries.filter((entry) => !entry.isDirectory() && entry.name.endsWith(MARKDOWN_SUFFIX)).map((entry) => relative(base, join(directory, entry.name)).split(sep).join(posix.sep)).sort();
    } catch {
      return [];
    }
  }
}
