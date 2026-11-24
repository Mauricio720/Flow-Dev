"use client";

import type { ReactNode } from "react";
import { ChevronDownIcon } from "@/components/icons";
import { useConversationScroll } from "../hooks/useConversationScroll";
import { CONVERSATION_REGION_LABEL, JUMP_TO_END_LABEL, NEW_ENTRIES_LABEL } from "../sessionCopy";

type Props = { entryCount: number; label: string; children: ReactNode };

const FRAME = "relative rounded-lg has-[>[data-conversation-scroll]:focus-visible]:outline-2 has-[>[data-conversation-scroll]:focus-visible]:outline-offset-2 has-[>[data-conversation-scroll]:focus-visible]:outline-lane-project";
const REGION = "conversation-scroll max-h-[min(40rem,58dvh)] overflow-y-auto overscroll-contain pr-3 [scrollbar-gutter:stable] focus-visible:outline-none";
const JUMP = "absolute inset-x-0 bottom-3 mx-auto inline-flex h-8 w-fit items-center gap-1.5 rounded-full border border-line bg-raised px-3 text-xs font-medium text-ink transition-colors hover:border-ink-3 motion-safe:animate-[jump-in_320ms_var(--ease-out-expo)_both]";

export function ConversationScroll({ entryCount, label, children }: Props) {
  const { regionRef, contentRef, edges, hasUnseen, onScroll, jumpToEnd } = useConversationScroll(entryCount);
  return (
    <div className={FRAME}>
      <div ref={regionRef} data-conversation-scroll="" data-at-start={edges.atStart} data-at-end={edges.atEnd} role="region" aria-label={CONVERSATION_REGION_LABEL} tabIndex={0} onScroll={onScroll} className={REGION}>
        <ol ref={contentRef} aria-label={label} aria-live="polite" className="space-y-5 py-1">
          {children}
        </ol>
      </div>
      {!edges.atEnd && (
        <button type="button" onClick={jumpToEnd} className={JUMP}>
          <ChevronDownIcon size={14} />
          {hasUnseen ? NEW_ENTRIES_LABEL : JUMP_TO_END_LABEL}
        </button>
      )}
    </div>
  );
}
