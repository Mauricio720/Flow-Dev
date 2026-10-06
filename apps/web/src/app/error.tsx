"use client";

import { Button } from "@/components/ui/button";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col justify-center px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Não foi possível verificar seu acesso</h1>
      <p className="mt-4 max-w-lg text-[15px] leading-7 text-ink-2">O serviço pode estar temporariamente indisponível. Tente novamente sem perder o contexto da tela.</p>
      <Button type="button" variant="outline" className="mt-8 w-fit" onClick={reset}>Tentar novamente</Button>
    </main>
  );
}
