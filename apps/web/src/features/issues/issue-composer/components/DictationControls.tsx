import { MicIcon, StopIcon, XIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import type { DictationPhase } from "../dictationState";

const START_LABEL = "Iniciar ditado";
const STOP_LABEL = "Parar ditado";
const CANCEL_LABEL = "Cancelar ditado e restaurar o texto anterior";
const UNAVAILABLE_TITLE = "O ditado fica disponível quando a tarefa aceitar uma nova mensagem.";
const DISCLOSURE = "Antes de gravar: o áudio é enviado à Groq, um serviço externo, para transcrição em português. Ele não fica salvo no Flow Dev nem vai para a Issue, e você revisa o texto antes de enviar.";

type Props = { phase: DictationPhase; available: boolean; onStart: () => void; onStop: () => void; onCancel: () => void };
type DisclosureProps = { onAccept: () => void; onDecline: () => void };

function CancelButton({ onCancel }: { onCancel: () => void }) {
  return <Button type="button" variant="ghost" size="sm" aria-label={CANCEL_LABEL} title={CANCEL_LABEL} onClick={onCancel}><XIcon />Cancelar</Button>;
}

export function DictationControls({ phase, available, onStart, onStop, onCancel }: Props) {
  if (phase === "listening") {
    return (
      <>
        <span className="node-running size-2 rounded-full bg-github" aria-hidden="true" />
        <Button type="button" variant="secondary" size="sm" aria-label={STOP_LABEL} onClick={onStop}><StopIcon />Parar</Button>
        <CancelButton onCancel={onCancel} />
      </>
    );
  }
  if (phase === "permission_pending" || phase === "processing") return <CancelButton onCancel={onCancel} />;
  return (
    <Button type="button" variant="ghost" size="icon" aria-label={START_LABEL} title={available ? START_LABEL : UNAVAILABLE_TITLE} disabled={!available} onClick={onStart}>
      <MicIcon size={18} />
    </Button>
  );
}

export function DictationDisclosure({ onAccept, onDecline }: DisclosureProps) {
  return (
    <div role="group" aria-label="Aviso sobre o ditado" className="mb-2.5 space-y-2 rounded-lg border border-line bg-surface px-4 py-3">
      <p className="max-w-[65ch] text-sm leading-relaxed text-ink-2">{DISCLOSURE}</p>
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" onClick={onAccept}>Entendi, iniciar ditado</Button>
        <Button type="button" variant="ghost" size="sm" onClick={onDecline}>Agora não</Button>
      </div>
    </div>
  );
}
