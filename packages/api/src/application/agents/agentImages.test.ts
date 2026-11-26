import { describe, expect, it } from "vitest";
import { MAX_AGENT_IMAGE_BYTES, selectAgentImages, type ImageCandidate } from "./agentImages";

function candidate(id: string, day: number, byteSize = 1, available = true): ImageCandidate {
  return { id, contentType: "image/png", byteSize, createdAt: new Date(`2026-01-${String(day).padStart(2, "0")}T00:00:00Z`), origin: { kind: "message", messageNumber: day }, available };
}

describe("selectAgentImages", () => {
  it("V-01a selects the ten newest and preserves presentation order", () => {
    const input = Array.from({ length: 12 }, (_, index) => candidate(`image-${index + 1}`, index + 1, 100_000));
    const result = selectAgentImages(input);
    expect(result.selected.map(({ id }) => id)).toEqual(input.slice(2).map(({ id }) => id));
    expect(result.omitted).toEqual(input.slice(0, 2).map(({ id, origin }) => ({ id, origin, reason: "limit" })));
  });

  it("V-01b skips an image that exceeds the byte budget and considers smaller images", () => {
    const big = 4_718_592;
    const input = [candidate("large-1", 6, big), candidate("large-2", 5, big), candidate("large-3", 4, big), candidate("large-4", 3, big), candidate("large-5", 2, big), candidate("small", 1, 200_000)];
    const result = selectAgentImages(input);
    expect(result.selected.map(({ id }) => id)).toEqual(["large-1", "large-2", "large-3", "large-4", "small"]);
    expect(result.omitted.map(({ id, reason }) => [id, reason])).toEqual([["large-5", "limit"]]);
  });

  it("V-01c keeps the first origin when an id is duplicated", () => {
    const first = candidate("same", 1);
    const duplicate = { ...candidate("same", 2), origin: { kind: "draft" as const, caption: "draft" } };
    const result = selectAgentImages([first, duplicate]);
    expect(result.selected).toEqual([first]);
    expect(result.omitted).toEqual([]);
  });

  it("V-01d marks unavailable images without using a slot", () => {
    const input = [candidate("missing", 1, 1, false), ...Array.from({ length: 10 }, (_, index) => candidate(`image-${index}`, index + 2))];
    const result = selectAgentImages(input);
    expect(result.selected).toHaveLength(10);
    expect(result.omitted.map(({ id, reason }) => [id, reason])).toEqual([["missing", "unavailable"]]);
  });

  it("V-01e returns empty lists for no candidates", () => {
    expect(selectAgentImages([])).toEqual({ selected: [], omitted: [] });
  });

  it("V-01f breaks date ties by id while returning input order", () => {
    const input = [...Array.from({ length: 9 }, (_, index) => candidate(`base-${index}`, index + 21)), candidate("z-tie", 20), candidate("a-tie", 20)];
    const result = selectAgentImages(input);
    expect(result.selected.map(({ id }) => id)).toEqual(input.filter(({ id }) => id !== "z-tie").map(({ id }) => id));
    expect(result.omitted.map(({ id }) => id)).toEqual(["z-tie"]);
  });

  it("V-01g includes exactly 20 MB and omits a candidate that adds one byte", () => {
    const exact = [candidate("first", 1, MAX_AGENT_IMAGE_BYTES - 1), candidate("last", 2, 1)];
    expect(selectAgentImages(exact).selected).toEqual(exact);
    const over = [candidate("first", 2, MAX_AGENT_IMAGE_BYTES - 1), candidate("last", 1, 2)];
    expect(selectAgentImages(over).omitted.map(({ id, reason }) => [id, reason])).toEqual([["last", "limit"]]);
  });
});
