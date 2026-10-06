import { ArrowUpRightIcon, CheckIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import type { TaskPublication } from "../contract";
import { publishedIssueUrl, repositoryIssuesUrl } from "../publicationModel";
import { formatMoment } from "../toolModel";
import { MarkdownPreview } from "./MarkdownPreview";

const SNAPSHOT_NOTE = "Este é o snapshot aprovado na publicação. Ele não acompanha edições feitas depois no GitHub.";
const UNTRUSTED_LINK = "O link registrado desta Issue não confere com o repositório do projeto, por isso não é oferecido aqui.";
const UNCERTAIN_GUIDE = "A criação pode ter acontecido no GitHub, mas a resposta não foi confirmada. Confira as Issues do repositório antes de qualquer nova tentativa; criar de novo fica bloqueado até o resultado ser esclarecido.";
const UNKNOWN_AUTHOR = "pessoa autora";

type PublishedProps = { publication: TaskPublication; authorName: string | null };
type UncertainProps = { repository: string; onCheck: () => void };

function ExternalLink({ href, children }: { href: string; children: string }) {
  return (
    <Button variant="ghost" size="sm" asChild className="self-start text-ink hover:text-ink">
      <a href={href} target="_blank" rel="noopener noreferrer">{children} <ArrowUpRightIcon size={14} /></a>
    </Button>
  );
}

export function PublishedResult({ publication, authorName }: PublishedProps) {
  const url = publishedIssueUrl(publication);
  return (
    <footer className="space-y-3 border-t border-line bg-surface px-5 py-3.5">
      <p className="flex items-center gap-2 text-sm text-merge-ink"><CheckIcon />Publicada em <span className="font-mono text-[13px]">{publication.repository}</span></p>
      <p className="text-sm text-ink-2">Criada por {authorName ?? UNKNOWN_AUTHOR} em <time dateTime={publication.createdAt} suppressHydrationWarning>{formatMoment(publication.createdAt)}</time>.</p>
      <p className="text-xs text-ink-3">{SNAPSHOT_NOTE}</p>
      <MarkdownPreview body={publication.bodyMarkdown} label="Corpo publicado renderizado" />
      <details className="rounded-md border border-line bg-raised">
        <summary className="cursor-pointer px-3 py-2 text-sm text-ink-2">Ver Markdown bruto (opcional)</summary>
        <pre tabIndex={0} aria-label="Corpo publicado em Markdown" className="max-h-80 overflow-auto border-t border-line p-3 font-mono text-[13px] leading-relaxed whitespace-pre-wrap [overflow-wrap:anywhere]">{publication.bodyMarkdown}</pre>
      </details>
      {url ? <ExternalLink href={url}>Abrir no GitHub</ExternalLink> : <p role="alert" className="text-sm text-destructive">{UNTRUSTED_LINK}</p>}
    </footer>
  );
}

export function UncertainPublication({ repository, onCheck }: UncertainProps) {
  return (
    <footer className="space-y-3 border-t border-line bg-surface px-5 py-3.5">
      <p role="status" className="flex items-center gap-2 text-sm font-medium"><span className="node-running size-2 rounded-full bg-merge" aria-hidden="true" />Verificando publicação</p>
      <p className="max-w-[65ch] text-sm leading-relaxed text-ink-2">{UNCERTAIN_GUIDE}</p>
      <div className="flex flex-wrap gap-2">
        <ExternalLink href={repositoryIssuesUrl(repository)}>Abrir as Issues do repositório</ExternalLink>
        <Button type="button" variant="outline" size="sm" onClick={onCheck}>Verificar agora</Button>
      </div>
    </footer>
  );
}
