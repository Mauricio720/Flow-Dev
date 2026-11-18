import { describe, expect, it } from "vitest";
import { MAX_MESSAGE_IMAGES, validateMessageImages, withAttachmentSection } from "./issueAttachmentRules";
import { TaskError } from "./taskErrors";

const first = "00000000-0000-4000-8000-0000000000a1";
const second = "00000000-0000-4000-8000-0000000000a2";

describe("issue attachment rules", () => {
  it("appends message images to the body in order under their own section", () => {
    expect(withAttachmentSection("## Contexto\n\nTela quebrada", [first, second])).toBe(`## Contexto\n\nTela quebrada\n\n## Imagens anexadas\n\n![Imagem anexada 1](flow-image:${first})\n\n![Imagem anexada 2](flow-image:${second})`);
  });

  it("leaves out images the draft already shows and keeps a body without attachments unchanged", () => {
    const body = `## Contexto\n\n![tela](flow-image:${first})`;
    expect(withAttachmentSection(body, [first])).toBe(body);
    expect(withAttachmentSection(body, [first, second])).toBe(`${body}\n\n## Imagens anexadas\n\n![Imagem anexada 1](flow-image:${second})`);
    expect(withAttachmentSection("Corpo", [])).toBe("Corpo");
  });

  it("deduplicates message images and refuses more than the per-message limit", () => {
    expect(validateMessageImages([first, first, second])).toEqual([first, second]);
    const tooMany = Array.from({ length: MAX_MESSAGE_IMAGES + 1 }, (_, index) => `00000000-0000-4000-8000-0000000001${String(index).padStart(2, "0")}`);
    expect(() => validateMessageImages(tooMany)).toThrowError(new TaskError("image_limit"));
  });
});
