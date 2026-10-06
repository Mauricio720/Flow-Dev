"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { PlanningRoute } from "../contract";
import { ROUTE_LABEL, ROUTE_NEXT_NOTE, ROUTE_ORDER } from "../planningCopy";

const NO_CHOICE = "Escolha uma rota antes de salvar.";
type Props = { saved: PlanningRoute | null; busy: boolean; onChoose: (route: PlanningRoute | null) => void; onSave: (route: PlanningRoute) => void; onCancel: () => void };

export function PlanningRouteSelector({ saved, busy, onChoose, onSave, onCancel }: Props) {
  const [choice, setChoice] = useState<PlanningRoute | null>(saved);
  const [invalid, setInvalid] = useState(false);
  function pick(route: PlanningRoute) {
    setChoice(route);
    setInvalid(false);
    onChoose(route);
  }
  function save() {
    if (!choice) return setInvalid(true);
    onSave(choice);
  }
  return (
    <form onSubmit={(event) => { event.preventDefault(); save(); }} className="space-y-3 rounded-xl border border-line bg-surface px-5 py-4">
      <fieldset className="space-y-2" aria-describedby={invalid ? "route-error" : undefined}>
        <legend className="text-sm font-medium">Rota do planejamento</legend>
        {ROUTE_ORDER.map((route) => (
          <label key={route} className="flex items-start gap-2 text-sm">
            <input type="radio" name="planning-route" value={route} checked={choice === route} onChange={() => pick(route)} className="mt-1" />
            <span><span className="font-medium">{ROUTE_LABEL[route]}</span><span className="block text-xs text-ink-3">{ROUTE_NEXT_NOTE}</span></span>
          </label>
        ))}
      </fieldset>
      {invalid && <p id="route-error" role="alert" className="text-sm text-destructive">{NO_CHOICE}</p>}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" disabled={busy}>Salvar rota</Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>Cancelar</Button>
      </div>
    </form>
  );
}
