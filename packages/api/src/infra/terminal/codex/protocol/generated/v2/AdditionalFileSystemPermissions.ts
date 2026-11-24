import type { LegacyAppPathString } from "../LegacyAppPathString";
import type { FileSystemSandboxEntry } from "./FileSystemSandboxEntry";
export type AdditionalFileSystemPermissions = {
read: Array<LegacyAppPathString> | null,
write: Array<LegacyAppPathString> | null, globScanMaxDepth?: number, entries?: Array<FileSystemSandboxEntry>, };
