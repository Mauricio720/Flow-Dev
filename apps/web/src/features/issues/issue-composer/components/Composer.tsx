"use client";

import { useState, type FormEvent, type KeyboardEvent } from "react";
import { SendIcon } from "@/components/icons";
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
              <button
                key={suggestion}
                type="button"
                onClick={() => onSend(suggestion)}
                className="rounded-full border border-clarify/40 bg-clarify-wash px-3 py-1 text-sm text-clarify-ink transition-colors hover:border-clarify"
              >
                {suggestion}
              </button>
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
            className="block max-h-48 min-h-[3.25rem] w-full resize-none bg-transparent px-4 pt-3.5 text-[15px] leading-relaxed text-ink placeholder:text-ink-3 focus:outline-none"
            style={{ fieldSizing: "content" } as React.CSSProperties}
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
            <button
              type="submit"
              disabled={!canSend}
              aria-label="Enviar"
              className="grid size-9 shrink-0 place-items-center rounded-lg bg-ink text-ground transition-[opacity,transform] duration-200 hover:bg-ink/85 active:translate-y-px disabled:opacity-25"
            >
              <SendIcon size={18} />
            </button>
          </div>
        </div>
      </form>
    </GraphRow>
  );
}
