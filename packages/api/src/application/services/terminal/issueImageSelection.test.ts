import { describe, expect, it } from "vitest";
import { issueImageReferences, selectIssueImages } from "./issueImageSelection";

const id = (suffix: number) => `00000000-0000-4000-8000-0000000000${String(suffix).padStart(2, "0")}`;
const TASK = "00000000-0000-4000-8000-0000000000ff";
const published = (imageId: string, extension = "png") => `https://github.com/acme/shop/blob/flow-dev-assets/issue-images/${TASK}/${imageId}.${extension}?raw=true`;
const stored = (suffix: number, contentType = "image/png") => ({ id: id(suffix), contentType, byteSize: 100 + suffix, sha256: `${suffix}`.repeat(64).slice(0, 64) });

describe("issueImageReferences", () => {
  it("V-13a reads the draft and the published forms in the order of the text", () => {
    const body = `Texto\n![tela B](flow-image:${id(2)})\nmais\n![tela A](${published(id(1))})\n![](flow-image:${id(3)})\n![outra](https://example.com/x.png)`;
    expect(issueImageReferences(body)).toEqual([{ id: id(2), alt: "tela B" }, { id: id(1), alt: "tela A" }, { id: id(3), alt: "" }]);
  });

  it("lists an image used twice only once, at its first position", () => {
    const body = `![a](flow-image:${id(1)}) ![b](flow-image:${id(2)}) ![c](flow-image:${id(1)})`;
    expect(issueImageReferences(body).map((reference) => reference.id)).toEqual([id(1), id(2)]);
  });
});

describe("selectIssueImages", () => {
  it("V-13a keeps the body order, names, types and sizes, and skips images that no longer exist", () => {
    const references = [{ id: id(2), alt: "tela B" }, { id: id(9), alt: "sumida" }, { id: id(1), alt: "tela A" }];
    const result = selectIssueImages(references, [stored(1), stored(2, "image/jpeg")]);
    expect(result.map((image) => [image.id, image.name, image.contentType, image.byteSize])).toEqual([[id(2), "tela B", "image/jpeg", 102], [id(1), "tela A", "image/png", 101]]);
  });

  it("names an image without alt text by its position and extension", () => {
    const references = [{ id: id(1), alt: "" }, { id: id(2), alt: "" }];
    expect(selectIssueImages(references, [stored(1), stored(2, "image/webp")]).map((image) => image.name)).toEqual(["imagem-1.png", "imagem-2.webp"]);
  });

  it("V-13b preselects only the first 10 of 12 images", () => {
    const numbers = Array.from({ length: 12 }, (_value, index) => index + 1);
    const result = selectIssueImages(numbers.map((number) => ({ id: id(number), alt: `i${number}` })), numbers.map((number) => stored(number)));
    expect(result.filter((image) => image.preselected)).toHaveLength(10);
    expect(result.slice(10).map((image) => image.preselected)).toEqual([false, false]);
  });
});
