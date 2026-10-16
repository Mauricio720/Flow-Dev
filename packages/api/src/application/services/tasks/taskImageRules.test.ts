import { describe, expect, it } from "vitest";
import { TaskError } from "./taskErrors";
import { MAX_IMAGE_BYTES, imageContentType, imageReferenceIds, issueImagePath, resolveImageReferences } from "./taskImageRules";

const taskId = "00000000-0000-4000-8000-000000000011";
const imageId = "00000000-0000-4000-8000-0000000000a1";
const otherImageId = "00000000-0000-4000-8000-0000000000a2";
const ascii = (text: string) => [...text].map((character) => character.charCodeAt(0));
const bytes = (...values: number[]) => new Uint8Array([...values, 0, 0, 0, 0]);

describe("task image rules", () => {
  it("detects the image type from the file signature, not from the declared name", () => {
    expect(imageContentType(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))).toBe("image/png");
    expect(imageContentType(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe("image/jpeg");
    expect(imageContentType(bytes(...ascii("GIF89a")))).toBe("image/gif");
    expect(imageContentType(bytes(...ascii("RIFF"), 1, 2, 3, 4, ...ascii("WEBP")))).toBe("image/webp");
  });

  it("rejects SVG, text, empty and oversized content", () => {
    expect(() => imageContentType(new Uint8Array(ascii("<svg xmlns=\"http://www.w3.org/2000/svg\"></svg>")))).toThrowError(new TaskError("unsupported_image_type"));
    expect(() => imageContentType(new Uint8Array())).toThrowError(new TaskError("unsupported_image_type"));
    const oversized = new Uint8Array(MAX_IMAGE_BYTES + 1);
    oversized.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(() => imageContentType(oversized)).toThrowError(new TaskError("image_too_large"));
  });

  it("lists each referenced image once and ignores external images", () => {
    const body = `![a](flow-image:${imageId})\n![b](https://example.com/x.png)\n![c](flow-image:${imageId}) ![d](flow-image:${otherImageId})`;
    expect(imageReferenceIds(body)).toEqual([imageId, otherImageId]);
  });

  it("resolves references to the deterministic address on the assets branch", () => {
    const image = { id: imageId, taskId, contentType: "image/png" };
    const body = resolveImageReferences(`Tela:\n![tela quebrada](flow-image:${imageId})`, [image], { owner: "acme", name: "cart" });
    expect(issueImagePath(image)).toBe(`issue-images/${taskId}/${imageId}.png`);
    expect(body).toBe(`Tela:\n![tela quebrada](https://github.com/acme/cart/blob/flow-dev-assets/issue-images/${taskId}/${imageId}.png?raw=true)`);
  });

  it("refuses to publish a reference to an image the task does not own", () => {
    expect(() => resolveImageReferences(`![x](flow-image:${imageId})`, [], { owner: "acme", name: "cart" })).toThrowError(new TaskError("image_unavailable"));
  });
});
