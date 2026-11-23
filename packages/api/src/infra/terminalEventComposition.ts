import { ArtifactCaptureService } from "../application/services/terminal/artifactCaptureService";
import { ConsoleTerminalLog } from "../application/services/terminal/terminalLaunchLog";
import type { SessionSettingsRemover } from "../application/terminal/sessionSettings";
import { TerminalEventController } from "../controllers/terminalEventController";
import { requireDatabase } from "./database/client";
import { DrizzleArtifactCaptureDao } from "./database/dao/artifacts/drizzleArtifactCaptureDao";
import { DrizzleTerminalEventDao } from "./database/dao/terminal/drizzleTerminalEventDao";
import { FileSessionSettingsRemover } from "./terminal/fileSessionSettingsRemover";
import { FsCheckoutFileReader } from "./terminal/fsCheckoutFileReader";

type Database = ReturnType<typeof requireDatabase>;
export type TerminalEventOverrides = { settings?: SessionSettingsRemover; env?: NodeJS.ProcessEnv };

export function createTerminalEventController(database: Database, overrides: TerminalEventOverrides = {}) {
  const log = new ConsoleTerminalLog();
  const capture = new ArtifactCaptureService({ dao: new DrizzleArtifactCaptureDao(database), reader: new FsCheckoutFileReader(), log });
  return new TerminalEventController({
    events: new DrizzleTerminalEventDao(database),
    settings: overrides.settings ?? new FileSessionSettingsRemover(overrides.env),
    capture,
    log,
  });
}

export function createProductionTerminalEventController() {
  return createTerminalEventController(requireDatabase());
}
