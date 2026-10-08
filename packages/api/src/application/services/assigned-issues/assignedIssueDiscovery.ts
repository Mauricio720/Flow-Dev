import type { SessionPrincipal } from "../../../context";
import type { AssignedIssueGateway, BoardItemFacts } from "../../github/assignedIssueGateway";
import type { RepositoryAccessService } from "../projects/repositoryAccessService";
import { READY_STATUS_NAME, findOption } from "./assignedIssueRules";
import { AssignedIssueError } from "./assignedIssueErrors";
import { translateAssignedIssueError, translated } from "./assignedIssueTranslation";
import { decodeBoundCursor, encodeBoundCursor } from "./assignedIssueCursor";
import type { AssignedIssueItem, AssignedQueuePage } from "./assignedIssueContracts";
import type { AssignedIssueVerifier, VerifyContext } from "./assignedIssueVerifier";

const MAX_PROVIDER_PAGES = 2;
const MAX_PROVIDER_PAGE_SIZE = 50;
type ListInput = { projectId: string; cursor?: string; limit: number };
type Scan = { items: AssignedIssueItem[]; after: string | null; hasNext: boolean; failure: { retryAfterSeconds: number | null } | null; scanned: number };

export class AssignedIssueDiscovery {
  constructor(private readonly repositories: RepositoryAccessService, private readonly gateway: AssignedIssueGateway, private readonly verifier: AssignedIssueVerifier) {}

  async list(actor: SessionPrincipal, input: ListInput): Promise<AssignedQueuePage> {
    const context = await translated(() => this.repositories.personalContext(actor, input.projectId));
    if (!context.board) throw new AssignedIssueError("board_missing");
    const binding = { projectId: input.projectId, actorId: actor.userId, boardId: context.board.nodeId };
    const start = decodeBoundCursor(input.cursor, binding);
    const field = await translated(() => this.gateway.statusField(context.token, context.board!.nodeId));
    const ready = findOption(field.options, READY_STATUS_NAME);
    if (!ready) throw new AssignedIssueError("ready_missing");
    const verifyContext: VerifyContext = { token: context.token, githubUserId: context.githubUserId, boardNodeId: context.board.nodeId, repository: { githubId: context.repository.githubId, nodeId: context.repository.nodeId } };
    const scan = await this.scan({ context: verifyContext, readyOptionId: ready.id, after: typeof start === "string" ? start : null, limit: input.limit });
    return toPage(scan, binding);
  }

  private async scan(input: { context: VerifyContext; readyOptionId: string; after: string | null; limit: number }): Promise<Scan> {
    const scan: Scan = { items: [], after: input.after, hasNext: true, failure: null, scanned: 0 };
    while (scan.hasNext && scan.items.length === 0 && scan.scanned < MAX_PROVIDER_PAGES) {
      try { await this.scanPage(scan, input); } catch (error) { return this.failed(scan, error); }
    }
    return scan;
  }

  private async scanPage(scan: Scan, input: { context: VerifyContext; readyOptionId: string; limit: number }) {
    const page = await this.gateway.itemsPage(input.context.token, { boardNodeId: input.context.boardNodeId, after: scan.after, first: Math.min(input.limit, MAX_PROVIDER_PAGE_SIZE) });
    const seen = new Set<string>();
    for (const item of page.items) if (await this.isEligible(input, item) && !seen.has(item.issue!.nodeId!)) { seen.add(item.issue!.nodeId!); scan.items.push(toItem(item)); }
    scan.scanned += 1;
    scan.after = page.endCursor;
    scan.hasNext = page.hasNextPage;
  }

  private async isEligible(input: { context: VerifyContext; readyOptionId: string }, item: BoardItemFacts) {
    return await this.verifier.assessEligibility(input.context, item, input.readyOptionId) === "eligible";
  }

  private failed(scan: Scan, error: unknown): Scan {
    const translatedError = translateAssignedIssueError(error);
    if (scan.scanned === 0 || !(translatedError instanceof AssignedIssueError)) throw translatedError;
    return { ...scan, failure: { retryAfterSeconds: translatedError.retryAfterSeconds ?? null } };
  }
}

function toPage(scan: Scan, binding: { projectId: string; actorId: string; boardId: string }): AssignedQueuePage {
  const hasMore = scan.hasNext || Boolean(scan.failure);
  const nextCursor = hasMore ? encodeBoundCursor(binding, scan.after) : null;
  if (scan.failure) return { items: scan.items, nextCursor, availability: "retry_later", retryAfterSeconds: scan.failure.retryAfterSeconds };
  if (scan.items.length > 0) return { items: scan.items, nextCursor, availability: "available", retryAfterSeconds: null };
  return { items: [], nextCursor, availability: hasMore ? "scan_continuing" : "empty", retryAfterSeconds: null };
}

function toItem(item: BoardItemFacts): AssignedIssueItem {
  const issue = item.issue!;
  return { issueNodeId: issue.nodeId!, boardItemId: item.itemId, number: issue.number!, title: issue.title!, url: issue.url!, repository: { owner: issue.repositoryOwner ?? "", name: issue.repositoryName ?? "" }, assignees: issue.assignees, status: "Ready" };
}
