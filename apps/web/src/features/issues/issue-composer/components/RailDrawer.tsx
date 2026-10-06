"use client";

import type { ReactNode } from "react";
import { MenuIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

type Props = { open: boolean; onOpenChange: (open: boolean) => void; children: ReactNode };

export function RailDrawer({ open, onOpenChange, children }: Props) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <Button type="button" variant="ghost" size="icon-sm" aria-label="Abrir intenções" className="text-ink-2 xl:hidden">
          <MenuIcon size={18} />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[min(20rem,86vw)] gap-0 p-0 xl:hidden" overlayClassName="xl:hidden" closeLabel="Fechar intenções">
        <SheetTitle className="sr-only">Intenções</SheetTitle>
        <SheetDescription className="sr-only">Tarefas salvas neste projeto e o início de uma nova intenção.</SheetDescription>
        <div className="h-full pt-10">{children}</div>
      </SheetContent>
    </Sheet>
  );
}
