import type { CapturedFile, TaskSetReadDao } from "../../database/dao/taskSetReadDao";
import { ConsolePlanLog } from "./planLog";
import type { PlanLog } from "./planLog";
import { readTaskSet } from "./taskSetReader";
import type { TaskSet } from "./taskSetTypes";

const MANIFEST_NAME = "_tasks.md";

export function folderOf(manifestPath: string) {
  return manifestPath === MANIFEST_NAME ? "" : manifestPath.slice(0, -(MANIFEST_NAME.length + 1));
}

function newestFirst(files: CapturedFile[]) {
  return [...files].sort((left, right) => right.capturedAt.getTime() - left.capturedAt.getTime() || left.path.localeCompare(right.path));
}

export class TaskSetLoader {
  private readonly reportedInvalid = new Set<string>();

  constructor(private readonly dao: TaskSetReadDao, private readonly log: PlanLog = new ConsolePlanLog()) {}

  async load(taskId: string): Promise<TaskSet | null> {
    const [manifest, ...others] = newestFirst(await this.dao.manifests(taskId));
    if (!manifest) return null;
    const folder = folderOf(manifest.path);
    const files = (await this.dao.folderFiles(taskId, folder)).map(({ artifactId, path, content }) => ({ artifactId, path, content }));
    const manifestSource = { artifactId: manifest.artifactId, version: manifest.version, content: manifest.content };
    const set = readTaskSet({ folder, manifest: manifestSource, files, otherFolders: others.map((other) => folderOf(other.path)) });
    if (set.problem !== null) this.reportInvalid({ taskId, manifest, folder, reason: set.problem });
    return set;
  }

  private reportInvalid(input: { taskId: string; manifest: CapturedFile; folder: string; reason: string }) {
    const key = `${input.taskId}:${input.manifest.artifactId}:${input.manifest.version}`;
    if (this.reportedInvalid.has(key)) return;
    this.reportedInvalid.add(key);
    this.log.manifestInvalid({ folder: input.folder, reason: input.reason });
  }
}
