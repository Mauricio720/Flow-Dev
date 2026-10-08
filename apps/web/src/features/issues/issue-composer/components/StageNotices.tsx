import Link from "next/link";
import { Button } from "@/components/ui/button";
import { STATUS_LABEL } from "../taskCopy";
import type { TaskStatus } from "../contract";
import { GraphRow } from "@/components/tasks/Graph";

const READ_ONLY_ACTIONS = "Você pode consultar a conversa, o draft e as fontes. Enviar mensagens, ditar, editar e publicar ficam reservados à pessoa autora.";
const COMPLETED_NOTE = "A Issue desta tarefa foi publicada e não aceita novas mensagens nem edições. O trabalho seguinte acontece em Trabalho atribuído; para outra mudança, comece uma nova intenção.";
const STALE_NOTICE = "Mostrando o último estado confirmado. A atualização mais recente falhou.";
const CONVERSATION_FAILURE_NOTICE = "Não foi possível carregar a conversa agora. A Issue continua disponível.";

type ReadOnlyProps = { author: string; status: TaskStatus; onNewIntent: (() => void) | null; workHref: string };

export function ReadOnlyNotice({ author, status, onNewIntent, workHref }: ReadOnlyProps) {
  return (
    <GraphRow node="head" last nodeY={50}>
      <section aria-label="Somente leitura" className="mt-6 mb-4 space-y-2 rounded-xl border border-line bg-raised px-4 py-3.5">
        <h2 className="text-sm font-semibold">Somente leitura · tarefa de {author}</h2>
        <p className="max-w-[65ch] text-sm leading-relaxed text-ink-2">{READ_ONLY_ACTIONS}</p>
        <p className="text-xs text-ink-3">Estado atual: {STATUS_LABEL[status]}.</p>
        {onNewIntent ? <Button type="button" variant="secondary" size="sm" onClick={onNewIntent}>Começar uma nova intenção</Button> : <Button variant="secondary" size="sm" asChild><Link href={workHref}>Abrir Trabalho atribuído</Link></Button>}
      </section>
    </GraphRow>
  );
}

export function CompletedNotice({ onNewIntent }: { onNewIntent: () => void }) {
  return (
    <GraphRow node="published" last trunk="merge" nodeY={50}>
      <section aria-label="Issue publicada" className="mt-6 mb-4 space-y-2 rounded-xl border border-line bg-raised px-4 py-3.5">
        <p className="max-w-[65ch] text-sm leading-relaxed text-ink-2">{COMPLETED_NOTE}</p>
        <Button type="button" variant="secondary" size="sm" onClick={onNewIntent}>Começar uma nova intenção</Button>
      </section>
    </GraphRow>
  );
}

export function StaleNotice({ onRefresh }: { onRefresh: () => void }) {
  return (
    <div role="status" className="flex flex-wrap items-center gap-3 border-b border-line bg-surface px-4 py-2.5 text-sm">
      <p className="text-ink-2">{STALE_NOTICE}</p>
      <Button type="button" variant="outline" size="sm" onClick={onRefresh}>Atualizar agora</Button>
    </div>
  );
}

export function ConversationNotice({ onRefresh }: { onRefresh: () => void }) {
  return (
    <li role="alert" className="space-y-2 pb-6 pl-[52px] text-sm sm:pl-[72px]">
      <p className="text-ink-2">{CONVERSATION_FAILURE_NOTICE}</p>
      <Button type="button" variant="outline" size="sm" onClick={onRefresh}>Recarregar a conversa</Button>
    </li>
  );
}
