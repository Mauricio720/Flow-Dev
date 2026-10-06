import type { AccessDao } from "../../database/dao/accessDao";
import type { ProjectDao, RepositoryIdentity } from "../../database/dao/projectDao";
import type { PublishedIssueDraft, PublishedIssueDraftDao } from "../../database/dao/publishedIssueDao";
import type { GitHubIssueLabelGateway, IssueLabelOutcome } from "../../github/issueGateway";
import type { RepositoryAuthorizationService } from "../../github/repositoryAuthorizationService";
import { RepositoryAuthorizationNeededError } from "../../github/repositoryErrors";
import { ProjectAdminRequiredError, ProjectUnavailableError } from "../access/projectAccessService";
import { storedDraftLabels } from "./draftRules";
import { defineTaskLabels } from "./labelDefinitions";

export type LabelBackfillAction = IssueLabelOutcome | "to_label" | "unreadable_draft" | "failed";
export type LabelBackfillItem = { issueNumber: number; issueUrl: string; title: string; labels: string[]; action: LabelBackfillAction };
type Dependencies = { projects: ProjectDao; permissions: AccessDao; issues: PublishedIssueDraftDao; authorization: RepositoryAuthorizationService; github: GitHubIssueLabelGateway };
type BackfillInput = { projectId: string; userId: string; apply: boolean };
type RepositoryAccess = { token: string; repository: RepositoryIdentity; apply: boolean };

export class LabelBackfillService {
  constructor(private readonly dependencies: Dependencies) {}

  async run(input: BackfillInput) {
    if (!await this.dependencies.permissions.isAdmin(input.userId)) throw new ProjectAdminRequiredError();
    const project = await this.dependencies.projects.findById?.(input.projectId);
    if (!project?.repository) throw new ProjectUnavailableError();
    const token = await this.dependencies.authorization.accessToken(input.userId);
    if (!token) throw new RepositoryAuthorizationNeededError();
    const access = { token, repository: project.repository, apply: input.apply };
    const issues = await this.dependencies.issues.listDraftsByProject(input.projectId);
    const definitions = input.apply ? await this.define(access, issues) : [];
    const items: LabelBackfillItem[] = [];
    for (const issue of issues) items.push(await this.settle(access, issue));
    return { repository: `${project.repository.owner}/${project.repository.name}`, applied: input.apply, definitions, items };
  }

  private define(access: RepositoryAccess, issues: PublishedIssueDraft[]) {
    const destination = { owner: access.repository.owner, name: access.repository.name, token: access.token };
    return defineTaskLabels(this.dependencies.github, { destination, labels: issues.flatMap((issue) => storedDraftLabels(issue.canonicalDraft)), overwrite: true });
  }

  private async settle(access: RepositoryAccess, issue: PublishedIssueDraft): Promise<LabelBackfillItem> {
    const labels = storedDraftLabels(issue.canonicalDraft);
    const item = { issueNumber: issue.issueNumber, issueUrl: issue.issueUrl, title: issue.title, labels };
    if (!labels.length) return { ...item, action: "unreadable_draft" };
    if (!access.apply) return { ...item, action: "to_label" };
    return { ...item, action: await this.label(access, issue.issueNumber, labels) };
  }

  private async label(access: RepositoryAccess, issueNumber: number, labels: string[]): Promise<LabelBackfillAction> {
    try { return await this.dependencies.github.label({ owner: access.repository.owner, name: access.repository.name, token: access.token, issueNumber, labels }); }
    catch { return "failed"; }
  }
}
