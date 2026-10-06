"use client";

import { useId, type ReactNode } from "react";
import { GitHubMark } from "@/components/icons";
import type { IssueDraft } from "../contract";
import type { DraftErrors } from "../draftModel";
import type { DraftSource } from "../draftSources";
import type { DraftEditor } from "../hooks/useDraftEditor";
import { DraftEditorFields } from "./DraftEditorFields";
import { DraftView } from "./DraftView";

type Props = {
  heading: string;
  repository: string;
  published: boolean;
  draft: IssueDraft;
  sources: DraftSource[];
  errors: DraftErrors;
  editor: DraftEditor | null;
  children: ReactNode;
};

export function IssueDraftBlock({ heading, repository, published, draft, sources, errors, editor, children }: Props) {
  const id = useId();
  return (
    <article aria-labelledby={`${id}-heading`} className={`overflow-hidden rounded-xl border-2 bg-raised transition-colors duration-500 ${published ? "border-merge" : "border-merge/45"}`}>
      <header className="flex min-h-[52px] flex-wrap items-center justify-between gap-x-4 gap-y-1 px-5 py-3">
        <h3 id={`${id}-heading`} className="text-[15px] font-semibold">{heading}</h3>
        <span className="flex min-w-0 items-center gap-2 font-mono text-xs text-ink-3">
          <GitHubMark size={13} className="shrink-0" />
          <span className="truncate" title={repository}>{repository}</span>
        </span>
      </header>
      {editor?.editing ? <DraftEditorFields editor={editor} errors={errors} /> : <DraftView draft={draft} sources={sources} errors={errors} />}
      {children}
    </article>
  );
}
