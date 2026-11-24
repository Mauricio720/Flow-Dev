import type { GrantedPermissionProfile } from "./GrantedPermissionProfile";
import type { PermissionGrantScope } from "./PermissionGrantScope";
export type PermissionsRequestApprovalResponse = { permissions: GrantedPermissionProfile, scope: PermissionGrantScope,
strictAutoReview?: boolean, };
