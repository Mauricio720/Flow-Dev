import type { CompozyBinding, CompozyHealth, CompozyOverview } from "@/features/projects/project-settings/compozy/compozyContract";

export const CHECKOUT_PATH = "/home/mauricio/Área de trabalho/app";
export const REACHABLE: CompozyHealth = { reachable: true, version: "0.7.3" };

export const READY_BINDING: CompozyBinding = {
  state: "ready",
  checkoutPath: CHECKOUT_PATH,
  defaultBranch: "main",
  compozyWorkspaceId: "ws_9c1e0f2a7b3d4e5f",
  failureCode: null,
  checkedAt: "2026-11-19T22:10:04.000Z",
  revision: 3,
};

export function invalidBinding(failureCode: string, revision = 4): CompozyBinding {
  return { ...READY_BINDING, state: "invalid", compozyWorkspaceId: null, failureCode, revision };
}

export function overview(binding: CompozyBinding | null, compozy = REACHABLE): CompozyOverview {
  return { binding, compozy, canEdit: true };
}

export function compozyFailure(code: string, reason: string) {
  return Object.assign(new Error(reason), { data: { code, reason } });
}
