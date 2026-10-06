export type SafeLink = { kind: "external"; href: string } | { kind: "document"; documentId: string } | { kind: "anchor"; id: string } | { kind: "inert" };
export type LinkContext = { currentPath: string; documents: readonly { id: string; path: string }[] };

const INERT: SafeLink = { kind: "inert" };
const SCHEME = /^[a-zA-Z][a-zA-Z0-9+.-]*:/;
const HTTPS_PROTOCOL = "https:";

function resolvePackagePath(currentPath: string, target: string) {
  const base = currentPath.split("/").slice(0, -1);
  const parts = target.startsWith("/") ? [] : base;
  for (const segment of target.split("/")) {
    if (segment === "" || segment === ".") continue;
    if (segment === "..") { if (parts.length === 0) return null; parts.pop(); } else parts.push(segment);
  }
  return parts.join("/");
}

export function safeSpecLink(href: string, context: LinkContext): SafeLink {
  const value = href.trim();
  if (!value || /[\u0000-\u001f\\]/.test(value)) return INERT;
  if (value.startsWith("#")) return value.length > 1 ? { kind: "anchor", id: value.slice(1) } : INERT;
  if (SCHEME.test(value) || value.startsWith("//")) return externalLink(value);
  const [target] = value.split("#");
  const path = resolvePackagePath(context.currentPath, target ?? "");
  const document = path ? context.documents.find((candidate) => candidate.path === path) : undefined;
  return document ? { kind: "document", documentId: document.id } : INERT;
}

function externalLink(value: string): SafeLink {
  try {
    const url = new URL(value);
    return url.protocol === HTTPS_PROTOCOL && url.hostname ? { kind: "external", href: url.toString() } : INERT;
  } catch { return INERT; }
}
