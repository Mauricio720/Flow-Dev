import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PROJECTS_PATH } from "@/lib/navigation/projectRoutes";

export function ProjectUnavailable() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col justify-center px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-[-0.03em]">Projeto indisponível</h1>
      <p className="mt-4 max-w-lg text-[15px] leading-7 text-ink-2">
        Este projeto não existe ou não está mais atribuído à sua conta. Nenhum conteúdo dele é exibido aqui.
      </p>
      <Button variant="outline" asChild className="mt-8 w-fit">
        <Link href={PROJECTS_PATH}>Voltar ao catálogo</Link>
      </Button>
    </main>
  );
}
