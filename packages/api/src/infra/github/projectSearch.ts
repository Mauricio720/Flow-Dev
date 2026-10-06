import type { RepositoryIdentity } from "../../application/database/dao/projectDao";
import type { ScopedContextResult, ScopedEvidence } from "../../application/github/scopedContextGateway";
import { fileEvidence, fullName, repoPath, safePath, safeQuery } from "./scopedContextHelpers";

const MAX_SEARCH_FILES = 5;
const MAX_SEARCH_EVIDENCE = 10;
const MAX_MATCHES_PER_FILE = 2;
const MAX_EXCERPT_CHARS = 2_000;
const MIN_TERM_LENGTH = 2;
const FIRST_LINE = 1;
const TREE_BLOB_TYPE = "blob";
const READABLE_FILE_TYPE = "file";

type Json = Record<string, unknown>;
type SourceLine = { number: number; text: string };
type SearchMatch = { path: string; line: number; excerpt: string; commitSha: string; url: string };
type SearchCollector = { scope: ProjectScope; terms: string[]; matches: SearchMatch[]; evidence: ScopedEvidence[] };
export type ProjectScope = { repository: RepositoryIdentity; commitSha: string };
export type ProjectReader = { get(path: string): Promise<Json>; file(path: string): Promise<{ type: string; text: string }> };

export async function searchProject(reader: ProjectReader, scope: ProjectScope, rawQuery: string): Promise<ScopedContextResult> {
  const query = safeQuery(rawQuery);
  const repository = fullName(scope.repository);
  const collector: SearchCollector = { scope, terms: searchTerms(query), matches: [], evidence: [] };
  const indexedPaths = await codeSearchPaths(reader, repository, query).catch(() => []);
  const paths = indexedPaths.length ? indexedPaths : await treeSearchPaths(reader, scope, collector.terms);
  for (const path of paths) await collectFileMatches(reader, collector, path);
  const status = collector.matches.length ? "done" : "empty";
  return { status, data: { query, repository, commitSha: scope.commitSha, matches: collector.matches }, evidence: collector.evidence };
}

function searchTerms(query: string) {
  return query.toLowerCase().split(/[^\p{L}\p{N}_-]+/u).filter((term) => term.length >= MIN_TERM_LENGTH);
}

async function codeSearchPaths(reader: ProjectReader, repository: string, query: string) {
  const search = await reader.get(`/search/code?q=${encodeURIComponent(`repo:${repository} ${query}`)}&per_page=${MAX_SEARCH_FILES}`);
  const items = Array.isArray(search.items) ? search.items.slice(0, MAX_SEARCH_FILES) as Json[] : [];
  return items.filter((item) => typeof item.path === "string" && repositoryName(item) === repository).map((item) => safePath(String(item.path)));
}

function repositoryName(item: Json) {
  return item.repository && typeof item.repository === "object" ? (item.repository as Json).full_name : undefined;
}

async function treeSearchPaths(reader: ProjectReader, scope: ProjectScope, terms: string[]) {
  const tree = await reader.get(`/repos/${repoPath(scope.repository)}/git/trees/${scope.commitSha}?recursive=1`);
  const entries = Array.isArray(tree.tree) ? tree.tree as Json[] : [];
  const paths = entries.filter((entry) => entry.type === TREE_BLOB_TYPE && typeof entry.path === "string").map((entry) => String(entry.path));
  return rankPathsByTerms(paths.filter(isSafePath), terms).slice(0, MAX_SEARCH_FILES);
}

function rankPathsByTerms(paths: string[], terms: string[]) {
  const scored = paths.map((path) => ({ path, score: terms.filter((term) => path.toLowerCase().includes(term)).length }));
  return scored.filter((entry) => entry.score > 0).sort((left, right) => right.score - left.score || left.path.length - right.path.length).map((entry) => entry.path);
}

function isSafePath(path: string) {
  try { return safePath(path) === path; } catch { return false; }
}

async function collectFileMatches(reader: ProjectReader, collector: SearchCollector, path: string) {
  const remaining = MAX_SEARCH_EVIDENCE - collector.evidence.length;
  if (remaining <= 0) return;
  const file = await reader.file(path);
  if (file.type !== READABLE_FILE_TYPE) return;
  const lines = file.text.split(/\r?\n/u).map((text, index) => ({ number: index + 1, text }));
  const matching = lines.filter((line) => collector.terms.some((term) => line.text.toLowerCase().includes(term)));
  const selected = matching.length ? matching.slice(0, Math.min(remaining, MAX_MATCHES_PER_FILE)) : [lines[FIRST_LINE - 1] ?? { number: FIRST_LINE, text: "" }];
  for (const line of selected) addMatch(collector, path, line);
}

function addMatch(collector: SearchCollector, path: string, line: SourceLine) {
  const { repository, commitSha } = collector.scope;
  const excerpt = line.text.trim().slice(0, MAX_EXCERPT_CHARS);
  const evidence = fileEvidence(repository, commitSha, path, line.number, line.number, excerpt);
  collector.evidence.push(evidence);
  collector.matches.push({ path, line: line.number, excerpt, commitSha, url: evidence.url ?? "" });
}
