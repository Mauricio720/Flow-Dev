import type { ConnectionRow, ConnectionsPage, HistoryPage, Readiness, SoftwareInitial, SoftwareSettings } from "@/features/software/compozy/contract";

export const SETTINGS: SoftwareSettings = {
  revision: 0,
  updatedAt: "2026-10-06T12:00:00.000Z",
  runtime: { pinnedRelease: "v0.3.0-beta.29" },
  settings: { enabled: false, docsProxyUrl: null, maxActiveActions: 1 },
};

export function connectionRow(overrides: Partial<ConnectionRow> = {}): ConnectionRow {
  return {
    id: "c1",
    label: "Codex principal",
    providerKind: "codex",
    authState: "connected",
    accountLabel: "m***@example.com",
    revision: 2,
    lastCheckedAt: "2026-10-06T12:00:00.000Z",
    disabled: false,
    activeRuns: 0,
    readiness: { state: "ready", blockedBy: null, reasonCode: null, selectableModels: 2 },
    ...overrides,
  };
}

export function connectionsPage(items: ConnectionRow[] = [], nextCursor: string | null = null): ConnectionsPage {
  return { items, nextCursor, sharedBlockers: [] };
}

export const EMPTY_HISTORY: HistoryPage = { items: [], nextCursor: null };

export function initial(overrides: Partial<SoftwareInitial> = {}): SoftwareInitial {
  return { settings: SETTINGS, connections: connectionsPage(), history: EMPTY_HISTORY, ...overrides };
}

export function readinessOf(states: Record<string, [string, string | null]>, stale = false): Readiness {
  const layers = Object.entries(states).map(([layer, [state, reasonCode]]) => ({ layer, state, reasonCode })) as Readiness["layers"];
  return { layers, checkedAt: "2026-10-06T12:00:00.000Z", stale };
}

export const BLOCKED_READINESS = readinessOf({
  application: ["blocked", "software_disabled"],
  account: ["blocked", "no_connection"],
  runtime: ["ready", null],
  host: ["blocked", "rootless_isolation_unavailable"],
});

export function softwareFailure(code: string, reason?: string, fieldErrors?: Record<string, string>) {
  return Object.assign(new Error(code), { data: { code, reason, fieldErrors } });
}
