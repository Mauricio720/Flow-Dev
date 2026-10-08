import type { ReactNode } from "react";
import { FolderIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { NO_LINK_NOTE, NO_LINK_TITLE, UNAVAILABLE_NOTE, UNAVAILABLE_TITLE } from "../localProjectCopy";

type NoticeProps = { title: string; note: string; children?: ReactNode };

function Notice({ title, note, children }: NoticeProps) {
  return (
    <section aria-label={title} className="flex flex-col gap-4 rounded-xl border border-dashed border-line px-5 py-5 sm:flex-row sm:gap-5">
      <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-lg border border-line bg-raised text-ink-2"><FolderIcon size={18} /></span>
      <div className="min-w-0 flex-1 space-y-4">
        <div className="space-y-1">
          <h2 className="text-[15px] font-semibold">{title}</h2>
          <p className="max-w-[65ch] text-sm text-ink-2">{note}</p>
        </div>
        {children}
      </div>
    </section>
  );
}

export const UnavailableNotice = () => <Notice title={UNAVAILABLE_TITLE} note={UNAVAILABLE_NOTE} />;
export const NoLinkNotice = ({ children }: { children: ReactNode }) => <Notice title={NO_LINK_TITLE} note={NO_LINK_NOTE}>{children}</Notice>;

export function RefreshNotice({ message, busy, onRefresh }: { message: string; busy: boolean; onRefresh: () => void }) {
  return (
    <div role="alert" className="space-y-2 rounded-xl border border-line bg-surface px-5 py-3 text-sm">
      <p className="max-w-[65ch] text-ink-2">{message}</p>
      <Button type="button" variant="outline" size="sm" disabled={busy} onClick={onRefresh}>Atualizar vínculo</Button>
    </div>
  );
}
