import { afterEach, describe, expect, it } from "vitest";
import { chmod, mkdir, symlink, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { FsCheckoutFileReader } from "../src/infra/terminal/fsCheckoutFileReader";
import { cleanupTerminalFolders, temporaryFolder } from "./terminal-support";

const MAX_BYTES = 1_048_576;
const reader = new FsCheckoutFileReader();
const isRoot = process.getuid?.() === 0;

afterEach(cleanupTerminalFolders);

async function clone() {
  const outer = await temporaryFolder("reader-");
  const checkout = join(outer, "clone");
  await mkdir(checkout, { recursive: true });
  const put = async (relative: string, content: string | Buffer, base = checkout) => {
    await mkdir(dirname(join(base, relative)), { recursive: true });
    await writeFile(join(base, relative), content);
  };
  return { outer, checkout, put, read: (path: string, root = checkout) => reader.read({ checkoutPath: root, path }) };
}

describe("FsCheckoutFileReader", () => {
  it("V-16d ignores absolute paths outside the checkout, including the session attachments folder", async () => {
    const { outer, put, read } = await clone();
    await put("x/nota.md", "fora", outer);
    await put("sessao/contexto/anexos/01-nota.md", "anexo", outer);
    expect(await read(join(outer, "x", "nota.md"))).toEqual({ kind: "outside" });
    expect(await read(join(outer, "sessao/contexto/anexos/01-nota.md"))).toEqual({ kind: "outside" });
    expect(await read("../x/nota.md")).toEqual({ kind: "outside" });
  });

  it("V-16e does not follow a symlink that points outside the checkout", async () => {
    const { outer, checkout, put, read } = await clone();
    await put("segredo.md", "SEGREDO", outer);
    await mkdir(join(checkout, "docs"), { recursive: true });
    await symlink(join(outer, "segredo.md"), join(checkout, "docs", "link.md"));
    expect(await read("docs/link.md")).toEqual({ kind: "outside" });
  });

  it("V-17c accepts exactly 1 MB and refuses one byte more", async () => {
    const { put, read } = await clone();
    await put("docs/grande.md", Buffer.alloc(MAX_BYTES + 1, "a"));
    await put("docs/limite.md", Buffer.alloc(MAX_BYTES, "a"));
    expect(await read("docs/grande.md")).toEqual({ kind: "failed", relativePath: "docs/grande.md", reason: "too_large" });
    expect(await read("docs/limite.md")).toMatchObject({ kind: "content", byteSize: MAX_BYTES });
  });

  it("V-17d reports a file deleted after the edit as not found", async () => {
    const { read } = await clone();
    expect(await read("docs/sumiu.md")).toEqual({ kind: "failed", relativePath: "docs/sumiu.md", reason: "not_found" });
  });

  it.skipIf(isRoot)("V-17e reports a file without read permission as unreadable", async () => {
    const { checkout, put, read } = await clone();
    await put("docs/fechado.md", "x");
    await chmod(join(checkout, "docs", "fechado.md"), 0o000);
    expect(await read("docs/fechado.md")).toEqual({ kind: "failed", relativePath: "docs/fechado.md", reason: "unreadable" });
  });

  it("V-17k resolves a symlink inside the checkout and a checkout that is itself a symlink", async () => {
    const { outer, checkout, put, read } = await clone();
    await put("docs/specs/x/spec.md", "# Spec");
    await symlink(join(checkout, "docs/specs/x/spec.md"), join(checkout, "docs", "atalho.md"));
    expect(await read("docs/atalho.md")).toMatchObject({ kind: "content", relativePath: "docs/specs/x/spec.md", content: "# Spec" });
    const linked = join(outer, "linked-clone");
    await symlink(checkout, linked);
    expect(await read("docs/specs/x/spec.md", linked)).toMatchObject({ kind: "content", relativePath: "docs/specs/x/spec.md" });
    expect(await read(join(checkout, "docs/specs/x/spec.md"), linked)).toMatchObject({ kind: "content", relativePath: "docs/specs/x/spec.md" });
  });
});
