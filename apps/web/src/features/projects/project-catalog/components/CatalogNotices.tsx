import type { SelectionFailure } from "../hooks/useProjectSelection";

const SELECTION_FAILURES: Record<SelectionFailure, string> = {
  unavailable: "Esse projeto não está mais disponível para a sua conta. A lista foi atualizada.",
  interrupted: "Não foi possível abrir o projeto agora. Nenhum contexto foi trocado; tente novamente.",
};

type Props = { notice: string | null; failure: SelectionFailure | null };

export function CatalogNotices({ notice, failure }: Props) {
  const message = failure ? SELECTION_FAILURES[failure] : notice;
  if (!message) return null;
  return <p role="alert" className="mt-6 rounded-lg border border-line bg-surface px-4 py-3 text-sm leading-6 text-ink-2">{message}</p>;
}
