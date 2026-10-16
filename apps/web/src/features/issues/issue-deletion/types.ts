import type { RouterInputs, RouterOutputs } from "@flow-dev/api";

export type DeletionTarget = RouterInputs["issueDeletion"]["preview"];
export type DeletionPreview = RouterOutputs["issueDeletion"]["preview"];
export type DeletionStatus = RouterOutputs["issueDeletion"]["status"];
