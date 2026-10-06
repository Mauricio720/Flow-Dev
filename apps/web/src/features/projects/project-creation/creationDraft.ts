import type { ProjectDetailsDraft } from "@/lib/projects/detailsValidation";

const DRAFT_KEY = "flow-dev:project-draft";
const EMPTY_DRAFT: ProjectDetailsDraft = { name: "", description: "" };
const listeners = new Set<() => void>();
let current: ProjectDetailsDraft | null = null;

function stored(): ProjectDetailsDraft {
  try {
    const parsed: unknown = JSON.parse(window.sessionStorage.getItem(DRAFT_KEY) ?? "null");
    if (!parsed || typeof parsed !== "object" || !("name" in parsed) || !("description" in parsed)) return EMPTY_DRAFT;
    return { name: String(parsed.name), description: String(parsed.description) };
  } catch {
    return EMPTY_DRAFT;
  }
}

function persist(draft: ProjectDetailsDraft | null) {
  try {
    if (draft) window.sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    else window.sessionStorage.removeItem(DRAFT_KEY);
  } catch {}
}

function publish(draft: ProjectDetailsDraft, persisted: ProjectDetailsDraft | null) {
  current = draft;
  persist(persisted);
  listeners.forEach((listener) => listener());
}

// The draft survives the round trip to GitHub's consent screen; storage may be unavailable, so memory stays the source of truth.
export const creationDraftStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  read() {
    current ??= stored();
    return current;
  },
  empty: () => EMPTY_DRAFT,
  write: (draft: ProjectDetailsDraft) => publish(draft, draft),
  clear: () => publish(EMPTY_DRAFT, null),
};
