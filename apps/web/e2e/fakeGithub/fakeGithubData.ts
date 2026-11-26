import type { Sql } from "postgres";
import { FAKE_BOARD } from "./fakeBoard";

const OPEN_ISSUE_STATE = "OPEN";

type RepositoryRow = { githubId: string; nodeId: string; owner: string; name: string; visibility: string; archived: boolean };
type ItemRow = RepositoryRow & { itemId: string; optionId: string; issueNodeId: string; issueNumber: number; issueUrl: string; title: string; body: string; operatorGithubId: string | null; operatorLogin: string | null };

const REPOSITORY_COLUMNS = "p.github_repository_id as \"githubId\", p.github_node_id as \"nodeId\", p.repository_owner as owner, p.repository_name as name, p.repository_visibility as visibility, p.repository_archived as archived";
const ITEM_QUERY = `select ${REPOSITORY_COLUMNS}, c.board_item_id as "itemId", c.option_id as "optionId", s.issue_node_id as "issueNodeId", s.issue_number as "issueNumber", s.issue_url as "issueUrl", snap.title, snap.body_markdown as body, a.account_id as "operatorGithubId", u.name as "operatorLogin"
  from task_issue_claims c
  join task_issue_sources s on s.id = c.source_id
  join projects p on p.id = s.project_id
  join lateral (select title, body_markdown from task_issue_snapshots where source_id = s.id order by revision desc limit 1) snap on true
  left join accounts a on a.user_id = coalesce(c.operator_user_id, c.candidate_user_id) and a.provider_id = 'github'
  left join users u on u.id = coalesce(c.operator_user_id, c.candidate_user_id)`;

export class FakeGithubData {
  constructor(private readonly sql: Sql) {}

  async repositoryByNodeId(nodeId: string) {
    const rows = await this.sql.unsafe<RepositoryRow[]>(`select ${REPOSITORY_COLUMNS} from projects p where p.github_node_id = $1`, [nodeId]);
    return rows[0] ?? null;
  }

  async repositoryByPath(owner: string, name: string) {
    const rows = await this.sql.unsafe<RepositoryRow[]>(`select ${REPOSITORY_COLUMNS} from projects p where p.repository_owner = $1 and p.repository_name = $2`, [owner, name]);
    return rows[0] ?? null;
  }

  async itemById(itemId: string) {
    const rows = await this.sql.unsafe<ItemRow[]>(`${ITEM_QUERY} where c.board_item_id = $1`, [itemId]);
    return rows[0] ?? null;
  }

  async itemByIssueNodeId(issueNodeId: string) {
    const rows = await this.sql.unsafe<ItemRow[]>(`${ITEM_QUERY} where s.issue_node_id = $1`, [issueNodeId]);
    return rows[0] ?? null;
  }

  async boardItems() {
    return this.sql.unsafe<ItemRow[]>(`${ITEM_QUERY} where c.board_node_id = $1`, [FAKE_BOARD.nodeId]);
  }

  async userByGithubId(githubId: string) {
    const rows = await this.sql<{ login: string }[]>`select u.name as login from accounts a join users u on u.id = a.user_id where a.provider_id = 'github' and a.account_id = ${githubId}`;
    return rows[0] ? { id: Number(githubId), login: rows[0].login } : null;
  }
}

export function repositoryRest(row: RepositoryRow) {
  const isPrivate = row.visibility !== "public";
  return { id: Number(row.githubId), node_id: row.nodeId, name: row.name, full_name: `${row.owner}/${row.name}`, owner: { login: row.owner }, private: isPrivate, visibility: row.visibility, archived: row.archived, default_branch: "main", permissions: { admin: true, maintain: true, push: true, triage: true, pull: true } };
}

export function repositoryNode(row: RepositoryRow) {
  return { id: row.nodeId, databaseId: Number(row.githubId), name: row.name, owner: { login: row.owner }, visibility: row.visibility.toUpperCase(), isArchived: row.archived };
}

export function assigneesOf(row: ItemRow) {
  const nodes = row.operatorGithubId ? [{ databaseId: Number(row.operatorGithubId), login: row.operatorLogin }] : [];
  return { nodes, pageInfo: { hasNextPage: false, endCursor: null } };
}

export function itemNode(row: ItemRow) {
  const author = row.operatorGithubId ? { __typename: "User", databaseId: Number(row.operatorGithubId), login: row.operatorLogin } : null;
  const issue = { __typename: "Issue", id: row.issueNodeId, number: row.issueNumber, url: row.issueUrl, title: row.title, body: row.body, state: OPEN_ISSUE_STATE, updatedAt: new Date().toISOString(), repository: { id: row.nodeId, databaseId: Number(row.githubId), name: row.name, owner: { login: row.owner } }, author, assignees: assigneesOf(row) };
  return { id: row.itemId, isArchived: false, project: { id: FAKE_BOARD.nodeId }, status: { optionId: row.optionId }, content: issue };
}

export function deletableIssueNode(row: ItemRow) {
  const { content } = itemNode(row);
  return { __typename: "Issue", id: content.id, number: content.number, title: content.title, viewerCanDelete: true, author: content.author, repository: content.repository };
}
