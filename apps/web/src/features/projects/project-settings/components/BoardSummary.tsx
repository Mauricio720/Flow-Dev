import type { Project } from "@/lib/projects/contract";

const LINKED_NOTE = "As issues publicadas por este projeto entram neste quadro com o status Backlog.";
const UNLINKED_NOTE = "Sem quadro vinculado. As issues são criadas apenas no repositório, fora de qualquer quadro.";

export function BoardSummary({ board }: { board: Project["board"] }) {
  return (
    <div className="rounded-xl border border-line bg-surface px-5 py-4">
      {board && <a href={board.url} target="_blank" rel="noopener noreferrer" className="text-[15px] font-medium underline underline-offset-4 [overflow-wrap:anywhere]">{board.title}</a>}
      <p className={`max-w-xl text-sm leading-6 text-ink-2${board ? " mt-2" : ""}`}>{board ? LINKED_NOTE : UNLINKED_NOTE}</p>
    </div>
  );
}
