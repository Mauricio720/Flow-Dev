"use client";

import type { SpecStageName } from "./specContract";
import { PrdReview } from "./PrdReview";
import { TasksReview } from "./TasksReview";
import { TechSpecReview } from "./TechSpecReview";
import { SpecChanges } from "./SpecChanges";
import type { LoadedDocument, PackageLoad } from "./useSpecPackage";

type Props = { stage: SpecStageName; load: PackageLoad; parent: PackageLoad | null; onOpenDocument: (documentId: string) => void; onLoadMore: (documentId: string) => void };

export function SpecPackageView({ stage, load, parent, onOpenDocument, onLoadMore }: Props) {
  if (load.status === "loading") return <p role="status" className="text-sm text-ink-2">Carregando a revisão…</p>;
  if (load.status === "failed" || !load.detail) return load.status === "failed" ? <p role="alert" className="text-sm text-destructive">Não foi possível abrir este pacote.</p> : null;
  const detail = load.detail;
  const documents: LoadedDocument[] = load.documents;
  const common = { detail, documents, onOpenDocument, onLoadMore };
  return (
    <div className="space-y-6">
      {stage === "prd" && <PrdReview {...common} />}
      {stage === "tech_spec" && <TechSpecReview {...common} />}
      {stage === "tasks" && <TasksReview detail={detail} documents={documents} />}
      <SpecChanges current={{ manifestHash: detail.manifestHash, parentManifestHash: detail.parentManifestHash, documents }} parent={parent?.detail ? { manifestHash: parent.detail.manifestHash, documents: parent.documents } : null} />
    </div>
  );
}
