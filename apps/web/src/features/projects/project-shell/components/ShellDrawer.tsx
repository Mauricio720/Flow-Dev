"use client";

import type { ReactNode } from "react";
import { MenuIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

export function ShellDrawer({ children }: { children: ReactNode }) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button type="button" variant="ghost" size="icon-sm" aria-label="Abrir menu do projeto" className="-ml-1 text-ink-2 lg:hidden">
          <MenuIcon size={18} />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[min(17rem,86vw)] gap-0 p-0 lg:hidden" overlayClassName="lg:hidden" closeLabel="Fechar menu do projeto">
        <SheetTitle className="sr-only">Menu do projeto</SheetTitle>
        <SheetDescription className="sr-only">Projeto ativo, menus e estado do acesso ao repositório.</SheetDescription>
        {children}
      </SheetContent>
    </Sheet>
  );
}
