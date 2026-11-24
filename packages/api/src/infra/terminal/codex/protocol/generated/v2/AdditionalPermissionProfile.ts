import type { AdditionalFileSystemPermissions } from "./AdditionalFileSystemPermissions";
import type { AdditionalNetworkPermissions } from "./AdditionalNetworkPermissions";
export type AdditionalPermissionProfile = {
network: AdditionalNetworkPermissions | null, fileSystem: AdditionalFileSystemPermissions | null, };
