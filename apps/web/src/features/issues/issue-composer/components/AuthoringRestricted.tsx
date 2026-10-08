import Link from "next/link";
import { Button } from "@/components/ui/button";
import { projectWorkPath } from "@/lib/navigation/projectRoutes";

const TITLE = "Criação de Issues é para administradores";
const GUIDANCE = "Você pode consultar o histórico de Issues publicadas. O trabalho atribuído a você, em Ready no quadro do projeto, fica em Trabalho atribuído.";

export function AuthoringRestricted({ projectId }: { projectId: string }) {
  return (
    <section aria-label="Criação indisponível" className="space-y-3 px-5 py-8 sm:px-[72px]">
      <h1 className="text-balance text-2xl font-semibold tracking-[-0.02em]">{TITLE}</h1>
      <p className="max-w-[60ch] text-[15px] leading-relaxed text-ink-2">{GUIDANCE}</p>
      <Button variant="secondary" size="sm" asChild><Link href={projectWorkPath(projectId)}>Abrir Trabalho atribuído</Link></Button>
    </section>
  );
}
