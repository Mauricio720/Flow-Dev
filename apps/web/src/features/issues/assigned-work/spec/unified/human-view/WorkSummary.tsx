"use client";

import { useState } from "react";
import { SummarySkeleton } from "../FlowSkeletons";
import { isApproved, latestPackage, SPEC_FORMAT } from "../flowStages";
import { PACKAGE_FORMAT_LABELS, PACKAGE_STATUS_LABELS } from "../unifiedCopy";
import type { FlowPackage, FlowTarget } from "../unifiedContract";
import { useWorkNavigation } from "./humanViewNav";
import { usePackageProjection } from "./usePackageProjection";
import { WorkSummaryCells, type SummaryStatus } from "./WorkSummaryCells";
import { WorkSummaryLists } from "./WorkSummaryLists";
import { WORK_SUMMARY_FAILED, WORK_SUMMARY_LOADING, WORK_SUMMARY_TITLE, WORK_SUMMARY_TOGGLE } from "./workSummaryCopy";

type Props = { target: FlowTarget; packages: FlowPackage[]; status: Omit<SummaryStatus, "documentLabel"> };
const NO_OLDER_VERSIONS: FlowPackage[] = [];

function documentLabel(item: FlowPackage) {
  const state = isApproved(item) ? PACKAGE_STATUS_LABELS.approved : PACKAGE_STATUS_LABELS[item.status] ?? item.status;
  return `${PACKAGE_FORMAT_LABELS[item.format] ?? item.format} v${item.version} · ${state}`;
}

export function WorkSummary({ target, packages, status }: Props) {
  const latest = latestPackage(packages, SPEC_FORMAT);
  const [expanded, setExpanded] = useState(true);
  const navigation = useWorkNavigation();
  const { projection, loading, failed } = usePackageProjection({ target, selected: latest ?? null, packages: NO_OLDER_VERSIONS });
  if (!latest || !navigation) return null;
  const view = projection?.kind === "spec" ? projection.view : null;
  return (
    <section aria-label={WORK_SUMMARY_TITLE} className="overflow-hidden rounded-xl border border-line bg-raised">
      <header className="flex items-center justify-between gap-3 px-5 py-3">
        <h2 className="text-[15px] font-semibold text-ink">{WORK_SUMMARY_TITLE}</h2>
        <button type="button" aria-expanded={expanded} onClick={() => setExpanded(!expanded)} className="rounded-sm text-sm text-ink-2 underline decoration-line underline-offset-4 hover:text-ink">{expanded ? WORK_SUMMARY_TOGGLE.collapse : WORK_SUMMARY_TOGGLE.expand}</button>
      </header>
      {expanded && loading && <SummarySkeleton label={WORK_SUMMARY_LOADING} />}
      {expanded && failed && <p role="alert" className="border-t border-line px-5 py-4 text-sm text-destructive">{WORK_SUMMARY_FAILED}</p>}
      {expanded && view && <div className="border-t border-line"><WorkSummaryCells view={view} status={{ ...status, documentLabel: documentLabel(latest) }} onOpen={navigation.open} /><WorkSummaryLists view={view} onOpen={navigation.open} /></div>}
    </section>
  );
}
