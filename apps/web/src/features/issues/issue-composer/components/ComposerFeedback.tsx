import { MAX_MESSAGE_CODE_POINTS } from "../contract";
import { dictationFeedback } from "../dictationCopy";
import type { DictationPhase } from "../dictationState";
import type { Submission } from "../hooks/useMessageActions";
import { failureMessage } from "../taskCopy";

const UNCONFIRMED = "Não foi possível confirmar o envio. Seu texto continua aqui e ainda não consta como mensagem salva.";
const NOT_ACCEPTED = "O envio não chegou a ser aceito. Seu texto continua aqui; envie de novo quando quiser.";
const LIMIT_FORMAT = new Intl.NumberFormat("pt-BR");

type Props = { length: number; guard: string | null; submission: Submission; phase: DictationPhase; reason: string | null; onCheckSubmission: () => void };

function SubmissionFeedback({ submission, onCheckSubmission }: Pick<Props, "submission" | "onCheckSubmission">) {
  if (submission.phase === "sending") return <p role="status">Enviando…</p>;
  if (submission.phase === "not_accepted") return <p role="status">{NOT_ACCEPTED}</p>;
  if (submission.phase === "rejected") return <p role="alert" className="text-destructive">{failureMessage(submission.failure)}</p>;
  if (submission.phase !== "unconfirmed") return null;
  return (
    <p role="alert" className="text-destructive">
      {UNCONFIRMED} <button type="button" onClick={onCheckSubmission} className="font-medium underline">Verificar envio</button>
    </p>
  );
}

function KeyboardHint() {
  return <p><kbd className="font-sans">Enter</kbd> envia · <kbd className="font-sans">Shift + Enter</kbd> quebra linha</p>;
}

export function ComposerFeedback({ length, guard, submission, phase, reason, onCheckSubmission }: Props) {
  const dictation = dictationFeedback(phase, reason);
  const overLimit = length > MAX_MESSAGE_CODE_POINTS;
  const quiet = !overLimit && !dictation && !guard && submission.phase === "idle";
  return (
    <div className="min-w-0 space-y-1 text-xs text-ink-3">
      {overLimit && <p role="alert" className="text-destructive">A mensagem tem {LIMIT_FORMAT.format(length)} caracteres e o limite é {LIMIT_FORMAT.format(MAX_MESSAGE_CODE_POINTS)}. Ajuste o texto para enviar; nada foi cortado.</p>}
      <SubmissionFeedback submission={submission} onCheckSubmission={onCheckSubmission} />
      {dictation && <p role={dictation.alert ? "alert" : "status"} className={dictation.alert ? "text-destructive" : undefined}>{dictation.text}</p>}
      {guard && <p>{guard}</p>}
      {quiet && <KeyboardHint />}
    </div>
  );
}
