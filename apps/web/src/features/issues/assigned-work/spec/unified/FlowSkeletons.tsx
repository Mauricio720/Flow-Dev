import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { LOADING_LABELS } from "./unifiedCopy";

const RUNTIME_FIELDS = ["connection", "model", "reasoning"];
const DOCUMENT_LINES = ["w-full", "w-11/12", "w-4/5", "w-2/3"];

function Loading({ label, className, children }: { label: string; className: string; children: ReactNode }) {
  return <div role="status" className={className}><span className="sr-only">{label}</span>{children}</div>;
}

function FieldSkeleton({ className }: { className?: string }) {
  return <div className={`space-y-1.5 ${className ?? ""}`}><Skeleton className="h-4 w-24" /><Skeleton className="h-10 w-full" /></div>;
}

export function PlanSkeleton() {
  return (
    <Loading label={LOADING_LABELS.plan} className="space-y-4">
      <div className="space-y-3 border-y border-line py-4">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-4/5" />
        <FieldSkeleton className="max-w-xs" />
        <div className="grid gap-3 sm:grid-cols-3">{RUNTIME_FIELDS.map((field) => <FieldSkeleton key={field} />)}</div>
        <div className="grid gap-3 sm:grid-cols-2"><FieldSkeleton /></div>
        <Skeleton className="h-10 w-36" />
      </div>
      <Skeleton className="h-10 w-28" />
    </Loading>
  );
}

export function DocumentsSkeleton() {
  return (
    <Loading label={LOADING_LABELS.documents} className="space-y-3">
      <Skeleton className="h-9 w-56" />
      {DOCUMENT_LINES.map((width) => <Skeleton key={width} className={`h-4 ${width}`} />)}
    </Loading>
  );
}

export function HistorySkeleton() {
  return <Loading label={LOADING_LABELS.history} className="py-0.5"><Skeleton className="h-4 w-64 max-w-full" /></Loading>;
}

export function FlowSkeleton() {
  return (
    <Loading label={LOADING_LABELS.flow} className="space-y-6">
      <div className="space-y-2.5"><Skeleton className="h-5 w-48" /><Skeleton className="h-4 w-full max-w-[62ch]" /><Skeleton className="h-4 w-2/3" /></div>
      <div className="space-y-3 border-t border-line pt-6"><Skeleton className="h-5 w-36" /><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-2/3" /></div>
    </Loading>
  );
}
