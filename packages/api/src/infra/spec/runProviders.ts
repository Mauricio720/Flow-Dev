import type { ActionSnapshot, RuntimeChoice } from "../../application/services/task-flow/flowContracts";

export type RunProvider = { overlayId: string; kind: string; connectionId: string };

function choicesOf(snapshot: ActionSnapshot): RuntimeChoice[] {
  return snapshot.kind === "loop" ? Object.values(snapshot.runtimeBindings) : [snapshot.runtime];
}

export function snapshotProviders(snapshot: ActionSnapshot): RunProvider[] {
  const unique = new Map<string, RunProvider>();
  for (const choice of choicesOf(snapshot)) {
    const overlayId = snapshot.runtimeProviderIds[choice.connectionId];
    if (overlayId) unique.set(choice.connectionId, { overlayId, kind: choice.providerId, connectionId: choice.connectionId });
  }
  return [...unique.values()];
}

export function providersEnvironment(providers: RunProvider[]) {
  return providers.map((provider) => `${provider.overlayId}:${provider.kind}:${provider.connectionId}`).join(";");
}
