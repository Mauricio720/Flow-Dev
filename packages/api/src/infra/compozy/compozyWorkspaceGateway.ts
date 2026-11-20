import type { CompozyFileEntry, CompozyFileListInput, CompozyFileContent, CompozyWorktreeInput, CompozyWorktreeRef } from "../../application/compozy/compozyGateway";
import { CompozyConnection } from "./compozyConnection";

export class CompozyWorkspaceGateway {
  constructor(private readonly connection: CompozyConnection) {}

  async resolveWorkspace(path: string) {
    const { workspace } = await this.connection.call({ operation: "resolveWorkspace" }, (client) => client.workspaces.resolveWorkspace({ body: { path } }));
    return { workspaceId: workspace.id };
  }

  async createWorktree(input: CompozyWorktreeInput) {
    const { workspaceId, ...body } = input;
    const { worktree } = await this.connection.call({ operation: "createWorktree" }, (client) => client.worktrees.createWorktree({ path: { workspace_id: workspaceId }, body: { name: body.name, branch: body.branch, base_ref: body.baseRef } }));
    return { worktreeId: worktree.id, path: worktree.path };
  }

  async findWorktree(input: { workspaceId: string; name: string }): Promise<CompozyWorktreeRef | null> {
    const { worktrees } = await this.connection.call({ operation: "listWorktrees" }, (client) => client.worktrees.listWorktrees({ path: { workspace_id: input.workspaceId } }));
    const worktree = worktrees.find((item) => item.name === input.name);
    return worktree ? { worktreeId: worktree.id, name: worktree.name, branch: worktree.branch, path: worktree.path } : null;
  }

  async listFileEntries(input: CompozyFileListInput): Promise<CompozyFileEntry[]> {
    const { entries } = await this.connection.call({ operation: "listFileEntries" }, (client) => client.workspaces.listFileEntries({ path: { workspace_id: input.workspaceId }, query: { path: input.path, worktree_id: input.worktreeId } }));
    return entries.map(({ path, kind, sensitive, symlink }) => ({ path, kind, sensitive, symlink }));
  }

  async readFile(input: CompozyFileListInput): Promise<CompozyFileContent> {
    const { workspaceId, worktreeId, path } = input;
    const file = await this.connection.call({ operation: "readFileContent" }, (client) => client.workspaces.readFileContent({ path: { workspace_id: workspaceId }, query: { worktree_id: worktreeId, path } }));
    return file.sensitive ? { sensitive: true } : { content: file.text ?? "" };
  }
}
