const examples = [
  "Quero adicionar login com Google na tela de cadastro.",
  "O cupom de desconto não é aplicado quando o frete é grátis.",
  "Preciso de paginação na lista de clientes do admin.",
];

export function EmptyIntent({ onPick }: { onPick: (text: string) => void }) {
  return (
    <div className="pb-10 pl-[52px] sm:pl-[72px]">
      <h1 className="text-balance text-3xl leading-tight font-semibold tracking-[-0.03em] sm:text-4xl">O que você quer mudar?</h1>
      <p className="mt-3 max-w-[56ch] text-[15px] leading-relaxed text-ink-2">
        Descreva uma feature, um bug ou um ajuste. O Issue Author procura no código e nas issues do repositório, pergunta o
        que faltar e escreve o draft para você revisar.
      </p>
      <h2 className="mt-8 text-xs font-medium text-ink-3">Comece por um exemplo</h2>
      <ul className="mt-2 divide-y divide-line border-y border-line">
        {examples.map((example) => (
          <li key={example}>
            <button
              type="button"
              onClick={() => onPick(example)}
              className="w-full py-3 text-left text-[15px] text-ink-2 transition-colors hover:text-ink"
            >
              {example}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
