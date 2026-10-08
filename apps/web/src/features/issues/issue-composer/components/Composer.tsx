"use client";

import { useId, useState, type FormEvent, type KeyboardEvent } from "react";
import { SendIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { MAX_MESSAGE_CODE_POINTS, codePoints } from "../contract";
import { acceptDisclosure, disclosureAccepted } from "../dictationDisclosure";
import type { AuthoringInput } from "../hooks/useDictation";
import type { Submission } from "../hooks/useMessageActions";
import { ComposerFeedback } from "./ComposerFeedback";
import { DictationControls, DictationDisclosure } from "./DictationControls";
import { GraphRow } from "@/components/tasks/Graph";

const INPUT_LABEL = "Mensagem para o Issue Author";
const SUBMIT_KEY = "Enter";

type Props = { input: AuthoringInput; guard: string | null; placeholder: string; submission: Submission; first: boolean; onSend: (text: string) => void; onCheckSubmission: () => void };

function useDisclosureGate(start: () => void) {
  const [open, setOpen] = useState(false);
  const begin = () => (disclosureAccepted() ? start() : setOpen(true));
  function accept() {
    acceptDisclosure();
    setOpen(false);
    start();
  }
  return { open, begin, accept, decline: () => setOpen(false) };
}

export function Composer({ input, guard, placeholder, submission, first, onSend, onCheckSubmission }: Props) {
  const id = useId();
  const [focused, setFocused] = useState(false);
  const disclosure = useDisclosureGate(input.start);
  const length = codePoints(input.text);
  const canSend = input.text.trim().length > 0 && !guard && !input.capturing && length <= MAX_MESSAGE_CODE_POINTS && submission.phase !== "sending";
  function submit(event: FormEvent | KeyboardEvent) {
    event.preventDefault();
    if (canSend) onSend(input.text.trim());
  }
  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => event.key === SUBMIT_KEY && !event.shiftKey && !event.nativeEvent.isComposing && submit(event);
  return (
    <GraphRow node="head" first={first} last nodeY={50}>
      <form onSubmit={submit} className="pt-6 pb-4">
        {disclosure.open && <DictationDisclosure onAccept={disclosure.accept} onDecline={disclosure.decline} />}
        <div className={`rounded-xl border bg-raised shadow-raised transition-colors ${focused ? "border-project" : "border-line"}`}>
          <label htmlFor={id} className="sr-only">{INPUT_LABEL}</label>
          <textarea id={id} rows={2} value={input.text} placeholder={placeholder} onChange={(event) => input.setText(event.target.value)} onKeyDown={onKeyDown} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} className="field-sizing-content block max-h-48 min-h-[3.25rem] w-full resize-none bg-transparent px-4 pt-3.5 text-[15px] leading-relaxed text-ink placeholder:text-ink-3 focus:outline-none" />
          <div className="flex flex-wrap items-center justify-between gap-3 px-3 pb-3 pl-4">
            <ComposerFeedback length={length} guard={guard} submission={submission} phase={input.phase} reason={input.reason} onCheckSubmission={onCheckSubmission} />
            <div className="ml-auto flex shrink-0 items-center gap-2">
              <DictationControls phase={input.phase} available={input.available} onStart={disclosure.begin} onStop={input.stop} onCancel={input.cancel} />
              <Button type="submit" size="icon" disabled={!canSend} aria-label="Enviar" className="shrink-0 hover:bg-primary/85 disabled:opacity-25"><SendIcon size={18} /></Button>
            </div>
          </div>
        </div>
      </form>
    </GraphRow>
  );
}
