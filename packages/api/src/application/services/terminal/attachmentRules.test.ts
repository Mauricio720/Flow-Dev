import { describe, expect, it } from "vitest";
import { MAX_ATTACHMENT_BYTES, classifyAttachment, safeAttachmentName } from "./attachmentRules";

const bytes = (...values: number[]) => new Uint8Array(values);
const ascii = (text: string, padding = 8) => new Uint8Array([...Buffer.from(text, "latin1"), ...new Array(padding).fill(7)]);
const PNG = bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2);
const JPEG = bytes(0xff, 0xd8, 0xff, 0xe0, 0, 16);
const WEBP = new Uint8Array([...Buffer.from("RIFF"), 1, 2, 3, 4, ...Buffer.from("WEBPVP8 ")]);
const text = (value: string) => new Uint8Array(Buffer.from(value, "utf8"));

describe("classifyAttachment", () => {
  it("V-12a accepts each image format and the PDF by their signature", () => {
    expect(classifyAttachment({ name: "a.png", content: PNG })).toEqual({ ok: true, contentType: "image/png", extension: "png" });
    expect(classifyAttachment({ name: "a.jpeg", content: JPEG })).toEqual({ ok: true, contentType: "image/jpeg", extension: "jpg" });
    expect(classifyAttachment({ name: "a.gif", content: ascii("GIF89a") })).toMatchObject({ ok: true, contentType: "image/gif" });
    expect(classifyAttachment({ name: "a.gif", content: ascii("GIF87a") })).toMatchObject({ ok: true });
    expect(classifyAttachment({ name: "a.webp", content: WEBP })).toMatchObject({ ok: true, contentType: "image/webp" });
    expect(classifyAttachment({ name: "fluxo.pdf", content: ascii("%PDF-1.4\n") })).toEqual({ ok: true, contentType: "application/pdf", extension: "pdf" });
  });

  it.each(["md", "txt", "json", "csv", "yaml", "yml", "xml", "log", "html", "css", "sql", "ts", "tsx", "js", "jsx", "py", "go", "rs", "java", "rb", "php", "sh"])("V-12a accepts a UTF-8 .%s file", (extension) => {
    const result = classifyAttachment({ name: `erro.${extension.toUpperCase()}`, content: text("conteúdo ação\n") });
    expect(result).toMatchObject({ ok: true, extension });
  });

  it("V-12a gives a structured content type to known text extensions", () => {
    expect(classifyAttachment({ name: "a.md", content: text("x") })).toMatchObject({ contentType: "text/markdown" });
    expect(classifyAttachment({ name: "a.log", content: text("x") })).toMatchObject({ contentType: "text/plain" });
  });

  it("V-12b refuses a png named file with ZIP bytes, a pdf without the signature and a spreadsheet", () => {
    const zip = bytes(0x50, 0x4b, 0x03, 0x04, 0, 0);
    expect(classifyAttachment({ name: "a.png", content: zip })).toEqual({ ok: false, reason: "attachment_type_rejected" });
    expect(classifyAttachment({ name: "a.pdf", content: text("não é pdf") })).toEqual({ ok: false, reason: "attachment_type_rejected" });
    expect(classifyAttachment({ name: "planilha.xlsx", content: zip })).toEqual({ ok: false, reason: "attachment_type_rejected" });
  });

  it("V-12b refuses a png named file that carries a PDF, and a txt that carries an image", () => {
    expect(classifyAttachment({ name: "a.png", content: ascii("%PDF-1.7\n") })).toMatchObject({ ok: false, reason: "attachment_type_rejected" });
    expect(classifyAttachment({ name: "a.txt", content: PNG })).toMatchObject({ ok: false, reason: "attachment_type_rejected" });
  });

  it("V-12c refuses text with a null byte or invalid UTF-8", () => {
    expect(classifyAttachment({ name: "a.txt", content: bytes(0x61, 0x00, 0x62) })).toMatchObject({ ok: false });
    expect(classifyAttachment({ name: "a.txt", content: bytes(0xc3, 0x28) })).toMatchObject({ ok: false });
  });

  it("refuses an empty file and a text file with an unknown extension", () => {
    expect(classifyAttachment({ name: "a.txt", content: new Uint8Array() })).toMatchObject({ ok: false });
    expect(classifyAttachment({ name: "a.bin", content: text("x") })).toMatchObject({ ok: false });
  });

  it("V-12d accepts exactly 10 MB and refuses one byte more as too large", () => {
    const limit = new Uint8Array(MAX_ATTACHMENT_BYTES);
    limit.set(PNG);
    expect(classifyAttachment({ name: "a.png", content: limit })).toMatchObject({ ok: true });
    expect(classifyAttachment({ name: "a.png", content: new Uint8Array(MAX_ATTACHMENT_BYTES + 1) })).toEqual({ ok: false, reason: "attachment_too_large" });
  });
});

describe("safeAttachmentName", () => {
  it("V-12h turns accents, spaces and path pieces into a safe slug", () => {
    expect(safeAttachmentName(3, "../Relatório final/../x.PDF", "pdf")).toBe("03-relatorio-final-x.pdf");
  });

  it("V-12h falls back to anexo when nothing is left", () => {
    expect(safeAttachmentName(3, "../..", "pdf")).toBe("03-anexo.pdf");
    expect(safeAttachmentName(12, "###.png", "png")).toBe("12-anexo.png");
  });

  it("V-12h only emits lowercase letters, digits, dash and dot, without separators or dots in a row", () => {
    const name = safeAttachmentName(1, "ç/\\..\\ÑOÑO ação!!.md", "md");
    expect(name).toMatch(/^[a-z0-9-]+\.[a-z0-9]+$/);
    expect(name).not.toContain("..");
  });
});
