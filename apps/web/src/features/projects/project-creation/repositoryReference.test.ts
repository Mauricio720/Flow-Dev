import { describe, expect, it } from "vitest";
import { parseRepositoryReference } from "./repositoryReference";

describe("direct repository reference", () => {
  it("UT-006 rejects a foreign URL and an incomplete path with a field error", () => {
    expect(parseRepositoryReference("https://evil.example/acme/private")).toMatchObject({ ok: false });
    expect(parseRepositoryReference("acme/")).toMatchObject({ ok: false });
    expect(parseRepositoryReference("acme/private/../outro")).toMatchObject({ ok: false });
    expect(parseRepositoryReference("acme/..")).toMatchObject({ ok: false });
  });

  it("accepts owner/name and the same path written as a github.com address", () => {
    expect(parseRepositoryReference(" acme/private ")).toEqual({ ok: true, owner: "acme", name: "private" });
    expect(parseRepositoryReference("https://github.com/acme/loja.web.git")).toEqual({ ok: true, owner: "acme", name: "loja.web" });
  });
});
