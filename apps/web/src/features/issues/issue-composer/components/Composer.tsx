"use client";

import { useState, type FormEvent, type KeyboardEvent } from "react";
import { SendIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import type { SessionPhase } from "../model";
import { GraphRow } from "./Graph";

const placeholders: Record<SessionPhase, string> = {
  new: "Descreva o que você quer mudar…",
  thinking: "Aguarde o Issue Author terminar…",
  awaiting: "Responda à pergunta do Issue Author…",
  draft: "Peça um ajuste no draft…",
  published: "Comente algo sobre esta issue…",
};

type Props = {
  phase: SessionPhase;
  suggestions: string[];
  hasItems: boolean;
  draftText: string;
  onDraftText: (text: string) => void;
  onSend: (text: string) => void;
  merged: boolean;
};

export function Composer({ phase, suggestions, hasItems, draftText, onDraftText, onSend, merged }: Props) {
  const [focused, setFocused] = useState(false);
  const busy = phase === "thinking";
  const canSend = draftText.trim().length > 0 && !busy;

  function submit(event?: FormEvent) {
    event?.preventDefault();
    if (!canSend) return;
    onSend(draftText.trim());
    onDraftText("");
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) submit(event);
  }

  return (
    <GraphRow node="head" first={!hasItems} last trunk={merged ? "merge" : "ink"} nodeY={suggestions.length > 0 && !busy ? 90 : 50}>
      <form onSubmit={submit} className="pt-6 pb-4">
        {suggestions.length > 0 && !busy && (
          <div className="mb-2.5 flex flex-wrap gap-2" aria-label="Respostas sugeridas">
            {suggestions.map((suggestion) => (
              <Button
                key={suggestion}
                type="button"
                variant="suggestion"
                size="chip"
                onClick={() => onSend(suggestion)}
              >
                {suggestion}
              </Button>
            ))}
          </div>
        )}
        <div
          className={`rounded-xl border bg-raised shadow-raised transition-colors ${focused ? "border-project" : "border-line"}`}
        >
          <label htmlFor="composer" className="sr-only">
            Mensagem para o Issue Author
          </label>
          <textarea
            id="composer"
            rows={2}
            value={draftText}
            onChange={(e) => onDraftText(e.target.value)}
            onKeyDown={onKeyDown}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder={placeholders[phase]}
            className="field-sizing-content block max-h-48 min-h-[3.25rem] w-full resize-none bg-transparent px-4 pt-3.5 text-[15px] leading-relaxed text-ink placeholder:text-ink-3 focus:outline-none"
          />
          <div className="flex items-center justify-between gap-3 px-3 pb-3 pl-4">
            <p className="text-xs text-ink-3" aria-live="polite">
              {busy ? (
                <span className="flex items-center gap-2">
                  <span className="node-running size-1.5 rounded-full bg-project" aria-hidden="true" />
                  Issue Author está trabalhando
                </span>
              ) : (
                <>
                  <kbd className="font-sans">Enter</kbd> envia · <kbd className="font-sans">Shift + Enter</kbd> quebra linha
                </>
              )}
            </p>
            <Button
              type="submit"
              size="icon"
              disabled={!canSend}
              aria-label="Enviar"
              className="shrink-0 hover:bg-primary/85 disabled:opacity-25"
            >
              <SendIcon size={18} />
            </Button>
          </div>
        </div>
      </form>
    </GraphRow>
  );
}
