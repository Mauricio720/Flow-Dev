import { lstat } from "node:fs/promises";
import type { HostChecks } from "../../../application/software/hostChecks";
import type { SpecConfigurationProbe } from "../specConfiguration";

const IMAGE_DIGEST_PATTERN = /@sha256:[0-9a-f]{64}$/;
const PRIVATE_DIRECTORY_MODE = 0o700;

type HostEnvironment = Record<string, string | undefined>;

async function credentialRootPrivate(path: string | undefined) {
  if (!path || !path.startsWith("/")) return false;
  try {
    const directory = await lstat(path);
    const owner = process.getuid?.();
    return directory.isDirectory() && directory.uid === owner && (directory.mode & 0o777) === PRIVATE_DIRECTORY_MODE;
  } catch {
    return false;
  }
}

export async function collectHostChecks(env: HostEnvironment, probe: SpecConfigurationProbe): Promise<HostChecks> {
  const workspaceRoot = env.SPEC_WORKSPACE_ROOT?.trim();
  return {
    workspaceRootWritable: workspaceRoot ? await probe.directoryWritable(workspaceRoot) : false,
    runtimeImagePinned: IMAGE_DIGEST_PATTERN.test(env.SPEC_RUNTIME_IMAGE?.trim() ?? ""),
    isolationEnforceable: await probe.isolationEnforceable(),
    credentialRootPrivate: await credentialRootPrivate(env.SOFTWARE_CREDENTIAL_ROOT?.trim()),
  };
}
