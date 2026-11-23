import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { asc, eq } from "drizzle-orm";
import { taskArtifactVersions, taskArtifacts } from "../src/infra/database/schema";
import { ArtifactCaptureService } from "../src/application/services/terminal/artifactCaptureService";
import { ConsoleTerminalLog } from "../src/application/services/terminal/terminalLaunchLog";
import type { ArtifactCaptureTrigger } from "../src/application/terminal/artifactCaptureTrigger";
import { DrizzleArtifactCaptureDao } from "../src/infra/database/dao/artifacts/drizzleArtifactCaptureDao";
import { FsCheckoutFileReader } from "../src/infra/terminal/fsCheckoutFileReader";
import { editOf, openedSession, skillOf } from "./terminal-event-support";

type Opened = Awaited<ReturnType<typeof openedSession>>;

export function captureService(world: Pick<Opened, "setup">) {
  return new ArtifactCaptureService({ dao: new DrizzleArtifactCaptureDao(world.setup.database), reader: new FsCheckoutFileReader(), log: new ConsoleTerminalLog() });
}

export async function writeFileIn(root: string, relative: string, content: string | Buffer) {
  await mkdir(dirname(join(root, relative)), { recursive: true });
  await writeFile(join(root, relative), content);
}

export async function editWithSkill(input: { send: Opened["send"]; clone: string; skill: string; path: string }) {
  await input.send(skillOf(input.skill));
  await input.send(editOf(input.clone, input.path));
}

export async function captured(world: Pick<Opened, "setup">, sessionId: string, trigger: ArtifactCaptureTrigger = "stop") {
  return captureService(world).capture({ sessionId, trigger });
}

export async function versionsByPath(world: Pick<Opened, "setup">) {
  const database = world.setup.database;
  const artifacts = await database.select().from(taskArtifacts).orderBy(asc(taskArtifacts.relativePath));
  const result: Record<string, Array<{ version: number; skill: string; content: string; sessionId: string | null; trigger: string }>> = {};
  for (const artifact of artifacts) {
    const versions = await database.select().from(taskArtifactVersions).where(eq(taskArtifactVersions.artifactId, artifact.id)).orderBy(asc(taskArtifactVersions.version));
    result[artifact.relativePath] = versions.map(({ version, skill, content, sessionId, trigger }) => ({ version, skill, content, sessionId, trigger }));
  }
  return result;
}
