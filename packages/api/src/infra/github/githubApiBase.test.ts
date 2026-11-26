import { afterEach, describe, expect, it, vi } from "vitest";
import { githubApiBase } from "./githubRequest";

const GITHUB_API_ROOT = "https://api.github.com";
const FAKE_GITHUB_URL = "http://127.0.0.1:3199";

describe("githubApiBase", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses the public GitHub API when no override is set", () => {
    vi.stubEnv("FLOW_DEV_GITHUB_API_URL", "");
    expect(githubApiBase()).toBe(GITHUB_API_ROOT);
  });

  it("uses the override outside production", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("FLOW_DEV_GITHUB_API_URL", FAKE_GITHUB_URL);
    expect(githubApiBase()).toBe(FAKE_GITHUB_URL);
  });

  it("ignores the override in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("FLOW_DEV_GITHUB_API_URL", FAKE_GITHUB_URL);
    expect(githubApiBase()).toBe(GITHUB_API_ROOT);
  });
});
