import { spawn } from "node:child_process";

type Launcher = { file: string; args: string[] };
export type LauncherSpawner = (file: string, args: string[]) => { on(event: "error", listener: () => void): unknown; unref(): void };

const LAUNCHERS: Partial<Record<NodeJS.Platform, Launcher>> = {
  linux: { file: "xdg-open", args: [] },
  darwin: { file: "open", args: [] },
  win32: { file: "cmd", args: ["/c", "start", ""] },
};

const detachedSpawner: LauncherSpawner = (file, args) => spawn(file, args, { detached: true, stdio: "ignore" });

export function openInBrowser(url: string, platform: NodeJS.Platform = process.platform, spawner: LauncherSpawner = detachedSpawner) {
  const launcher = LAUNCHERS[platform];
  if (!launcher) return false;
  const child = spawner(launcher.file, [...launcher.args, url]);
  child.on("error", () => undefined);
  child.unref();
  return true;
}
