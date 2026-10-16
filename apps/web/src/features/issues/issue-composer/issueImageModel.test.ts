import { describe, expect, it } from "vitest";
import { imageMarkdown, imageSegments, insertImage } from "./issueImageModel";

const IMAGE = "00000000-0000-4000-8000-0000000000a1";

describe("issue image model", () => {
  it("writes a reference whose alt text comes from the file name without markdown delimiters", () => {
    expect(imageMarkdown("tela [antes] (1).png", IMAGE)).toBe(`![tela  antes   1](flow-image:${IMAGE})`);
    expect(imageMarkdown(".png", IMAGE)).toBe(`![imagem](flow-image:${IMAGE})`);
  });

  it("inserts the image on its own line at the caret and replaces the selected text", () => {
    expect(insertImage("antes depois", { start: 5, end: 5 }, "![x](y)")).toEqual({ text: "antes\n![x](y)\n depois", cursor: 14 });
    expect(insertImage("trocar ISTO", { start: 7, end: 11 }, "![x](y)")).toEqual({ text: "trocar \n![x](y)\n", cursor: 16 });
  });

  it("appends at the end when the field was never focused", () => {
    expect(insertImage("texto", null, "![x](y)")).toEqual({ text: "texto\n![x](y)\n", cursor: 14 });
    expect(insertImage("", null, "![x](y)").text).toBe("![x](y)\n");
  });

  it("splits draft text into prose and stored images, keeping external images as text", () => {
    expect(imageSegments(`Veja:\n![tela](flow-image:${IMAGE})\n![x](https://evil.example/x.png)`)).toEqual([
      { kind: "text", text: "Veja:\n" },
      { kind: "image", alt: "tela", src: `/api/task-images/${IMAGE}` },
      { kind: "text", text: "\n![x](https://evil.example/x.png)" },
    ]);
  });
});
