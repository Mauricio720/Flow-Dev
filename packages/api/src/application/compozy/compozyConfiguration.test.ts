import { describe, expect, it } from "vitest";
import { parseCompozyUrl } from "./compozyConfiguration";

const unconfigured = expect.objectContaining({ reason: "compozy_unconfigured" });

describe("UT-029 parseCompozyUrl", () => {
  it.each(["http://127.0.0.1:2123", "http://localhost:2123", "http://[::1]:2123"])("accepts the loopback address %s", (value) => {
    expect(parseCompozyUrl(value)).toBe(new URL(value).origin);
  });

  it.each([undefined, "", "not a url", "http://10.0.0.5:2123", "https://compozy.example", "ftp://127.0.0.1:2123", "http://user:secret@127.0.0.1:2123"])("rejects %s", (value) => {
    expect(() => parseCompozyUrl(value)).toThrowError(unconfigured);
  });
});
