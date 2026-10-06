import type { Project } from "@/lib/projects/contract";
import { BoardSummary } from "./BoardSummary";

export function BoardReadOnly({ project }: { project: Project }) {
  return (
    <section aria-labelledby="settings-board" className="mt-10 flex flex-col gap-3">
      <h2 id="settings-board" className="text-[15px] font-semibold">Quadro do GitHub</h2>
      <BoardSummary board={project.board} />
      <p className="text-sm text-ink-3">Somente administradores escolhem o quadro do projeto.</p>
    </section>
  );
}
