import Link from "next/link";
import { Button } from "@/components/ui/button";
import { projectWorkPath } from "@/lib/navigation/projectRoutes";
import { PREPARATION_NOTE } from "../localProjectCopy";

export function PreparationEntry({ projectId }: { projectId: string }) {
  return (
    <section aria-label="Preparar ação local" className="flex flex-col gap-3 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <p className="max-w-[52ch] text-sm text-ink-2">{PREPARATION_NOTE}</p>
      <Button variant="secondary" size="sm" asChild className="self-start sm:self-auto"><Link href={projectWorkPath(projectId)}>Abrir trabalho para preparar uma ação</Link></Button>
    </section>
  );
}
