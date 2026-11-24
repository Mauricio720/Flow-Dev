import type { QuestionEntry } from "../sessionContract";
import { questionKey } from "../questionAnswerModel";
import { ANSWERED_LABEL, CANCELLED_LABEL, SECRET_ANSWER_HIDDEN, WAITING_FOR_OPERATOR_LABEL } from "../sessionCopy";

function answerText(entry: QuestionEntry, question: QuestionEntry["questions"][number]) {
  if (question.secret) return SECRET_ANSWER_HIDDEN;
  const answer = entry.answers?.[questionKey(question)] ?? entry.answers?.[question.question];
  return Array.isArray(answer) ? answer.join(", ") : answer;
}

export function QuestionSummary({ entry }: { entry: QuestionEntry }) {
  const note = entry.status === "cancelled" ? CANCELLED_LABEL : entry.status === "answered" ? ANSWERED_LABEL : WAITING_FOR_OPERATOR_LABEL;
  return (
    <div className="space-y-2">
      <ul className="space-y-1.5 text-sm">
        {entry.questions.map((question) => (
          <li key={questionKey(question)}>
            <span className="font-medium text-ink">{question.question}</span>
            {entry.status === "answered" && <span className="block text-ink-2 [overflow-wrap:anywhere]">{answerText(entry, question)}</span>}
          </li>
        ))}
      </ul>
      <p className="text-xs text-ink-3">{note}</p>
    </div>
  );
}
