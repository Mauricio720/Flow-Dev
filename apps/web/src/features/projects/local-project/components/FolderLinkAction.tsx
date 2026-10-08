import { FolderIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import type { FolderLink } from "../hooks/useFolderLink";
import { FOLDER_ACTION_LABEL, FOLDER_FAILURE_TITLE, UNLINK_LABEL } from "../localProjectCopy";
import { FolderProgress } from "./FolderProgress";

type Props = { folder: FolderLink; disabled: boolean; onUnlink?: () => void };

function FolderFailure({ message }: { message: string }) {
  return (
    <div role="alert" className="row-strike max-w-[65ch] space-y-1 rounded-lg border border-destructive/40 bg-raised px-4 py-3 text-sm">
      <p className="font-medium text-destructive">{FOLDER_FAILURE_TITLE}</p>
      <p className="text-ink-2">{message}</p>
    </div>
  );
}

export function FolderLinkAction({ folder, disabled, onUnlink }: Props) {
  const { phase } = folder;
  const waiting = phase !== "idle";
  const linked = onUnlink !== undefined;
  return (
    <div role="group" aria-label="Pasta do projeto neste computador" className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant={linked ? "secondary" : "default"} size={linked ? "sm" : "default"} disabled={disabled || waiting} aria-busy={waiting} onClick={() => void folder.choose()} className="disabled:cursor-progress">
          {waiting ? <span aria-hidden="true" className="node-running size-2 rounded-full bg-current" /> : <FolderIcon size={16} />}
          {linked ? FOLDER_ACTION_LABEL.change : FOLDER_ACTION_LABEL.link}
        </Button>
        {linked && <Button type="button" variant="ghost" size="sm" disabled={disabled || waiting} onClick={onUnlink} className="text-destructive hover:text-destructive sm:ml-auto">{UNLINK_LABEL}</Button>}
      </div>
      {phase !== "idle" && <FolderProgress phase={phase} />}
      {folder.failure && <FolderFailure message={folder.failure} />}
    </div>
  );
}
