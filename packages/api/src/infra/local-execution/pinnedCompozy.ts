import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { readFile, realpath } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { COMPOZY_PIN } from "../../application/spec/specPins";

const PACKAGE_MANIFEST = "@compozy/cli/package.json";
const PACKAGED_BINARY_NAME = process.platform === "win32" ? "compozy.exe" : "compozy";
const PATH_COMMAND = "compozy";
export const COMPOZY_VERSION_ARGS = ["version"];

type PackageManifest = { version?: string; archives?: Record<string, { checksum?: { digest?: string } }> };
export type PackagedCompozy = { binary: string; version: string; archiveDigests: string[] };

export function packagedCompozy(): PackagedCompozy | null {
  try {
    const manifestPath = createRequire(import.meta.url).resolve(PACKAGE_MANIFEST);
    const binary = join(dirname(manifestPath), "bin", PACKAGED_BINARY_NAME);
    if (!existsSync(binary)) return null;
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as PackageManifest;
    const archiveDigests = Object.values(manifest.archives ?? {}).map((archive) => archive.checksum?.digest ?? "");
    return { binary, version: manifest.version ?? "", archiveDigests };
  } catch {
    return null;
  }
}

export function compozyCommand(environment: NodeJS.ProcessEnv, packaged: PackagedCompozy | null = packagedCompozy()) {
  return environment.FLOW_COMPOZY_BIN ?? packaged?.binary ?? PATH_COMMAND;
}

// The pin holds the release archive checksum. The package installer verifies that archive before
// extracting the binary, so the packaged binary is trusted through its manifest, not by its own hash.
export async function matchesCompozyPin(path: string, packaged: PackagedCompozy | null = packagedCompozy()) {
  if (packaged && await isSameFile(path, packaged.binary)) return packaged.version === COMPOZY_PIN.version && packaged.archiveDigests.includes(COMPOZY_PIN.binarySha256);
  try {
    return createHash("sha256").update(await readFile(path)).digest("hex") === COMPOZY_PIN.binarySha256;
  } catch {
    return false;
  }
}

async function isSameFile(left: string, right: string) {
  const [first, second] = await Promise.all([realpath(left).catch(() => null), realpath(right).catch(() => null)]);
  return first !== null && first === second;
}
