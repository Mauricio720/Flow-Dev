"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { SpecInteractionItem } from "./specContract";
import type { SpecRequest } from "./specCommandState";
import { ALLOW_ONCE_LABEL, DENY_ONCE_LABEL, INTEGRATION_ERROR, SUBMIT_LABEL } from "./specCopy";

type Props = { interaction: SpecInteractionItem; canAct: boolean; busy: boolean; onSubmit: (request: SpecRequest) => void };

function Question({ interaction, canAct, busy, onSubmit }: Props) {
  const [choice, setChoice] = useState<number | null>(null);
  const [text, setText] = useState("");
  const submit = () => onSubmit({ action: "spec.answer", attemptId: interaction.attemptId, interactionId: interaction.id, response: choice !== null ? { choiceIndex: choice } : { text } });
  const ready = choice !== null || text.trim().length > 0;
  return (
    <fieldset className="space-y-3" disabled={!canAct || busy}>
      <legend className="max-w-[72ch] whitespace-pre-wrap text-[15px] font-medium">{interaction.description}</legend>
      {(interaction.choices ?? []).map((option, index) => (
        <label key={option} className="flex items-center gap-2 text-[15px]"><input type="radio" name={`q-${interaction.id}`} checked={choice === index} onChange={() => setChoice(index)} />{option}</label>
      ))}
      <Textarea aria-label="Resposta em texto" value={text} onChange={(event) => { setText(event.target.value); setChoice(null); }} />
      <Button type="button" size="sm" disabled={!ready} onClick={submit}>{SUBMIT_LABEL}</Button>
    </fieldset>
  );
}

function Permission({ interaction, canAct, busy, onSubmit }: Props) {
  const actionable = Boolean(interaction.targetDigest && interaction.description.trim());
  const decide = (decision: "allow_once" | "deny_once") => onSubmit({ action: "spec.permission", attemptId: interaction.attemptId, interactionId: interaction.id, actionDigest: interaction.targetDigest!, decision });
  return (
    <div className="space-y-3">
      <p className="max-w-[72ch] whitespace-pre-wrap text-[15px] font-medium">{interaction.description || "Permissão sem descrição"}</p>
      {!actionable && <p role="alert" className="text-sm text-destructive">{INTEGRATION_ERROR}</p>}
      {canAct && (
        <div className="flex gap-2">
          {actionable && <Button type="button" size="sm" disabled={busy} onClick={() => decide("allow_once")}>{ALLOW_ONCE_LABEL}</Button>}
          {actionable && <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => decide("deny_once")}>{DENY_ONCE_LABEL}</Button>}
        </div>
      )}
    </div>
  );
}

export function SpecInteraction(props: Props) {
  const label = props.interaction.kind === "permission" ? "Pedido de permissão" : "Pergunta do agente";
  return <section aria-label={label} className="space-y-2 rounded-lg border-2 border-clarify px-4 py-3"><h3 className="text-sm font-semibold text-clarify-ink">{label}</h3>{props.interaction.kind === "permission" ? <Permission {...props} /> : <Question {...props} />}</section>;
}
