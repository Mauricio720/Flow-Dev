import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { COMPOZY_PIN } from "../../application/spec/specPins";
import { compozyCommand, matchesCompozyPin, packagedCompozy, type PackagedCompozy } from "./pinnedCompozy";

async function binaryFile() {
  const path = join(await mkdtemp(join(tmpdir(), "flow-pinned-compozy-")), "compozy");
  await writeFile(path, "not the release archive");
  return path;
}
const pinned = (binary: string): PackagedCompozy => ({ binary, version: COMPOZY_PIN.version, archiveDigests: ["other", COMPOZY_PIN.binarySha256] });

describe("pinned compozy", () => {
  it("ships the pinned release as a package dependency", () => {
    expect(packagedCompozy()).toMatchObject({ version: COMPOZY_PIN.version });
  });
  it("prefers an explicit binary, then the packaged one, then the PATH", async () => {
    const packaged = pinned(await binaryFile());
    expect(compozyCommand({ FLOW_COMPOZY_BIN: "/opt/compozy" }, packaged)).toBe("/opt/compozy");
    expect(compozyCommand({}, packaged)).toBe(packaged.binary);
    expect(compozyCommand({}, null)).toBe("compozy");
  });
  it("trusts the packaged binary only when its manifest is the pinned release", async () => {
    const binary = await binaryFile();
    await expect(matchesCompozyPin(binary, pinned(binary))).resolves.toBe(true);
    await expect(matchesCompozyPin(binary, { ...pinned(binary), version: "0.2.15" })).resolves.toBe(false);
    await expect(matchesCompozyPin(binary, { ...pinned(binary), archiveDigests: ["other"] })).resolves.toBe(false);
  });
  it("rejects any other binary whose content is not the pinned digest", async () => {
    await expect(matchesCompozyPin(await binaryFile(), pinned(await binaryFile()))).resolves.toBe(false);
    await expect(matchesCompozyPin("/missing/compozy", null)).resolves.toBe(false);
  });
});
