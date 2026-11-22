import { describe, expect, it } from "vitest";
import { MAX_CHECKOUT_PATH_LENGTH, isValidCheckoutPath, matchesRepository, repositorySlugOf } from "./localCheckoutRules";

describe("isValidCheckoutPath", () => {
  it("V-01b refuses relative, empty and oversized paths", () => {
    expect(isValidCheckoutPath("shop")).toBe(false);
    expect(isValidCheckoutPath("")).toBe(false);
    expect(isValidCheckoutPath(`/${"a".repeat(MAX_CHECKOUT_PATH_LENGTH)}`)).toBe(false);
  });

  it("V-01b accepts an absolute path of exactly 1024 characters and accents", () => {
    expect(isValidCheckoutPath(`/${"a".repeat(MAX_CHECKOUT_PATH_LENGTH - 1)}`)).toBe(true);
    expect(isValidCheckoutPath("/home/ana/Área de trabalho/shop")).toBe(true);
  });
});

describe("repositorySlugOf", () => {
  it.each([
    "https://github.com/acme/shop",
    "https://github.com/acme/shop.git",
    "git@github.com:acme/shop.git",
    "git@github.com:acme/shop",
    "ssh://git@github.com/acme/shop.git",
    "https://GitHub.com/ACME/Shop.git",
    "https://github.com/acme/shop/",
  ])("V-01h reads %s as acme/shop", (remote) => {
    expect(repositorySlugOf(remote)).toBe("acme/shop");
  });

  it.each([
    "https://gitlab.com/acme/shop.git",
    "git@gitlab.com:acme/shop.git",
    "not a url",
    "https://github.com/acme",
    "https://github.com/acme/shop/extra",
    "file:///srv/acme/shop",
    "",
  ])("V-01h returns null for %s", (remote) => {
    expect(repositorySlugOf(remote)).toBeNull();
  });
});

describe("matchesRepository", () => {
  it("matches when any remote points at the project repository, ignoring case", () => {
    const remotes = ["git@github.com:ana/shop.git", "https://github.com/ACME/shop"];
    expect(matchesRepository(remotes, "acme/shop")).toBe(true);
    expect(matchesRepository(remotes, "Acme/Shop")).toBe(true);
    expect(matchesRepository(["https://github.com/acme/blog"], "acme/shop")).toBe(false);
  });
});
