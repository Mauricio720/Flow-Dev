import { open, readdir } from "node:fs/promises";
import { join } from "node:path";
import type { RunRecord } from "../../application/database/dao/taskFlowDao";
import type { PackageFile } from "../../application/services/task-flow/artifactValidator";
import type { ArtifactSource } from "../../application/services/task-flow/packageCapture";
import type { RunWorkspaceProvider } from "./runWorkspaceProvider";

export const ARTIFACT_DIRECTORY = ".flow-spec";
const MAX_READ_BYTES = 1024 * 1024 + 1;
const MARKDOWN_SUFFIX = ".md";
const ADR_DIRECTORY = "adrs";

async function readBounded(path: string) {
  const handle = await open(path, "r");
  try {
    const buffer = Buffer.alloc(MAX_READ_BYTES);
    const { bytesRead } = await handle.read(buffer, 0, MAX_READ_BYTES, 0);
    return buffer.subarray(0, bytesRead).toString("utf8");
  } finally {
    await handle.close();
  }
}

async function markdownIn(directory: string, prefix: string): Promise<PackageFile[]> {
  const entries = await readdir(join(directory, prefix), { withFileTypes: true }).catch(() => []);
  const files = entries.filter((entry) => entry.isFile() && entry.name.endsWith(MARKDOWN_SUFFIX));
  return Promise.all(files.map(async (entry) => ({ path: prefix ? `${prefix}/${entry.name}` : entry.name, content: await readBounded(join(directory, prefix, entry.name)) })));
}

export class WorkspaceArtifactSource implements ArtifactSource {
  constructor(private readonly workspaces: RunWorkspaceProvider) {}

  async read(run: RunRecord): Promise<PackageFile[]> {
    const { repositoryPath } = await this.workspaces.prepare({ run, snapshot: run.snapshot as never, grants: [] });
    const directory = join(repositoryPath, ARTIFACT_DIRECTORY);
    const files = [...(await markdownIn(directory, "")), ...(await markdownIn(directory, ADR_DIRECTORY))];
    if (run.snapshot.kind === "create_tasks") return files.filter((file) => file.path === "_tasks.md" || /^task_\d+\.md$/.test(file.path));
    return files.filter((file) => file.path !== "_tasks.md" && !/^task_\d+\.md$/.test(file.path));
  }
}
