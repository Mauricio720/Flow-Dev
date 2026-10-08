import type { RouterInputs, RouterOutputs } from "@flow-dev/api";

type Compozy = RouterOutputs["software"]["compozy"];

export type SoftwareSettings = Compozy["get"];
export type Readiness = Compozy["readiness"];
export type ReadinessLayer = Readiness["layers"][number];
export type ConnectionsPage = Compozy["connections"];
export type ConnectionRow = ConnectionsPage["items"][number];
export type HistoryPage = Compozy["history"];
export type HistoryEntry = HistoryPage["items"][number];
export type LoginStartResult = Compozy["beginCodexLogin"];
export type LoginStart = Extract<LoginStartResult, { state: "started" }>;
export type LoginProvider = "codex" | "claude";
export type LoginPoll = Compozy["pollLogin"];
export type SettingsValues = RouterInputs["software"]["compozy"]["saveSettings"]["values"];

export type SoftwareInitial = {
  settings: SoftwareSettings;
  connections: ConnectionsPage;
  history: HistoryPage;
};
