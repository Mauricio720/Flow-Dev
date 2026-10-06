export function EmptyIntent() {
  return (
    <div className="pb-10 pl-[52px] sm:pl-[72px]">
      <h1 className="text-balance text-3xl leading-tight font-semibold tracking-[-0.03em] sm:text-4xl">O que você quer mudar?</h1>
      <p className="mt-3 max-w-[56ch] text-[15px] leading-relaxed text-ink-2">
        Descreva uma feature, um bug ou um ajuste, digitando ou ditando. O Issue Author consulta o código e as issues do repositório
        deste projeto quando precisa, pergunta só o que faltar e escreve o draft para você revisar.
      </p>
      <p className="mt-3 max-w-[56ch] text-sm leading-relaxed text-ink-3">A tarefa só é salva quando a primeira mensagem é aceita. Nada vai ao GitHub sem a sua aprovação.</p>
    </div>
  );
}
