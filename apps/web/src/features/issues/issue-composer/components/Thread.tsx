import type { ReactNode } from "react";
import type { ThreadEntry } from "../threadModel";
import { ThreadRow } from "./ThreadRows";

type Props = { title: string; entries: ThreadEntry[]; authorLabel: string; hasMore: boolean; onLoadMore: () => void; children?: ReactNode };

const MORE_MESSAGES_LABEL = "Carregar mensagens seguintes";

export function Thread({ title, entries, authorLabel, hasMore, onLoadMore, children }: Props) {
  return (
    <ol aria-label={`Conversa: ${title}`}>
      {entries.map((entry, index) => (
        <li key={entry.id}>
          <ThreadRow entry={entry} first={index === 0} authorLabel={authorLabel} trunk="ink" />
        </li>
      ))}
      {hasMore && (
        <li className="pb-7 pl-[52px] sm:pl-[72px]">
          <button type="button" onClick={onLoadMore} className="text-sm text-project-ink underline">{MORE_MESSAGES_LABEL}</button>
        </li>
      )}
      {children}
    </ol>
  );
}
