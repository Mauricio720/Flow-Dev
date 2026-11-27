import type { RouterOutputs } from "@flow-dev/api";

export type WorkAccounts = RouterOutputs["tasks"]["workAccounts"]["get"];
export type WorkAccountChoice = WorkAccounts["choices"][number];
export type WorkAccountProvider = WorkAccountChoice["provider"];
export type WorkAccountOption = WorkAccounts["options"][WorkAccountProvider][number];
