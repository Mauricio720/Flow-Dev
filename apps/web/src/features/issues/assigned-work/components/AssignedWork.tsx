import type { Project } from "@/lib/projects/contract";
import type { WorkListLoad } from "../contract";
import { ActiveWork } from "./ActiveWork";
import { ReadyQueue } from "./ReadyQueue";

type Props = { project: Project; initial: WorkListLoad };

export function AssignedWork({ project, initial }: Props) {
  return (
    <main className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-8 sm:px-8 sm:py-10">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-[-0.03em]">Trabalho atribuído</h1>
          <p className="max-w-2xl text-[15px] leading-7 text-ink-2">Issues atribuídas a você e em Ready no quadro de {project.name}. Reivindicar é explícito: nada é planejado nem executado sem o seu pedido.</p>
        </header>
        <ReadyQueue projectId={project.id} initial={initial.queue} />
        <ActiveWork projectId={project.id} initial={initial.active} />
      </div>
    </main>
  );
}
