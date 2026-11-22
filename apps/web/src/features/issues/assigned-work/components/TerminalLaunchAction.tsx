"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { TaskDetail } from "../contract";
import type { TerminalOpened } from "../terminalContract";
import { TERMINAL_ACTION_LABEL, unavailableImagesNotice } from "../terminalCopy";
import { TerminalLaunchDialog } from "./TerminalLaunchDialog";

type Props = { detail: TaskDetail; onOpened: () => Promise<void> | void };

export function TerminalLaunchAction({ detail, onOpened }: Props) {
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const opened = (result: TerminalOpened) => {
    setNotice(result.unavailableIssueImages > 0 ? unavailableImagesNotice(result.unavailableIssueImages) : null);
    void onOpened();
  };
  return (
    <>
      <Button ref={trigger} type="button" size="sm" onClick={() => setOpen(true)}>{TERMINAL_ACTION_LABEL}</Button>
      {open && <TerminalLaunchDialog projectId={detail.task.projectId} taskId={detail.task.id} trigger={trigger} onClose={() => setOpen(false)} onOpened={opened} />}
      {notice && <p role="status" className="text-sm text-ink-2">{notice}</p>}
    </>
  );
}
