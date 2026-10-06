import { randomInt, randomUUID } from "node:crypto";
import type { Sql } from "postgres";

const GITHUB_PROVIDER = "github";
const SESSION_HOURS = 1;
const MAX_GITHUB_ID = 2_000_000_000;

export type SeededUser = { id: string; login: string; githubId: string; sessionToken: string };
export type SeededProject = { id: string; name: string; repository: string };
type ProjectOptions = { label?: string; description?: string | null; visibility?: "public" | "private"; assignedTo?: SeededUser[] };

function suffix() {
  return randomUUID().slice(0, 8);
}

function githubId() {
  return String(randomInt(1, MAX_GITHUB_ID));
}

export class ProjectSeed {
  private readonly userIds: string[] = [];
  private readonly projectIds: string[] = [];
  private readonly adminGithubIds: string[] = [];

  constructor(private readonly sql: Sql) {}

  async user(options: { admin?: boolean } = {}): Promise<SeededUser> {
    const login = `e2e-${suffix()}`;
    const account = githubId();
    const sessionToken = randomUUID();
    const [row] = await this.sql`insert into users (name, email) values (${login}, ${login + "@flowdev.invalid"}) returning id`;
    this.userIds.push(row.id);
    await this.sql`insert into accounts (user_id, provider_id, account_id) values (${row.id}, ${GITHUB_PROVIDER}, ${account})`;
    await this.sql`insert into sessions (token, user_id, expires_at) values (${sessionToken}, ${row.id}, now() + make_interval(hours => ${SESSION_HOURS}))`;
    if (options.admin) await this.designateAdmin(account, login);
    return { id: row.id, login, githubId: account, sessionToken };
  }

  async project(options: ProjectOptions = {}): Promise<SeededProject> {
    const key = suffix();
    const name = `${options.label ?? "Projeto"} ${key}`;
    const repository = { owner: `e2e-org-${key}`, name: `repo-${key}`, id: githubId() };
    const [row] = await this.sql`
      insert into projects (external_key, name, description, github_repository_id, github_node_id, repository_owner, repository_name, repository_visibility, repository_verified_at)
      values (${"e2e-" + key}, ${name}, ${options.description ?? null}, ${repository.id}, ${"R_" + repository.id}, ${repository.owner}, ${repository.name}, ${options.visibility ?? "private"}, now())
      returning id`;
    this.projectIds.push(row.id);
    for (const user of options.assignedTo ?? []) await this.assign(user, row.id);
    return { id: row.id, name, repository: `${repository.owner}/${repository.name}` };
  }

  async assign(user: SeededUser, projectId: string) {
    await this.sql`insert into project_assignments (user_id, project_id) values (${user.id}, ${projectId})`;
  }

  async unassign(user: SeededUser, project: SeededProject) {
    await this.sql`delete from project_assignments where user_id = ${user.id} and project_id = ${project.id}`;
  }

  async renameAsAnotherAdministrator(project: SeededProject, name: string) {
    await this.sql`update projects set name = ${name}, details_version = details_version + 1 where id = ${project.id}`;
  }

  async cleanup() {
    if (this.projectIds.length) await this.sql`delete from projects where id in ${this.sql(this.projectIds)}`;
    if (this.userIds.length) await this.sql`delete from users where id in ${this.sql(this.userIds)}`;
    if (this.adminGithubIds.length) await this.sql`delete from admin_designations where github_user_id in ${this.sql(this.adminGithubIds)}`;
  }

  private async designateAdmin(account: string, login: string) {
    await this.sql`insert into admin_designations (github_user_id, resolved_login) values (${account}, ${login})`;
    this.adminGithubIds.push(account);
  }
}
