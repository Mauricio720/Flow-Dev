"use client";

import type { RouterInputs, RouterOutputs } from "@flow-dev/api";
import { useRef, useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { trpcCode } from "@/lib/trpc/error";

type ReviewTarget = RouterInputs["projects"]["repositoryPreview"];
export type ReviewedRepository = RouterOutputs["projects"]["repositoryPreview"];
export type ReviewState =
  | { status: "idle" }
  | { status: "checking" }
  | { status: "confirmed"; reviewed: ReviewedRepository }
  | { status: "failed"; code: unknown; target: ReviewTarget };

export function useRepositoryReview() {
  const [state, setState] = useState<ReviewState>({ status: "idle" });
  const latest = useRef(0);
  async function review(target: ReviewTarget) {
    const attempt = ++latest.current;
    setState({ status: "checking" });
    try {
      const reviewed = await trpc.projects.repositoryPreview.query(target);
      if (attempt === latest.current) setState({ status: "confirmed", reviewed });
    } catch (error) {
      if (attempt === latest.current) setState({ status: "failed", code: trpcCode(error), target });
    }
  }
  function clear() {
    latest.current += 1;
    setState({ status: "idle" });
  }
  return { state, review, clear };
}

export type RepositoryReviewer = ReturnType<typeof useRepositoryReview>;
