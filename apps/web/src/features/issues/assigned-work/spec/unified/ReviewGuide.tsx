const STEPS = [
  { title: "Revisa", detail: "Um agente lê o que a implementação mudou e aponta problemas." },
  { title: "Registra", detail: "Os achados ficam em arquivos na pasta da tarefa, dentro do checkout." },
  { title: "Corrige", detail: "Outro agente corrige os achados válidos; a rodada se repete até voltar limpa." },
];
const FINDINGS_PATH = ".compozy/tasks/<tarefa>/reviews-NNN/";

export function ReviewGuide() {
  return (
    <section aria-label="Como o Review funciona" className="space-y-3">
      <ol className="grid gap-x-6 gap-y-3 sm:grid-cols-3">
        {STEPS.map((step, index) => (
          <li key={step.title} className="space-y-1 border-t border-line pt-3">
            <p className="text-sm font-semibold text-ink"><span className="mr-2 font-mono text-xs text-ink-3 tabular-nums">{index + 1}</span>{step.title}</p>
            <p className="text-sm leading-6 text-ink-2">{step.detail}</p>
          </li>
        ))}
      </ol>
      <p className="text-sm leading-6 text-ink-2">Achados em <code className="font-mono text-[13px] text-ink">{FINDINGS_PATH}</code>. As correções ficam no checkout, sem commit, a menos que você marque o commit automático.</p>
    </section>
  );
}
