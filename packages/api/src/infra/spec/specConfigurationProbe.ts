import { execFile } from "node:child_process";
import { access, constants } from "node:fs/promises";
import { promisify } from "node:util";
import { loadSpecBundle } from "./specBundleLoader";
import { codexChatGptLoginReady } from "./specCodexAuth";
import type { SpecConfigurationProbe } from "./specConfiguration";

const run = promisify(execFile);

export const productionConfigurationProbe: SpecConfigurationProbe = {
  directoryWritable: (path) => access(path, constants.W_OK).then(() => true, () => false),
  bundleDigest: async () => (await loadSpecBundle()).digest,
  codexChatGptLoginReady,
  isolationEnforceable: async () => {
    try {
      const { stdout } = await run("podman", ["info", "--format", "{{.Host.Security.Rootless}}"]);
      return stdout.trim() === "true";
    } catch { return false; }
  },
};
