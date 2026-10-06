import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

vi.mock("@/lib/trpc/client", () => ({
  trpc: {
    taskSpec: {
      byTask: { query: vi.fn() },
      events: { query: vi.fn() },
      event: { query: vi.fn() },
      packages: { query: vi.fn() },
      package: { query: vi.fn() },
      document: { query: vi.fn() },
      submission: { query: vi.fn() },
      start: { mutate: vi.fn() },
      adjust: { mutate: vi.fn() },
      answer: { mutate: vi.fn() },
      permission: { mutate: vi.fn() },
      cancel: { mutate: vi.fn() },
      retry: { mutate: vi.fn() },
      returnToReview: { mutate: vi.fn() },
      approve: { mutate: vi.fn() },
    },
    projects: {
      list: { query: vi.fn() },
      byId: { query: vi.fn() },
      select: { mutate: vi.fn() },
      connectionStates: { query: vi.fn() },
      repositoryContext: { query: vi.fn() },
      repositoryCandidates: { query: vi.fn() },
      repositoryPreview: { query: vi.fn() },
      create: { mutate: vi.fn() },
      updateDetails: { mutate: vi.fn() },
      updateBoard: { mutate: vi.fn() },
    },
    tasks: {
      list: { query: vi.fn() },
      byId: { query: vi.fn() },
      messages: { query: vi.fn() },
      submission: { query: vi.fn() },
      preview: { query: vi.fn() },
      start: { mutate: vi.fn() },
      send: { mutate: vi.fn() },
      saveDraft: { mutate: vi.fn() },
      resolveRefinement: { mutate: vi.fn() },
      retryGeneration: { mutate: vi.fn() },
      publish: { mutate: vi.fn() },
      planning: {
        start: { mutate: vi.fn() },
        retry: { mutate: vi.fn() },
        selectRoute: { mutate: vi.fn() },
        approve: { mutate: vi.fn() },
        submission: { query: vi.fn() },
      },
    },
  },
}));

vi.mock("@/lib/auth/client", () => ({ authClient: { signOut: vi.fn(), getSession: vi.fn() } }));

vi.mock("next/navigation", () => {
  const router = { push: vi.fn(), replace: vi.fn(), refresh: vi.fn() };
  const redirect = vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT ${path}`);
  });
  return { useRouter: () => router, redirect };
});

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
  window.localStorage.clear();
  window.history.replaceState(null, "", "/");
  Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
});
