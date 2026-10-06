import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { Composer } from "@/features/issues/issue-composer/components/Composer";
import type { CaptureScope } from "@/features/issues/issue-composer/hooks/dictationApi";
import { useDictation } from "@/features/issues/issue-composer/hooks/useDictation";
import { P } from "./tasks";

export const NEW_INTENT_SCOPE: CaptureScope = { projectId: P, taskId: null, expectedVersion: null };
const BLOCKED_GUARD = "Tarefa indisponível para mensagens.";

type Props = { scope?: CaptureScope; enabled?: boolean; onSend?: (text: string) => void };

export function DictationHarness({ scope = NEW_INTENT_SCOPE, enabled = true, onSend = () => undefined }: Props) {
  const input = useDictation(scope, enabled);
  return <Composer input={input} guard={enabled ? null : BLOCKED_GUARD} placeholder="" submission={{ phase: "idle" }} first onSend={onSend} onCheckSubmission={() => undefined} />;
}

export function messageBox() {
  return screen.getByRole<HTMLTextAreaElement>("textbox", { name: "Mensagem para o Issue Author" });
}

export function sendButton() {
  return screen.getByRole<HTMLButtonElement>("button", { name: "Enviar" });
}

export function renderDictation(props: Props = {}) {
  const onSend = vi.fn();
  const view = render(<DictationHarness onSend={onSend} {...props} />);
  return { ...view, onSend };
}

export async function startListening(typed = "Corrigir checkout") {
  if (typed) await userEvent.type(messageBox(), typed);
  await userEvent.click(screen.getByRole("button", { name: "Iniciar ditado" }));
  return screen.findByRole("button", { name: "Parar ditado" });
}

export async function stopListening() {
  await userEvent.click(screen.getByRole("button", { name: "Parar ditado" }));
}
