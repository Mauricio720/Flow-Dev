import { ArrowUpRightIcon } from "@/components/icons";
import { VERIFICATION_LABEL, type DraftSource } from "../draftSources";
import { SOURCE_INK } from "../toolModel";

const UNSAFE_URL_NOTE = "Fonte não validada: o endereço registrado não é um link seguro do GitHub e foi desativado.";
const HISTORICAL_GUIDE = "Registro histórico do que foi consultado. Se o link não abrir, a fonte pode ter sido movida ou removida no GitHub; este registro continua valendo como histórico.";
const HISTORICAL = "historical";

export function SourceEntry({ source }: { source: DraftSource }) {
  return (
    <li className="min-w-0 space-y-1">
      <p className={`font-mono text-[12.5px] [overflow-wrap:anywhere] ${SOURCE_INK[source.kind]}`}>{source.label}</p>
      {source.statement !== null && <p className="text-xs leading-relaxed text-ink-2 [overflow-wrap:anywhere]">{source.statement}</p>}
      <p className="text-xs text-ink-3">{VERIFICATION_LABEL[source.verification]}</p>
      {source.unsafeUrl && <p role="alert" className="text-xs text-destructive">{UNSAFE_URL_NOTE}</p>}
      {source.url && (
        <a href={source.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-ink underline">
          Abrir {source.label} no GitHub <ArrowUpRightIcon size={12} />
        </a>
      )}
      {source.verification === HISTORICAL && <p className="text-xs leading-relaxed text-ink-3">{HISTORICAL_GUIDE}</p>}
    </li>
  );
}
