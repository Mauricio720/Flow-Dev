import type { ActionSnapshot, RuntimeChoice } from "../../application/services/task-flow/flowContracts";

function choicesOf(snapshot: ActionSnapshot): RuntimeChoice[] {
  const choices = snapshot.kind === "loop" ? Object.values(snapshot.runtimeBindings ?? {}) : [snapshot.runtime];
  return choices.filter((choice): choice is RuntimeChoice => Boolean(choice?.connectionId && choice.providerId));
}

// The machine catalog is discovered with each provider registered under its own kind, and Compozy only
// applies a reasoning effort for those ids. Running under the same ids keeps what was offered startable.
export function withNativeProviderIds<Snapshot extends ActionSnapshot>(snapshot: Snapshot): Snapshot {
  const native = Object.fromEntries(choicesOf(snapshot).map((choice) => [choice.connectionId, choice.providerId]));
  return { ...snapshot, runtimeProviderIds: { ...snapshot.runtimeProviderIds, ...native } };
}
