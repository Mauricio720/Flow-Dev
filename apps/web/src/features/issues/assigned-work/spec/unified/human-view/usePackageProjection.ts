"use client";

import { useMemo } from "react";
import { openPoints } from "../openPoints";
import { readPackage } from "../packageReader";
import type { FlowPackage, FlowTarget, PackageDocuments } from "../unifiedContract";
import { usePackageDocuments } from "../usePackageDocuments";
import { packageProjection } from "./packageOverview";
import { viewChanges } from "./projectionDiff";
import type { VersionChanges } from "./ProjectionNotes";

type Input = { target: FlowTarget; selected: FlowPackage | null; packages: FlowPackage[] };

function previousOf(selected: FlowPackage | null, packages: FlowPackage[]) {
  if (!selected) return null;
  const older = packages.filter((item) => item.format === selected.format && item.version < selected.version);
  return older.sort((left, right) => right.version - left.version)[0] ?? null;
}

function projectionOf(item: FlowPackage | null, documents: PackageDocuments | null) {
  if (!item || !documents) return null;
  const tabs = readPackage(documents);
  const points = openPoints(tabs.flatMap((tab) => tab.documents));
  return { tabs, points, projection: packageProjection(item, tabs, points) };
}

export function usePackageProjection({ target, selected, packages }: Input) {
  const current = usePackageDocuments(target, selected?.id ?? null);
  const previousPackage = previousOf(selected, packages);
  const previous = usePackageDocuments(target, previousPackage?.id ?? null);
  const read = useMemo(() => projectionOf(selected, current.documents), [selected, current.documents]);
  const before = useMemo(() => projectionOf(previousPackage, previous.documents), [previousPackage, previous.documents]);
  const changes = useMemo((): VersionChanges | null => {
    if (read?.projection?.kind !== "spec" || before?.projection?.kind !== "spec" || !previousPackage) return null;
    return { previousVersion: previousPackage.version, changes: viewChanges(before.projection.view, read.projection.view) };
  }, [read, before, previousPackage]);
  return { ...current, tabs: read?.tabs ?? [], points: read?.points ?? [], projection: read?.projection ?? null, changes };
}
