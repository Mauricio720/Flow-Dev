"use client";

import type { ReactNode } from "react";
import { LayersIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

const DRAWER_TITLE = "Fontes e contexto consultado";

export function SourcesDrawer({ children }: { children: ReactNode }) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button type="button" variant="ghost" size="sm" className="2xl:hidden">
          <LayersIcon />
          Fontes
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[min(22rem,90vw)] gap-0 p-0" closeLabel="Fechar fontes">
        <SheetTitle className="sr-only">{DRAWER_TITLE}</SheetTitle>
        <SheetDescription className="sr-only">Consultas registradas e fontes citadas pelo draft atual.</SheetDescription>
        <div className="h-full pt-10">{children}</div>
      </SheetContent>
    </Sheet>
  );
}
