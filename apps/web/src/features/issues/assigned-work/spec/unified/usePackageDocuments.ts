"use client";

import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc/client";
import type { FlowTarget, PackageDocuments } from "./unifiedContract";

type State = { packageId: string; documents: PackageDocuments | null; failed: boolean };

export function usePackageDocuments(target: FlowTarget, packageId: string | null) {
  const [state, setState] = useState<State | null>(null);
  useEffect(() => {
    if (!packageId) return;
    let active = true;
    trpc.taskFlow.package.query({ ...target, packageId }).then(
      (documents) => { if (active) setState({ packageId, documents, failed: false }); },
      () => { if (active) setState({ packageId, documents: null, failed: true }); },
    );
    return () => { active = false; };
  }, [target, packageId]);
  const current = state?.packageId === packageId ? state : null;
  return { documents: current?.documents ?? null, failed: current?.failed ?? false, loading: packageId !== null && current === null };
}
