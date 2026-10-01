import Link from "next/link";
import { Button } from "@/components/ui/button";

export function EmptyProjects() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-6 py-16">
      <p className="font-mono text-xs text-clarify-ink">SEM PROJETO ATRIBUÍDO</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">Seu espaço ainda está vazio</h1>
      <p className="mt-4 max-w-lg text-[15px] leading-7 text-ink-2">
        Um administrador precisa atribuir um projeto à sua conta. Quando isso acontecer, atualize esta página para
        continuar.
      </p>
      <Button variant="outline" asChild className="mt-8 w-fit">
        <Link href="/projects">Atualizar projetos</Link>
      </Button>
    </main>
  );
}
