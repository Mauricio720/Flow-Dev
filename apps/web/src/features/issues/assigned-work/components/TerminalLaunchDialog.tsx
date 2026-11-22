"use client";

import { useRef, type RefObject } from "react";
import { useDialogFocus } from "@/hooks/useDialogFocus";
import { useTerminalAttachments } from "../hooks/useTerminalAttachments";
import { useTerminalLaunch } from "../hooks/useTerminalLaunch";
import type { TerminalOpened } from "../terminalContract";
import { TERMINAL_DIALOG_INTRO, TERMINAL_DIALOG_TITLE } from "../terminalCopy";
import { TerminalLaunchBody } from "./TerminalLaunchBody";
import { TerminalLaunchFooter } from "./TerminalLaunchFooter";

type Props = {
  projectId: string;
  taskId: string;
  trigger: RefObject<HTMLButtonElement | null>;
  onClose: () => void;
  onOpened: (result: TerminalOpened) => void;
};

export function TerminalLaunchDialog({ projectId, taskId, trigger, onClose, onOpened }: Props) {
  const launch = useTerminalLaunch({ projectId, taskId });
  const attachments = useTerminalAttachments({ projectId, taskId, issueImages: launch.preflight?.issueImages ?? [] });
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const close = () => {
    onClose();
    requestAnimationFrame(() => trigger.current?.focus());
  };
  useDialogFocus(true, launch.phase === "sending", close, { trigger, dialog, heading });
  async function confirm() {
    const result = await launch.confirm({ attachmentIds: attachments.attachmentIds, issueImageIds: attachments.issueImageIds });
    if (!result) return;
    attachments.commit();
    onOpened(result);
    close();
  }
  return (
    <dialog ref={dialog} open aria-modal="true" aria-labelledby="terminal-title" className="fixed inset-0 z-50 m-0 flex min-h-full w-full max-w-none items-center justify-center border-0 bg-black/40 p-3 backdrop:bg-black/40 sm:p-6">
      <section className="max-h-[calc(100vh-2rem)] w-full max-w-2xl space-y-5 overflow-y-auto rounded-xl border border-line bg-raised p-5 text-ink shadow-raised sm:p-6">
        <header className="space-y-2">
          <h2 id="terminal-title" ref={heading} tabIndex={-1} className="text-lg font-semibold">{TERMINAL_DIALOG_TITLE}</h2>
          <p className="text-sm leading-relaxed text-ink-2">{TERMINAL_DIALOG_INTRO}</p>
        </header>
        <TerminalLaunchBody launch={launch} projectId={projectId} attachments={attachments} />
        <TerminalLaunchFooter launch={launch} attachments={attachments} onClose={close} onConfirm={() => void confirm()} />
      </section>
    </dialog>
  );
}
