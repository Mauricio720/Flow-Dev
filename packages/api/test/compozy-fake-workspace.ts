import type { CompozyFileContent, CompozyFileEntry, CompozyFileListInput, CompozyWorktreeInput, CompozyWorktreeRef } from "../src/application/compozy/compozyGateway";

const FAKE_WORKTREE_ROOT = "/tmp";
type RecordCall = (operation: string, input: unknown) => void;

export class FakeCompozyWorkspace {
  readonly worktrees = new Map<string, CompozyWorktreeRef & { workspaceId: string }>();
  readonly fileEntries = new Map<string, CompozyFileEntry[]>();
  readonly files = new Map<string, CompozyFileContent>();

  constructor(private readonly record: RecordCall) {}

  async createWorktree(input: CompozyWorktreeInput) {
    this.record("createWorktree", input);
    const worktreeId = `worktree_${this.worktrees.size + 1}`;
    const path = `${FAKE_WORKTREE_ROOT}/${input.name}`;
    this.worktrees.set(worktreeId, { worktreeId, workspaceId: input.workspaceId, name: input.name, branch: input.branch, path });
    return { worktreeId, path };
  }

  async findWorktree(input: { workspaceId: string; name: string }) {
    this.record("findWorktree", input);
    return [...this.worktrees.values()].find((worktree) => worktree.workspaceId === input.workspaceId && worktree.name === input.name) ?? null;
  }

  addDependency(input: { taskId: string; dependsOnTaskId: string }) {
    this.record("addDependency", input);
  }

  async listFileEntries(input: CompozyFileListInput) {
    this.record("listFileEntries", input);
    const prefix = `${input.path}/`;
    return (this.fileEntries.get(input.worktreeId) ?? []).filter((entry) => {
      const path = entry.path.startsWith(prefix) ? entry.path.slice(prefix.length) : entry.path;
      return path.length > 0 && !path.includes("/");
    });
  }

  async readFile(input: CompozyFileListInput) {
    this.record("readFile", input);
    return this.files.get(`${input.worktreeId}:${input.path}`) ?? { content: "" };
  }
}
