import { vi } from "vitest";
import { githubResponse } from "./fixture";
import { applyMutation, assigneePage, itemsPage, rawItem } from "./assigned-world-responses";

export const BOARD_ID = "PVT_board";
export const STATUS_FIELD_ID = "PVTSSF_status";
export const OPTIONS = { backlog: "opt_backlog", ready: "opt_ready", progress: "opt_progress" };
export type WorldIssue = { id: string; number: number; title: string; body: string; state: string; repositoryNodeId: string; repositoryId: number; assignees: number[] };
export type WorldItem = { id: string; project: string; archived: boolean; type: string; status: string | null; issue: WorldIssue | null };
export type MutationMode = "ok" | "drop" | "applied_then_drop" | "forbidden" | "rate_limited";

function defaultOptions() {
  return [{ id: OPTIONS.backlog, name: "Backlog" }, { id: OPTIONS.ready, name: "Ready" }, { id: OPTIONS.progress, name: "In Progress" }];
}

export function issue(number: number, assignees: number[], overrides: Partial<WorldIssue> = {}): WorldIssue {
  return { id: `I_fixture_${number}`, number, title: `Issue ${number}`, body: `Body ${number}`, state: "OPEN", repositoryNodeId: "R_202", repositoryId: 202, assignees, ...overrides };
}

export class GitHubWorld {
  items = new Map<string, WorldItem>();
  options = defaultOptions();
  mutation: MutationMode = "ok";
  failAssigned: "transport" | "rate_limited" | null = null;
  assigneePageSize = 100;
  afterMutation: (() => void) | null = null;
  mutations: string[] = [];
  queries: string[] = [];
  readonly fetcher = vi.fn<typeof fetch>(async (url, init) => this.handle(String(url), init));

  reset() {
    this.items = new Map();
    this.options = defaultOptions();
    Object.assign(this, { mutation: "ok", failAssigned: null, assigneePageSize: 100, afterMutation: null, mutations: [], queries: [] });
    this.fetcher.mockClear();
    this.add({ id: "PVTI_fixture_41", issue: issue(41, [88, 99]) });
  }

  add(item: Partial<WorldItem> & { id: string; issue: WorldIssue | null }) {
    this.items.set(item.id, { project: BOARD_ID, archived: false, type: item.issue ? "Issue" : "DraftIssue", status: OPTIONS.ready, ...item });
  }

  private async handle(url: string, init?: RequestInit) {
    const body = typeof init?.body === "string" ? JSON.parse(init.body) as { query: string; variables: Record<string, unknown> } : null;
    if (!url.endsWith("/graphql") || !body) return githubResponse(url);
    const route = this.route(body.query);
    if (!route) return githubResponse(url);
    this.queries.push(route);
    if (this.failAssigned === "transport") throw new TypeError("network down");
    if (this.failAssigned === "rate_limited") return new Response("{}", { status: 429, headers: { "retry-after": "30" } });
    return this.respond(route, body.variables);
  }

  private route(query: string) {
    if (query.includes("updateProjectV2ItemFieldValue")) return "mutation";
    if (query.includes("assignees(first:100,after:$after)")) return "assignees";
    if (query.includes("items(first:$first")) return "items";
    if (query.includes("... on ProjectV2Item {")) return "item";
    if (query.includes('field(name:"Status")') && query.includes("closed")) return "board";
    return null;
  }

  private respond(route: string, variables: Record<string, unknown>) {
    if (route === "board") return Response.json({ data: { node: { id: BOARD_ID, title: "Board", url: "https://github.com/orgs/acme/projects/1", closed: false, field: { id: STATUS_FIELD_ID, options: this.options } } } });
    if (route === "mutation") return applyMutation(this, variables);
    if (route === "item") return Response.json({ data: { node: rawItem(this.items.get(String(variables.id)), this.assigneePageSize) } });
    if (route === "assignees") return assigneePage(this, { issueId: String(variables.id), after: variables.after as string | null });
    return itemsPage(this, { after: variables.after as string | null, first: Number(variables.first) });
  }
}
