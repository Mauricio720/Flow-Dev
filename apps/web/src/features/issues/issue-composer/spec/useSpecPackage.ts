"use client";

import type { ReviewBlock } from "@flow-dev/api/spec";
import { useEffect, useEffectEvent, useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { taskFailure } from "../taskFailure";
import type { SpecFailure, SpecPackageDetail } from "./specContract";
import type { SpecTarget } from "./specReads";

export type LoadedDocument = { id: string; path: string; role: string; sha256: string; byteCount: number; sourceText: string; blocks: ReviewBlock[]; totalBlocks: number; nextCursor: string | null };
export type PackageLoad = { status: "idle" | "loading" | "ready" | "failed"; detail: SpecPackageDetail | null; documents: LoadedDocument[]; failure: SpecFailure | null };
const IDLE: PackageLoad = { status: "idle", detail: null, documents: [], failure: null };
const BLOCK_PAGE = 100;

async function loadDocument(target: SpecTarget, packageId: string, summary: SpecPackageDetail["documents"][number]): Promise<LoadedDocument> {
  const page = await trpc.taskSpec.document.query({ ...target, packageId, documentId: summary.id, limit: BLOCK_PAGE });
  return { id: summary.id, path: summary.path, role: summary.role, sha256: page.sha256, byteCount: page.byteCount, sourceText: page.sourceText, blocks: page.blocks as ReviewBlock[], totalBlocks: page.totalBlocks, nextCursor: page.nextCursor };
}

type Keyed = { id: string | null; load: PackageLoad };

async function fetchPackage(target: SpecTarget, id: string): Promise<PackageLoad> {
  try {
    const detail = await trpc.taskSpec.package.query({ ...target, packageId: id });
    const documents = await Promise.all(detail.documents.filter((document) => document.role !== "index").map((document) => loadDocument(target, id, document)));
    return { status: "ready", detail, documents, failure: null };
  } catch (error) {
    return { status: "failed", detail: null, documents: [], failure: taskFailure(error) };
  }
}

export function useSpecPackage(target: SpecTarget, packageId: string | null) {
  const [state, setState] = useState<Keyed>({ id: null, load: IDLE });
  const open = useEffectEvent((id: string) => fetchPackage(target, id).then((load) => setState({ id, load })));
  useEffect(() => {
    if (packageId) void open(packageId);
  }, [packageId]);
  const load: PackageLoad = state.id === packageId ? state.load : packageId ? { ...IDLE, status: "loading" } : IDLE;
  async function loadMore(documentId: string) {
    const document = load.documents.find((item) => item.id === documentId);
    if (!document?.nextCursor || !packageId) return;
    const page = await trpc.taskSpec.document.query({ ...target, packageId, documentId, cursor: document.nextCursor, limit: BLOCK_PAGE });
    setState((current) => ({ ...current, load: { ...current.load, documents: current.load.documents.map((item) => item.id === documentId ? { ...item, blocks: [...item.blocks, ...(page.blocks as ReviewBlock[])], nextCursor: page.nextCursor } : item) } }));
  }
  return { ...load, loadMore };
}
