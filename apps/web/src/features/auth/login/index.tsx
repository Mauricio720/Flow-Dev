import { FlowMark } from "@/components/icons";
import { FlowMap, FlowMapVertical } from "./components/FlowMap";
import { GitHubSignIn } from "./components/GitHubSignIn";

const errors: Record<string, string> = {
  acesso_negado: "O GitHub não concedeu acesso. Tente de novo e aprove as permissões na tela do GitHub.",
  access_denied: "O GitHub não concedeu acesso. Tente de novo e aprove as permissões na tela do GitHub.",
  invalid_code: "Não foi possível confirmar a autorização do GitHub. Tente novamente.",
  state_mismatch: "Não foi possível confirmar a autorização do GitHub. Tente novamente.",
  unable_to_get_user_info: "Não foi possível confirmar sua identidade do GitHub. Tente novamente.",
  sessao_expirada: "Sua sessão expirou. Entre de novo para continuar de onde parou.",
  falha_autorizacao: "Não foi possível confirmar a autorização do GitHub. Tente novamente.",
  falha_temporaria: "O serviço está temporariamente indisponível. Tente novamente em instantes.",
};

type Props = { error?: string; destination?: string };

export function LoginScreen({ error, destination = "/projects" }: Props) {
  const message = error ? (errors[error] ?? "Não foi possível entrar com o GitHub. Tente de novo.") : null;

  return (
    <main className="grid min-h-dvh flex-1 lg:grid-cols-[minmax(0,1.35fr)_minmax(420px,1fr)]">
      <section
        aria-label="Fluxo de uma issue"
        className="cell-grid relative order-2 flex flex-col justify-between gap-8 border-t border-line bg-surface px-6 py-10 sm:px-10 lg:order-1 lg:border-t-0 lg:border-r lg:px-14 lg:py-12"
      >
        <div className="flex flex-1 items-center justify-center">
          <FlowMap className="hidden sm:block" />
          <FlowMapVertical className="sm:hidden" />
        </div>
        <p className="max-w-md text-sm leading-relaxed text-ink-2">
          Cada consulta do agente vira uma linha no trilho. Nada chega ao GitHub sem passar por você.
        </p>
      </section>

      <section className="order-1 flex flex-col px-6 py-8 sm:px-10 lg:order-2 lg:px-16 lg:py-12">
        <div className="flex items-center gap-2.5 text-[15px] font-semibold tracking-[-0.01em]">
          <FlowMark />
          Flow Dev
        </div>

        <div className="flex flex-1 flex-col justify-center py-12 lg:py-0">
          <div className="w-full max-w-[400px]">
            <h1 className="text-balance text-[2.5rem] leading-[1.05] font-semibold tracking-[-0.035em] sm:text-5xl">
              Descreva a mudança. Aprove a issue.
            </h1>
            <p className="mt-5 text-[15px] leading-relaxed text-ink-2">
              O Issue Author lê o código e as issues do repositório antes de escrever o draft. Você revisa,
              edita e decide quando publicar.
            </p>

            {message && (
              <p role="alert" className="mt-8 rounded-lg border border-github/40 bg-github-wash px-4 py-3 text-sm leading-relaxed text-github-ink">
                {message}
              </p>
            )}

            <div className="mt-8">
              <GitHubSignIn destination={destination} />
            </div>

            <h2 className="mt-10 text-sm font-medium">O que o Flow Dev pede ao GitHub</h2>
            <ul className="mt-3 space-y-3 text-sm leading-relaxed text-ink-2">
              <li className="flex gap-3">
                <span className="mt-[5px] size-2.5 shrink-0 rounded-full border-2 border-project" aria-hidden="true" />
                Ler código e issues dos repositórios que você escolher.
              </li>
              <li className="flex gap-3">
                <span className="mt-[5px] size-2.5 shrink-0 rounded-full bg-merge" aria-hidden="true" />
                Criar issues, e só quando você clicar em Criar Issue.
              </li>
            </ul>
          </div>
        </div>

            <p className="text-xs text-ink-3">O Flow Dev solicita somente sua identidade do GitHub.</p>
      </section>
    </main>
  );
}
