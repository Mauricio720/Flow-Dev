import { describe, expect, it } from "vitest";
import { parsePlanningBaseUrl } from "./planningConfiguration";

const unconfigured = expect.objectContaining({ reason: "planning_unconfigured" });

describe("parsePlanningBaseUrl", () => {
  it.each(["https://planning.example", "http://localhost:4000", "http://127.0.0.1:4000", "http://[::1]:4000"])("accepts %s", (value) => {
    expect(parsePlanningBaseUrl(value).href).toContain(new URL(value).host);
  });

  it.each([undefined, "", "not a url", "http://planning.example", "ftp://planning.example"])("rejects %s", (value) => {
    expect(() => parsePlanningBaseUrl(value)).toThrowError(unconfigured);
  });
});
