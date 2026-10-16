import type { ArtifactView } from "./viewTypes";

export type ChangeKind = "requirement" | "decision" | "contract";
export type ChangeType = "added" | "removed" | "changed";
export type ViewChange = { kind: ChangeKind; type: ChangeType; title: string };
type Keyed = Map<string, { title: string; signature: string }>;

function requirementsOf(view: ArtifactView): Keyed {
  return new Map(view.product.requirements.map((item) => [item.code, { title: `${item.code} — ${item.title}`, signature: [item.title, ...item.acceptance.map((criterion) => criterion.text), ...item.edges.map((criterion) => criterion.text)].join("\n") }]));
}

function decisionsOf(view: ArtifactView): Keyed {
  const items = [...view.product.decisions, ...view.technical.decisions];
  return new Map(items.map((item) => [item.title, { title: item.title, signature: item.detail.join("\n") }]));
}

function contractsOf(view: ArtifactView): Keyed {
  return new Map(view.technical.contracts.map((item) => [item.title, { title: item.title, signature: item.parts.map((part) => part.markdown).join("\n") }]));
}

function compare(kind: ChangeKind, previous: Keyed, current: Keyed): ViewChange[] {
  const changes: ViewChange[] = [];
  for (const [key, item] of current) {
    const before = previous.get(key);
    if (!before) changes.push({ kind, type: "added", title: item.title });
    else if (before.signature !== item.signature) changes.push({ kind, type: "changed", title: item.title });
  }
  for (const [key, item] of previous) if (!current.has(key)) changes.push({ kind, type: "removed", title: item.title });
  return changes;
}

export function viewChanges(previous: ArtifactView, current: ArtifactView): ViewChange[] {
  return [
    ...compare("requirement", requirementsOf(previous), requirementsOf(current)),
    ...compare("decision", decisionsOf(previous), decisionsOf(current)),
    ...compare("contract", contractsOf(previous), contractsOf(current)),
  ];
}
