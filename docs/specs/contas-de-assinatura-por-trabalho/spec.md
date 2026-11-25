# Spec: Várias contas de assinatura de IA, escolhidas por trabalho

> **Status:** Em revisão · **Data:** 2026-11-24 · **Nível:** L4 ancorada (vai para spec-to-tasks) · **Origem:** Issue #6 (rota PRD, complexidade Alta)
> **Contexto lido:** `apps/web/PRODUCT.md`; Specs A, C, D e E; `packages/api/src/infra/agents/` (runners, `agentEnvironment.ts`, `agentFailure.ts`); `packages/api/src/infra/terminal/` (`agentSdkQueryOptions.ts`, `terminalStateRoot.ts`, `codex/`); `sessionWorkerParts.ts`; `sessionStarter.ts`; `agentSessionRuntime.ts`; esquemas `tasks/terminal.ts`, `projectLocalCheckouts.ts`, `software.ts`; componentes de abertura em `assigned-work/`; documentação do Claude Code (`CLAUDE_CONFIG_DIR`, `setup-token`); CLIs instalados (Claude Code 2.1.330 `claude auth status --json`, Codex 0.159.3 `codex login status`).

## Resumo para revisão

- **O que muda:**
  - Cada pessoa cadastra na nova página pessoal "Contas de IA" quantas contas de assinatura quiser, do Claude Code e do Codex, e faz login em cada uma pelo CLI, com um comando que o Flow Dev mostra.
  - Na tela do trabalho, a pessoa operadora escolhe uma conta do Claude e uma do Codex. Toda sessão aberta no trabalho (rota, Gerar tarefas, itens do plano) roda na conta escolhida para o agente dela.
  - Trocar a conta só afeta as sessões abertas depois da troca. Uma sessão já aberta é sempre retomada na conta em que nasceu.
  - Se a conta estiver deslogada, a sessão não abre. Se ela bater o limite de uso, a sessão termina com esse motivo. O Flow Dev nunca troca de conta sozinho.
- **Por quê:** hoje cada provedor tem um único login na máquina. Quem tem várias assinaturas não consegue distribuir o trabalho entre elas.
- **Decisões principais:**
  - DEC-01: cada conta tem um diretório de configuração próprio do CLI (`CLAUDE_CONFIG_DIR`/`CODEX_HOME`), e o Flow Dev nunca lê as credenciais.
  - DEC-02: a escolha fica guardada por trabalho e provedor e é copiada para a sessão quando ela abre.
  - DEC-03: as contas cadastradas reaproveitam, por links, a configuração pessoal do login padrão.
  - DEC-04: o login atual da máquina continua sendo o "Login padrão", usado quando não há escolha.
- **Riscos principais:** o CLI num diretório novo (onboarding, links, retomada) e mensagens de limite que mudam entre versões, os dois provados no spike V-01 antes do resto; vazamento de credenciais, coberto por NFR-01 e V-04.
- **Como vamos verificar:** serviço e regras contra o Postgres de teste real; inspetor de login contra o CLI real num diretório vazio; worker com runtime falso que registra o ambiente recebido; componentes com RTL; e2e da página de contas; smoke manual com duas contas reais do Claude (V-13).
- **Pendências:** nenhuma (Q-01 e Q-02 respondidas em 2026-11-24).

---

# Parte 1 — Produto

## 1. Contexto e problema

As sessões de IA do trabalho atribuído (a sessão da rota aprovada, "Gerar tarefas" e as sessões do plano de execução) e os agentes Issue Author e Planejamento rodam com a assinatura logada no Claude Code ou no Codex desta máquina. Existe um único login por provedor. A pessoa já escolhe o agente, o modelo e o esforço de cada sessão (Specs D e E), mas não a conta.

Quem tem mais de uma assinatura (por exemplo, duas do Claude e três do Codex) quer dividir os trabalhos entre elas, para não esgotar o limite de uma só. Hoje isso exige sair do Flow Dev, deslogar e logar de novo no CLI, e afeta tudo o que estiver rodando.

O pedido falava em "duas assinaturas, uma por feature". Na revisão, o usuário ampliou: o número de contas por provedor não pode ser limitado.

## 2. Usuários e papéis

- **Pessoa com acesso ao Flow Dev:** cadastra, verifica, renomeia e remove as próprias contas. As contas são pessoais, como o vínculo do clone local.
- **Pessoa operadora do trabalho:** escolhe a conta de cada provedor usada no trabalho, entre as próprias contas e o login padrão.
- **Membro que só lê o trabalho:** vê o histórico das sessões. Não vê as contas de outras pessoas nem pode escolhê-las. No histórico, vê só "Conta pessoal da pessoa operadora" ou "Login padrão" (Q-02).
- **Administrador:** não ganha nenhum poder sobre as contas de outras pessoas.

## 3. Objetivos

- **G1:** ter quantas contas de assinatura quiser por provedor nesta máquina, cada uma logada e identificável pelo nome.
- **G2:** decidir, por trabalho, em qual conta de cada provedor as sessões rodam.
- **G3:** saber, antes e durante a sessão, qual conta está em uso e por que ela falhou, sem que outra assinatura seja gasta sem aviso.

## 4. Fora de escopo

- **Escolher a conta do Issue Author e do Planejamento:** o usuário restringiu a escolha às sessões do trabalho. Essas etapas continuam no login padrão.
- **Conta por sessão ou por projeto:** o pedido é "uma por feature", e a feature é o trabalho.
- **Trocar de conta automaticamente ao bater o limite ou ao deslogar:** decisão do usuário (bloquear e avisar).
- **Login por chave de API:** o pedido é por assinatura.
- **Login conduzido pela tela (OAuth no navegador do Flow Dev):** os CLIs não oferecem isso de forma estável. O login continua no CLI.
- **Mover uma sessão aberta para outra conta:** o histórico da sessão fica no diretório da conta em que ela nasceu (DEC-01).
- **Mostrar o uso ou o limite restante de cada conta:** não foi pedido (ver Sugestões).

## 5. Histórias de usuário

### US-01 — Cadastrar e logar contas de assinatura (P1)
Como pessoa que usa o Flow Dev, quero cadastrar várias contas do Claude Code e do Codex e logar cada uma, para ter todas as minhas assinaturas disponíveis.
- **Por que P1:** sem contas cadastradas não há o que escolher.
- **Teste independente:** cadastrar e verificar contas só pela página "Contas de IA", sem abrir nenhum trabalho.
- **Cenários de aceite:**
  1. **Dado** que Ana não tem contas, **quando** ela cadastra "Pessoal" no Claude Code, **então** a conta aparece como "Aguardando login" com o comando `CLAUDE_CONFIG_DIR='…' claude auth login` para copiar.
  2. **Dado** que Ana rodou o comando e fez login, **quando** ela clica em "Verificar login", **então** a conta passa a "Logada" e mostra o e-mail e o plano informados pelo CLI.
  3. **Dado** que Ana tem "Pessoal" e "Trabalho" no Claude e "Codex A", "Codex B" e "Codex C" no Codex, **quando** ela cadastra mais uma conta do Claude, **então** o cadastro é aceito (sem limite de quantidade).
  4. **Dado** que Ana já tem "Pessoal" no Claude, **quando** ela tenta cadastrar "pessoal" no Claude, **então** o Flow Dev recusa com "Você já tem uma conta do Claude Code com esse nome".

### US-02 — Escolher as contas do trabalho (P1)
Como pessoa operadora, quero escolher a conta do Claude e a do Codex do trabalho, para que todas as sessões dele usem a assinatura que eu quero.
- **Por que P1:** é o pedido central da Issue.
- **Teste independente:** escolher as contas num trabalho, abrir uma sessão e conferir no histórico qual conta ela usou.
- **Cenários de aceite:**
  1. **Dado** que Ana opera o trabalho #42 e escolheu "Trabalho" no Claude, **quando** ela abre "Gerar tarefas" com o Claude Code, **então** a sessão roda na conta "Trabalho" e o diálogo de abertura mostra "Conta: Trabalho".
  2. **Dado** o mesmo trabalho, com "Codex B" escolhida no Codex, **quando** Ana inicia uma sessão do plano com o agente Codex, **então** essa sessão roda na conta "Codex B".
  3. **Dado** um trabalho sem escolha de conta, **quando** Ana abre uma sessão do Claude, **então** ela roda no "Login padrão desta máquina", como hoje.
  4. **Dado** que Bruno lê o trabalho de Ana, **quando** ele abre a tela, **então** não vê nem pode alterar as contas escolhidas.

### US-03 — Ser bloqueado e avisado quando a conta falha (P1)
Como pessoa operadora, quero que a sessão pare com uma mensagem clara quando a conta escolhida estiver deslogada ou sem limite, para não gastar outra assinatura sem querer.
- **Por que P1:** uma falha silenciosa ou uma troca escondida anula o controle que a feature promete.
- **Teste independente:** deslogar uma conta, tentar abrir uma sessão nela e ler a mensagem.
- **Cenários de aceite:**
  1. **Dado** que a conta "Trabalho" foi deslogada no CLI, **quando** Ana abre uma sessão do Claude no trabalho, **então** a sessão falha na abertura com "A conta Trabalho (Claude Code) não está logada. Rode `CLAUDE_CONFIG_DIR='…' claude auth login`." e nenhuma outra conta é usada.
  2. **Dado** uma sessão rodando em "Codex B", **quando** o Codex recusa por limite de uso, **então** a sessão termina com o motivo "Limite de uso da conta Codex B atingido" e nenhuma sessão é aberta em outra conta.
  3. **Dado** o cenário 2, **quando** Ana troca a conta do Codex do trabalho para "Codex C" e inicia de novo a sessão do plano, **então** a nova sessão roda em "Codex C".

### US-04 — Trocar a conta sem quebrar sessões em andamento (P2)
Como pessoa operadora, quero trocar a conta do trabalho a qualquer momento, para mudar de assinatura sem perder as sessões já abertas.
- **Teste independente:** abrir uma sessão na conta A, trocar para B, retomar a primeira e abrir uma segunda.
- **Cenários de aceite:**
  1. **Dado** uma sessão interrompida aberta em "Pessoal", **quando** Ana troca o Claude do trabalho para "Trabalho" e retoma essa sessão, **então** ela é retomada em "Pessoal".
  2. **Dado** o cenário 1, **quando** Ana abre uma sessão nova do Claude, **então** ela roda em "Trabalho".

### US-05 — Renomear e remover contas (P2)
Como dona de uma conta, quero renomeá-la e removê-la, para manter a lista organizada e tirar da máquina as credenciais que não uso mais.
- **Teste independente:** renomear e remover uma conta sem sessões.
- **Cenários de aceite:**
  1. **Dado** a conta "Codex A" sem sessões em andamento, **quando** Ana a remove, **então** ela some da lista, o login daquela conta é encerrado e as sessões antigas que a usaram mostram "Codex A (removida)".
  2. **Dado** uma sessão interrompida em "Codex B", **quando** Ana tenta remover "Codex B", **então** o Flow Dev recusa com "Esta conta tem 1 sessão não encerrada. Encerre-a antes de remover a conta."
  3. **Dado** que o trabalho #42 escolheu "Codex A" e ela foi removida, **quando** Ana abre uma sessão do Codex nele, **então** a abertura é recusada pedindo que ela escolha outra conta.

## 6. Requisitos funcionais

**Cadastro e login (US-01, US-05)**
- **REQ-001** (US-01): QUANDO a pessoa cadastrar uma conta informando o provedor (Claude Code ou Codex) e um nome, o sistema DEVE criá-la como conta pessoal dela nesta máquina, no estado "Aguardando login".
- **REQ-002** (US-01): QUANDO uma conta for cadastrada ou estiver "Aguardando login" ou "Deslogada", o sistema DEVE mostrar à dona o comando de login daquela conta, pronto para copiar.
- **REQ-003** (US-01): O sistema DEVE aceitar qualquer quantidade de contas por pessoa e por provedor.
- **REQ-004** (US-01): SE o nome estiver vazio depois de remover os espaços das pontas, tiver mais de 40 caracteres ou repetir, sem diferenciar maiúsculas, o nome de outra conta não removida da mesma pessoa no mesmo provedor, ENTÃO o sistema DEVE recusar o cadastro ou a renomeação com uma mensagem que diga qual regra falhou.
- **REQ-005** (US-01): QUANDO a dona pedir "Verificar login", o sistema DEVE consultar o CLI do provedor com o diretório daquela conta e gravar o estado (Logada, Deslogada ou Falha na verificação) e a hora da verificação.
- **REQ-006** (US-01): ONDE o provedor for Claude Code, QUANDO a verificação encontrar a conta logada, o sistema DEVE mostrar à dona o e-mail e o plano informados pelo CLI.
- **REQ-007** (US-01): QUANDO a dona abrir a página "Contas de IA", o sistema DEVE exibir de imediato o último estado conhecido de cada conta e reverificar todas em segundo plano.
- **REQ-008** (US-05): QUANDO a dona renomear uma conta, o sistema DEVE mostrar o nome novo em todos os lugares, inclusive no histórico das sessões que já a usaram.
- **REQ-009** (US-05): QUANDO a dona remover uma conta, o sistema DEVE encerrar o login no CLI daquela conta, apagar o diretório dela desta máquina e manter o nome no histórico das sessões, com o sufixo "(removida)".
- **REQ-010** (US-05): SE houver sessão não encerrada usando a conta, ENTÃO o sistema DEVE recusar a remoção informando quantas são.
- **REQ-011** (US-01, US-02): O sistema DEVE permitir que só a dona liste, verifique, renomeie, remova e escolha a conta. Para qualquer outra pessoa, a conta se comporta como inexistente.

**Escolha no trabalho (US-02, US-04)**
- **REQ-012** (US-02): ENQUANTO a pessoa for a operadora do trabalho, o sistema DEVE permitir que ela escolha, para cada provedor, uma das próprias contas não removidas ou o "Login padrão desta máquina".
- **REQ-013** (US-02): ENQUANTO um trabalho não tiver escolha para um provedor, o sistema DEVE abrir as sessões desse provedor no login padrão.
- **REQ-014** (US-02): QUANDO uma sessão do trabalho for aberta (rota, Gerar tarefas ou item do plano), o sistema DEVE registrar nela a conta escolhida no trabalho para o agente da sessão e executar o agente com as credenciais dessa conta.
- **REQ-015** (US-02): O sistema DEVE mostrar a conta que será usada no diálogo de abertura da sessão e no cartão de cada sessão do plano, com um atalho para trocá-la na tela do trabalho.
- **REQ-016** (US-04): QUANDO a pessoa operadora trocar a conta de um provedor, o sistema DEVE aplicar a troca só às sessões abertas depois dela.
- **REQ-017** (US-04): QUANDO uma sessão for retomada, o sistema DEVE executá-la na conta registrada nela, seja qual for a escolha atual do trabalho.
- **REQ-018** (US-02): O sistema DEVE mostrar, no histórico de cada sessão, a conta em que ela rodou: o nome da conta para a dona, "Conta pessoal da pessoa operadora" para as demais pessoas e "Login padrão" para todas quando não houve conta (Q-02).
- **REQ-019** (US-02): SE a conta escolhida pertencer a outra pessoa que não a que está abrindo a sessão (a pessoa operadora mudou), ENTÃO o sistema DEVE recusar a abertura com "A conta escolhida para o Claude Code/Codex neste trabalho não é sua. Escolha uma conta sua ou o login padrão."
- **REQ-020** (US-05): SE a conta escolhida tiver sido removida, ENTÃO o sistema DEVE recusar a abertura com "A conta <nome> foi removida. Escolha outra conta para o <provedor>."
- **REQ-021** (US-02): QUANDO a pessoa operadora escolher o agente Codex na abertura ou no plano, o sistema DEVE oferecer a disponibilidade e os modelos do Codex da conta escolhida no trabalho.

**Falhas (US-03)**
- **REQ-022** (US-03): SE, ao abrir ou retomar uma sessão, a conta registrada nela estiver deslogada, ENTÃO o sistema DEVE marcar a sessão como falha de abertura sem iniciar o agente, com o nome da conta, o provedor e o comando de login.
- **REQ-023** (US-03): SE a verificação do login antes da abertura não terminar em 10 s, ENTÃO o sistema DEVE marcar a falha de abertura com "Não foi possível verificar o login da conta <nome>. Tente de novo."
- **REQ-024** (US-03): SE o provedor recusar a sessão por limite de uso, ENTÃO o sistema DEVE registrar como motivo de término "Limite de uso da conta <nome> atingido".
- **REQ-025** (US-03): O sistema NUNCA DEVE abrir, retomar ou repetir uma sessão numa conta diferente da registrada nela.

**Configuração pessoal (US-02)**
- **REQ-026** (US-02): QUANDO uma sessão rodar numa conta cadastrada, o sistema DEVE carregar as mesmas instruções globais, regras, skills, configurações e plugins pessoais do agente que o login padrão carrega. (Q-01: sim, via DEC-03)

## 7. Regras de negócio

- **Invariantes:**
  - Uma conta pertence a exatamente uma pessoa, um provedor e uma máquina.
  - Um trabalho tem no máximo uma escolha por provedor.
  - Uma sessão registra no máximo uma conta. Sem conta registrada, ela usou o login padrão.
  - A conta de uma sessão é sempre do mesmo provedor que o agente dela.
- **Estados da conta:**

  | Estado | Quando |
  |---|---|
  | Aguardando login | Recém-cadastrada; nenhuma verificação encontrou login ainda |
  | Logada | A última verificação encontrou login de assinatura |
  | Deslogada | A última verificação não encontrou login, depois de já ter estado logada |
  | Falha na verificação | O CLI não foi encontrado, deu erro ou passou de 10 s |
  | Removida | A dona removeu a conta; é um estado final, e o nome só aparece no histórico |

  As transições entre os quatro primeiros estados só acontecem por verificação (REQ-005, REQ-007, REQ-022). "Removida" só por REQ-009.
- **Permissões:**

  | Ação | Dona da conta | Pessoa operadora (não dona) | Quem só lê o trabalho | Admin |
  |---|---|---|---|---|
  | Cadastrar, verificar, renomear, remover | sim | — | — | não |
  | Escolher a conta num trabalho | só nos trabalhos que opera | — | não | não |
  | Escolher o login padrão | sim | sim | não | não |
  | Ver o nome da conta numa sessão | sim | não (vê "Conta pessoal") | não (vê "Conta pessoal") | não |

- **Login padrão:** é o login que a máquina usa hoje (P-02). Ele vale para todas as pessoas, não pode ser removido pelo Flow Dev e não aparece na página "Contas de IA" como conta cadastrada. Aparece só como opção na escolha.
- **Valores:** nome de 1 a 40 caracteres; verificação com tempo limite de 10 s; nenhum limite de quantidade de contas.

## 8. Casos de borda e erros

| ID | Situação | Comportamento esperado | Ref. |
|---|---|---|---|
| B-01 | A pessoa não tem contas cadastradas | O seletor do trabalho mostra só "Login padrão desta máquina" e um link "Cadastrar contas" | REQ-012 |
| B-02 | Duas sessões do mesmo trabalho rodam ao mesmo tempo, uma em cada conta (antes e depois da troca) | Ambas seguem, cada uma na sua conta | REQ-016 |
| B-03 | Duas abas trocam a conta do trabalho ao mesmo tempo | Vale a primeira gravação; a outra recebe "A escolha mudou; recarregue" (versão) | REQ-012 |
| B-04 | O CLI do provedor não está instalado | Verificação em "Falha na verificação" com "O <provedor> não foi encontrado nesta máquina"; a sessão falha na abertura como hoje | REQ-005 |
| B-05 | A mesma assinatura foi logada em duas contas cadastradas | Aceito; cada conta funciona de forma independente (ver Sugestões) | REQ-003 |
| B-06 | O diretório da conta foi apagado fora do Flow Dev | Verificação em "Deslogada"; o Flow Dev recria o diretório vazio na próxima verificação, e a pessoa loga de novo | REQ-005 |
| B-07 | A remoção apaga o diretório, mas o logout no CLI falha | A conta é removida mesmo assim e o log registra a falha do logout | REQ-009 |
| B-08 | Um item do plano salvo antes da troca é iniciado depois dela | Usa a conta atual do trabalho (a conta não fica no plano) | REQ-016 |
| B-09 | A sessão bate o limite no meio de uma resposta | O texto já recebido continua no histórico, e o motivo segue REQ-024 | REQ-024 |

## 9. Comportamento que não muda

- QUANDO o Issue Author ou o Planejamento rodar, o sistema DEVE CONTINUAR A usar o login padrão e a configuração de agente do projeto.
- QUANDO um trabalho não tiver conta escolhida, o sistema DEVE CONTINUAR A abrir as sessões no login padrão, com o mesmo ambiente de hoje (`HOME`, `CLAUDE_CONFIG_DIR` e `CODEX_HOME` do servidor).
- QUANDO uma sessão aberta antes desta feature for retomada, o sistema DEVE CONTINUAR A retomá-la no login padrão.
- O sistema DEVE CONTINUAR A permitir a escolha de agente, modelo e esforço por sessão e por item do plano, com os mesmos valores iniciais.
- O sistema DEVE CONTINUAR A exigir as mesmas condições de disponibilidade do Codex (CLI instalado, versão aceita e serviço de sessões rodando).
- QUANDO a sessão terminar por limite de uso, o sistema DEVE CONTINUAR A aplicar ao estado da sessão a mesma transição de hoje para falha do agente. Só o motivo exibido muda.

## 10. Requisitos não funcionais

- **NFR-01** (segurança): as credenciais de cada conta ficam só no diretório dela, com permissão `0700` no diretório, fora de qualquer checkout e da pasta de sessões. O Flow Dev nunca lê, copia, grava no banco, registra em log ou devolve pela API o conteúdo das credenciais. O caminho do diretório só é mostrado à dona.
- **NFR-02** (autorização): a dona da conta e a operação do trabalho são conferidas no serviço, perto dos dados, e de novo no worker antes de iniciar o agente. Esconder a conta na interface não basta.
- **NFR-03** (desempenho): a página "Contas de IA" mostra o último estado conhecido em até 1 s com 20 contas. A reverificação roda no máximo 4 consultas ao CLI ao mesmo tempo. A checagem antes da abertura acrescenta no máximo 10 s (REQ-023).
- **NFR-04** (observabilidade): os logs de abertura, falha e término de sessão incluem o id da conta (ou `default`), nunca o e-mail.
- **NFR-05** (acessibilidade): os seletores de conta têm rótulo visível, funcionam pelo teclado, e o estado da conta não é indicado só por cor.

## 11. Premissas e dependências

- **P-01:** "feature" é o trabalho atribuído (confirmado pelo usuário).
- **P-02:** o login padrão é o que o servidor e o worker já usam hoje: `~/.claude`, ou `CLAUDE_CONFIG_DIR` se estiver definido, e `~/.codex`, ou `CODEX_HOME`.
- **P-03:** a interface e o worker rodam na mesma máquina (mesmo `hostId`). Uma conta só aparece na máquina onde foi cadastrada.
- **P-04:** só o runtime `flow_dev` abre sessões novas. O valor `terminal` é legado e não recebe contas.
- **P-05:** segundo a documentação, desde 15/06/2026 o uso do Agent SDK numa assinatura consome um crédito mensal próprio de cada conta, separado do uso interativo. Distribuir trabalhos entre contas distribui esse crédito.
- **P-06:** o `SPEC_CODEX_HOME` citado na Issue não existe mais no código. Ele saiu junto com o Compozy (commit `a7f359e`), e esta spec não depende dele.
- **Dependências:** Specs C, D e E implementadas (serviço de sessões, plano de execução, sessão do Codex).

---

# Parte 2 — Técnica

## 12. Visão geral da solução

Uma conta é uma linha no banco (dona, provedor, máquina, nome, estado) mais um diretório privado em `$XDG_STATE_HOME/flow-dev/agent-accounts/<id>/` (padrão `~/.local/state/…`, mesma raiz de `terminalStateRoot.ts`). Esse diretório é a configuração do CLI daquela conta: vira o `CLAUDE_CONFIG_DIR` do Claude Code e o `CODEX_HOME` do Codex. O login é feito pela pessoa no terminal, com o comando que a tela mostra. O Flow Dev só pergunta ao CLI se há login (`claude auth status --json`, `codex login status`).

O trabalho guarda a escolha por provedor. Ao abrir uma sessão, o serviço copia a conta para a linha da sessão. O worker resolve o diretório, confere o login e passa o diretório ao runtime (Agent SDK ou app-server do Codex) como variável de ambiente. A retomada usa sempre a conta copiada na sessão.


## 13. Componentes e responsabilidades

| Componente | Responsabilidade | Local | Novo/Alterado |
|---|---|---|---|
| `AgentAccountService` | Cadastrar, renomear, remover, verificar (REQ-001–011) | `packages/api/src/application/services/agent-accounts/` | Novo |
| Portas `AgentAccountDao`, `AgentLoginInspector`, `AgentAccountHome` | Persistência, consulta ao CLI e diretório da conta | `packages/api/src/application/agent-accounts/` | Novo |
| `DrizzleAgentAccountDao` | Tabelas `agent_accounts` e `task_agent_accounts` | `packages/api/src/infra/database/dao/agent-accounts/` | Novo |
| `CliAgentLoginInspector` | `claude auth status --json` e `codex login status` com o diretório da conta, tempo limite de 10 s | `packages/api/src/infra/agents/` | Novo |
| `FileAgentAccountHome` | Cria o diretório `0700`, mantém os links de DEC-03, roda o logout e apaga | `packages/api/src/infra/agents/` | Novo |
| `WorkAccountService` | Lê e grava a escolha do trabalho; resolve a conta na abertura (REQ-012–021) | `packages/api/src/application/services/agent-accounts/` | Novo |
| Abertura de sessão (`sessionPurpose` e o serviço que cria a sessão) | Copia a conta para a sessão; recusa REQ-019 e REQ-020 | `packages/api/src/application/services/terminal/` | Alterado |
| `SessionStarter` e retomada (`sessionResume`) | Checagem antes de iniciar (REQ-022, REQ-023); passa `credentialHome` ao runtime | `packages/api/src/application/services/terminal/` | Alterado |
| `AgentSdkSessionRuntime`, `CodexAppServerRuntime`/`CodexProcess` | Sobrescrevem `CLAUDE_CONFIG_DIR`/`CODEX_HOME` quando há `credentialHome` | `packages/api/src/infra/terminal/` | Alterado |
| Saída da sessão (`agentSdkExit`, `codexSessionExit`) | Classifica o limite de uso com `agentFailure.ts` e grava o motivo de REQ-024 | `packages/api/src/infra/terminal/` | Alterado |
| Catálogo do Codex (`CodexCatalogStep`/`LocalCodexCatalogProbe`) | Consulta também cada conta do Codex da máquina (REQ-021) | `packages/api/src/application/services/terminal/`, `infra/terminal/codex/` | Alterado |
| Router `agentAccounts` e procedures de escolha do trabalho | Fronteira tRPC | `packages/api/src/routers/` | Novo/Alterado |
| Página "Contas de IA" | Lista, cadastro, comando de login, verificação, renomear e remover; link no `ShellHeader.tsx` | `apps/web/src/app/settings/ai-accounts/page.tsx`, `apps/web/src/features/agent-accounts/` | Novo |
| Seção "Contas deste trabalho" | Dois seletores (Claude, Codex) para a pessoa operadora | `apps/web/src/features/issues/assigned-work/components/` | Novo |
| `LaunchChoiceSection`, `PlanSessionCard`, histórico da sessão | Mostram a conta (REQ-015, REQ-018) | idem | Alterado |

## 14. Modelo de dados

Migration `0052_agent_accounts` (com o `_rollback.sql`, como as anteriores):

- **`agent_accounts`**: `id uuid pk`; `owner_user_id uuid not null → users (restrict)`; `host_id text not null`; `provider text not null check in ('claude','codex')`; `label text not null check 1–40`; `status text not null default 'pending_login' check in ('pending_login','logged_in','logged_out','check_failed')`; `identity text null` (e-mail do Claude); `plan text null`; `codex_catalog jsonb null` (o mesmo formato de `CodexStatus`); `checked_at timestamptz null`; `removed_at timestamptz null`; `version int not null default 1`; `created_at`.
  - Índice único `(owner_user_id, host_id, provider, lower(label)) where removed_at is null` (REQ-004).
- **`task_agent_accounts`**: `task_id → tasks (cascade)`; `provider`; `account_id → agent_accounts (restrict)`; `chosen_by → users (set null)`; `version int`; `updated_at`; chave primária `(task_id, provider)`. Escolher o login padrão apaga a linha (DEC-04).
- **`task_terminal_sessions.agent_account_id uuid null → agent_accounts (restrict)`**: `null` é o login padrão.
- **Dados existentes:** nenhum preenchimento retroativo. As sessões e os trabalhos atuais ficam com `null` ou sem linha, o que é o login padrão (seção 9).
- A remoção é lógica (`removed_at`), para preservar o nome no histórico (REQ-009) e as chaves `restrict`.

## 15. Interfaces e contratos

```ts
type AgentAccountView = {
  id: string; provider: "claude" | "codex"; label: string;
  status: "pending_login" | "logged_in" | "logged_out" | "check_failed";
  identity: string | null; plan: string | null; checkedAt: string | null;
  loginCommand: string;
};
agentAccounts.list(): AgentAccountView[]
agentAccounts.create({ provider, label }): AgentAccountView        // BAD_REQUEST label_invalid | CONFLICT label_taken
agentAccounts.rename({ id, label, version }): AgentAccountView     // NOT_FOUND | CONFLICT label_taken | stale
agentAccounts.verify({ id }): AgentAccountView                     // NOT_FOUND
agentAccounts.remove({ id }): void                                 // NOT_FOUND | CONFLICT has_open_sessions(count)

type WorkAccountChoice = { provider: "claude" | "codex"; accountId: string | null; label: string; status: AgentAccountView["status"] | "default" };
tasks.workAccounts.get({ taskId }): { choices: WorkAccountChoice[]; options: Record<"claude"|"codex", AgentAccountView[]>; version: number }
tasks.workAccounts.set({ taskId, provider, accountId: string | null, version }): WorkAccountChoice  // FORBIDDEN not_operator | NOT_FOUND account | CONFLICT stale

interface AgentLoginInspector { inspect(input: { provider; home: string }): Promise<{ status; identity: string | null; plan: string | null }> }
interface AgentAccountHome { ensure(account): Promise<string>; logoutAndDelete(account): Promise<void> }
type RuntimeStartInput = /* atual */ & { credentialHome?: string }   // idem RuntimeResumeInput
```

- `NOT_FOUND` vale também para a conta de outra pessoa (REQ-011).
- Os erros de abertura (REQ-019, REQ-020) seguem o catálogo atual de erros de sessão (`terminalErrorCatalog.ts`).
- A saída de `session.get` ganha `account: { kind: "default" | "own" | "other"; label: string | null; removed: boolean }`. O `label` só vem quando a conta é de quem lê (Q-02).

## 16. Fluxos principais

1. **Cadastro e login:**
   1. `create` valida e grava a conta.
   2. `AgentAccountHome.ensure` cria o diretório com `0700` e os links de DEC-03.
   3. A tela mostra `loginCommand`, que é `CLAUDE_CONFIG_DIR='<dir>' claude auth login` ou `CODEX_HOME='<dir>' codex login`.
   4. A pessoa roda o comando no terminal e clica em "Verificar login".
   5. `verify` chama o inspetor e grava o estado, o e-mail e o plano.
2. **Abertura de sessão:**
   1. O serviço de abertura confere a pessoa operadora (já existe hoje).
   2. `WorkAccountService.resolve(taskId, agent, userId)` devolve a conta ou `null`. Recusa se a conta for de outra pessoa ou estiver removida (REQ-019, REQ-020).
   3. A sessão é gravada com `agent_account_id`.
   4. O worker reivindica a sessão. O `SessionStarter` carrega a conta e confere se ela pertence ao `host_id` e à dona da sessão (NFR-02).
   5. Com `ensure` e `inspect` (10 s), uma conta deslogada ou sem resposta gera `markLaunchFailed` com a mensagem de REQ-022 ou REQ-023.
   6. Com a conta logada, `runtime.start({ …, credentialHome })`.
3. **Retomada:**
   1. `sessionResume` usa o `agent_account_id` da sessão, e não a escolha atual do trabalho.
   2. Faz a mesma checagem de login.
   3. Chama `runtime.resume({ …, credentialHome })` (REQ-017, REQ-025).

## 17. Decisões técnicas

### DEC-01 — Uma conta é um diretório de configuração do CLI
- **Decisão:** cada conta usa o próprio `CLAUDE_CONFIG_DIR` ou `CODEX_HOME`, criado pelo Flow Dev. O login e o arquivo de credenciais pertencem ao CLI, e o Flow Dev nunca os lê.
- **Alternativas consideradas:**
  - **`CLAUDE_CODE_OAUTH_TOKEN`** (o token de um ano gerado por `claude setup-token`): o Flow Dev teria de guardar um segredo, criptografado, e o Codex não tem equivalente. A vantagem seria retomar uma sessão em outra conta, coisa que o usuário não pediu.
  - **Trocar os arquivos do login padrão antes de cada sessão:** quebra as sessões que rodam ao mesmo tempo.
  - **Chave de API:** o pedido é por assinatura.
- **Consequências:**
  - O histórico do agente fica no diretório da conta, e por isso a sessão é retomada só nela (REQ-017).
  - A própria documentação do Claude Code recomenda `CLAUDE_CONFIG_DIR` para várias contas.

### DEC-02 — Escolha por trabalho e provedor, copiada para a sessão
- **Decisão:** `task_agent_accounts (task_id, provider)`. A conta é copiada para `task_terminal_sessions` na abertura. O plano não guarda a conta.
- **Alternativas consideradas:** um campo de conta em cada sessão ou item do plano (contradiz "uma por feature"); fixar a conta depois da primeira sessão (rejeitado pelo usuário); uma conta só por trabalho, que fixaria o agente (rejeitado pelo usuário).
- **Consequências:** trocar a conta não afeta as sessões abertas. Um item do plano usa a conta vigente quando é iniciado (B-08).

### DEC-03 — A configuração pessoal é compartilhada por links (Q-01)
- **Decisão:** a cada `ensure`, o diretório da conta ganha links simbólicos para itens de uma lista fixa do diretório padrão, quando eles existem:
  - Claude: `settings.json`, os arquivos `*.md` da raiz, `rules/`, `skills/`, `agents/`, `commands/`, `hooks/`, `plugins/` e `output-styles/`.
  - Codex: `config.toml`, `AGENTS.md`, `prompts/`, `skills/` e `rules/`.

  As credenciais, o histórico, `projects/`, `sessions/` e o `.claude.json` nunca são linkados.
- **Alternativas consideradas:** um diretório totalmente isolado (as sessões perderiam hooks e regras globais, como o `CLAUDE.md` pessoal, e se comportariam diferente do login padrão); uma cópia (diverge com o tempo); uma lista de exclusão (frágil quando o CLI cria itens novos de estado).
- **Consequências:** uma mudança na configuração pessoal vale para todas as contas. Quando o CLI grava no `settings.json` linkado, a gravação afeta todas as contas, o que é o desejado. A lista precisa ser revista quando o CLI mudar de versão (V-01).

### DEC-04 — O login padrão é implícito
- **Decisão:** não existe linha para o login padrão. A ausência de escolha ou de conta é o padrão.
- **Alternativas consideradas:** migrar o login atual para uma conta cadastrada. Essa conta precisaria de dona, mas hoje ela serve a todas as pessoas, e a migração mudaria o comportamento.
- **Consequências:** nenhuma migração de dados. O worker mantém o ambiente atual quando `credentialHome` não vem.

### DEC-05 — As contas são pessoais e ficam na máquina onde foram cadastradas
- **Decisão:** a conta tem `owner_user_id` e `host_id`, no mesmo modelo de `project_local_checkouts` (pessoal). O worker recusa uma conta de outro `host_id`.
- **Alternativas consideradas:** contas compartilhadas na instância (rejeitado pelo usuário).
- **Consequências:** num segundo computador, a pessoa cadastra as contas de novo.

### DEC-06 — A verificação usa os comandos do CLI
- **Decisão:**
  - Claude: `claude auth status --json`, lendo `loggedIn`, `authMethod`, `email` e `subscriptionType`. Conta como logada só se `authMethod` for de assinatura (`claude.ai`).
  - Codex: `codex login status`, a mesma leitura de `codexCatalogTransport.ts`, mais o catálogo de modelos por conta, gravado em `agent_accounts.codex_catalog`.
- **Alternativas consideradas:** ler os arquivos de credencial (viola NFR-01); a RPC de conta do app-server do Codex (não existe no protocolo gerado do repositório).
- **Consequências:** o e-mail só existe para o Claude. Uma conta do Codex é identificada pelo nome.

### DEC-07 — Página pessoal nova
- **Decisão:** `/settings/ai-accounts`, com um link no cabeçalho do shell. Hoje não existe área de configurações pessoais, e as Configurações são do projeto.
- **Alternativas consideradas:** dentro das Configurações do projeto (a conta não é do projeto, e seria preciso repetir o cadastro em cada um).
- **Consequências:** uma rota nova entra no build e no e2e.

## 18. Segurança, privacidade e permissões

Autorização e sigilo em NFR-01 e NFR-02; uso da assinatura alheia barrado por REQ-011 e REQ-019. Ponto técnico extra: o diretório da conta é derivado do `id` no servidor, nunca recebido do cliente, e os comandos do CLI rodam com `shell: false` e o ambiente filtrado de `buildAgentEnvironment` (que ganha a sobrescrita de `CLAUDE_CONFIG_DIR`/`CODEX_HOME`).

## 19. Observabilidade

Logs `[accounts]` (`created`, `verified status=…`, `removed logout=ok|failed`) e o campo `account=<id>|default` nos logs de sessão (NFR-04).

## 20. Migração, rollout e reversão

- **Ordem:** a migration 0052 entra antes do código, e as colunas novas são todas opcionais.
- **Sem flag:** sem contas cadastradas, o comportamento é o de hoje.
- **Reversão:** o rollback da migration apaga as tabelas e a coluna, e as sessões voltam a rodar no login padrão. As sessões abertas numa conta cadastrada não podem mais ser retomadas, porque o histórico delas fica no diretório da conta. Os diretórios em `agent-accounts/` ficam na máquina e podem ser apagados à mão.

## 21. Riscos técnicos

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| O Claude Code num `CLAUDE_CONFIG_DIR` novo pede onboarding ou confiança e trava o Agent SDK | Média | Alto | Spike V-01; se acontecer, `ensure` pré-grava o mínimo necessário |
| Os links de DEC-03 não são seguidos (por exemplo, nos plugins) | Média | Médio | V-01 prova cada item da lista |
| Mensagens de limite mudam e o motivo cai em "falha genérica" | Média | Médio | Reaproveitar o `USAGE_LIMIT` de `agentFailure.ts`; capturar exemplos reais em V-01 |
| A consulta ao catálogo do Codex por conta multiplica os processos do app-server | Baixa | Médio | Consultar só as contas logadas, em sequência, no ciclo atual do catálogo |
| Remover uma conta durante a abertura de uma sessão | Baixa | Médio | Remoção e abertura conferem as sessões não encerradas na mesma transação |

---

# Parte 3 — Verificação

## 22. Estratégia de testes

Segue a skill `software-testing`, com uma ficha de risco por linha da matriz.

- **Ferramentas existentes:** Vitest (unitário e `test:integration`, com o Postgres descartável de `packages/api`), RTL em `apps/web`, Playwright em `apps/web/e2e`, runtimes roteirizados (`scriptedSessionRuntime`, `scriptedCodexAppServer`).
- **O que é real:**
  - O Postgres em todas as regras que dependem de constraint, transação ou permissão (unicidade do nome, `restrict`, remoção com sessões abertas).
  - O sistema de arquivos temporário para o diretório da conta.
  - Os CLIs reais, só no inspetor contra um diretório vazio (estado deslogado, sem custo).
- **Dublês:**
  - O `AgentLoginInspector` falso nos testes de serviço e do worker, porque logar de verdade é lento e gasta assinatura.
  - Um runtime falso que registra o `credentialHome` e o ambiente recebidos.
  - O inspetor real ganha uma checagem de contrato separada com saídas reais gravadas (V-03).
- **Controle:** relógio injetado (`now`), ids fixos e tempo limite curto injetado no teste do REQ-023.
- **Jornadas ponta a ponta:**
  1. Cadastrar uma conta e vê-la "Aguardando login" com o comando (página nova, e2e real).
  2. Escolher a conta no trabalho e abrir uma sessão roteirizada que mostra a conta. Depende da tela do trabalho, cujos e2e estão `fixme` por causa do GitHub (Spec D, tarefa 09). Até lá, a prova automática é um teste de jornada no `packages/api`.
- **Sem prova automática:** login e limite com contas reais. Ficam para o smoke manual V-13.

## 23. Matriz de verificação

| ID | Cobre | Falha que detecta | Fronteira real | Casos (resumo) |
|---|---|---|---|---|
| V-01 | DEC-01, DEC-03, REQ-024, riscos 1–3 | O CLI ignora o diretório, trava no onboarding, não segue os links ou a retomada perde o histórico | Claude e Codex reais, com duas contas logadas (spike manual, `v01-spike.md`) | Sessão do Agent SDK em cada conta; retomada na mesma conta; hook global carregado via link; captura da mensagem de limite |
| V-02 | US-01 (cen. 1–4), US-05 (cen. 1–2), REQ-001–005, 008–010, B-05, B-07 | Nome duplicado aceito; limite de quantidade escondido; remoção com sessão aberta; histórico perde o nome | `AgentAccountService` + Postgres real; inspetor e home falsos | Cadastra; 3 contas do Claude e 3 do Codex; duplicado sem diferenciar maiúsculas → CONFLICT; renomeia; remove → "(removida)"; recusa com 1 sessão; logout falha e a remoção conclui |
| V-03 | REQ-005, REQ-006, DEC-06, B-04 | Saída do CLI mal interpretada; login por API key tratado como assinatura | Claude e Codex reais num diretório vazio (deslogado); saídas JSON gravadas para logado e API key | Diretório vazio → Deslogada; `claude.ai` → Logada com e-mail e plano; `authMethod` de API key → Deslogada; CLI ausente → Falha |
| V-04 | NFR-01, DEC-03, B-06 | Diretório legível por outros; credencial linkada ou copiada; caminho vindo do cliente | `FileAgentAccountHome` com sistema de arquivos temporário | Permissão `0700`; links só da lista; `.credentials.json`/`auth.json` nunca linkados; recria o diretório apagado; logout + apagar |
| V-05 | US-02 (cen. 3–4), US-04, REQ-012, 013, 016, 019, 020, B-01, B-03, B-08 | Leitor altera a escolha; conta de outra pessoa aceita; troca altera sessão já aberta | `WorkAccountService` + Postgres real | Operadora escolhe; leitor → FORBIDDEN; conta alheia → NOT_FOUND; versão velha → CONFLICT; sem escolha → padrão; conta removida → recusa |
| V-06 | US-02 (cen. 1–2), REQ-014, 017, 025 | A sessão roda no login errado; a retomada usa a escolha atual; o agente Codex recebe a conta do Claude | Abertura + `SessionStarter` + retomada com Postgres real e runtime falso que registra o ambiente | Claude com conta → `CLAUDE_CONFIG_DIR` da conta; Codex → `CODEX_HOME`; sem conta → ambiente atual intacto; troca e retomada → conta original |
| V-07 | US-03 (cen. 1–3), REQ-022–024, B-09 | O agente inicia deslogado; o tempo limite trava a fila; o limite vira erro genérico; outra conta é usada | Worker com Postgres real, inspetor falso (deslogado, lento) e runtimes roteirizados emitindo erro de limite (Claude e Codex) | Deslogada → falha de abertura com comando; 10 s → mensagem de REQ-023; limite → motivo com o nome; nenhuma sessão nova criada |
| V-08 | REQ-021 | O catálogo da conta errada aparece no Codex | Publicador do catálogo + Postgres real; sonda falsa por conta | Conta B sem login → Codex indisponível com o motivo; conta C com modelos próprios |
| V-09 | REQ-011, NFR-02, DEC-05 | Outra pessoa lista, verifica ou remove a conta; o worker aceita uma conta de outro host | Caller tRPC com duas pessoas + Postgres real; worker com `hostId` diferente | Bruno lista → não vê; `verify`/`remove` → NOT_FOUND; sessão com conta de outro host → falha de abertura |
| V-10 | Seção 9, DEC-04, NFR-04 | O Issue Author ou o Planejamento passa a usar uma conta; sessões antigas mudam de ambiente; o e-mail aparece em log | Suítes atuais de `infra/agents` e de sessão + asserções novas | Ambiente do runner sem sobrescrita; sessão sem `agent_account_id` retoma igual; log com `account=default`, sem e-mail |
| V-11 | REQ-002, 007, 015, 018, NFR-05, B-01 | Comando de login ausente; estado só por cor; diálogo não mostra a conta | Componentes com RTL; tRPC falso | Página lista estados com texto; botão copiar; seletor com rótulo; `LaunchChoiceSection` e `PlanSessionCard` mostram "Conta: …"; sem contas → link "Cadastrar contas"; quem não é dono vê "Conta pessoal" |
| V-12 | US-01 cen. 1, US-02 cen. 1 (jornada) | As partes não se conectam na tela | Playwright, app real + banco de teste; inspetor falso via ambiente de teste | Cadastrar conta e ver o comando (ativo); escolher a conta e abrir uma sessão roteirizada (`fixme` enquanto a tela do trabalho depender do GitHub; substituto: teste de jornada em `packages/api`) |
| V-13 | US-02, US-03 com contas reais | Funciona no teste e falha com a assinatura real | Manual: duas contas reais do Claude e uma do Codex | Duas sessões em contas diferentes ao mesmo tempo; deslogar uma e tentar abrir; registrar em `v01-spike.md` |

## 24. Definição de pronto

- `pnpm --dir packages/api test` e `pnpm --dir packages/api test:integration` passam; `pnpm --dir apps/web test` passa.
- `pnpm typecheck` e `pnpm lint` passam (ler o código de saída com `rtk proxy pnpm lint`).
- `pnpm build` passa, porque há uma rota nova.
- O spec do Playwright da página de contas passa (`pnpm --dir apps/web test:e2e <spec>`).
- V-01 e V-13 registrados em `docs/specs/contas-de-assinatura-por-trabalho/v01-spike.md`.
- A migration 0052 foi aplicada num banco descartável na ordem do journal, e o rollback foi testado.
- Nenhum `[PRECISA ESCLARECER]` restante, e o `packages/api/docs/spec-codex-chatgpt.md` foi atualizado ou removido, conforme a Sugestão aceita.
- A spec foi atualizada com o que mudou na implementação, e o `PRODUCT.md` menciona as contas por trabalho.

---

## Questões em aberto

- **Q-01 (respondida em 2026-11-24):** as contas cadastradas carregam a configuração pessoal do login padrão? — **Resposta:** sim, por links de uma lista fixa (DEC-03, REQ-026).
- **Q-02 (respondida em 2026-11-24):** o que quem não é dono da conta vê no histórico? — **Resposta:** só "Conta pessoal da pessoa operadora" ou "Login padrão" (REQ-018).

## Sugestões fora do escopo

- **Abrir o comando de login num terminal pelo próprio Flow Dev** (como a Spec A fazia com o GNOME Terminal), em vez de copiar e colar. Poupa um passo no cadastro.
- **Avisar quando o mesmo e-mail do Claude já está em outra conta da pessoa** (B-05). Evita duplicar a assinatura sem perceber.
- **Mostrar o uso ou o limite restante de cada conta** no seletor do trabalho, para escolher com informação.
- **Estender a escolha ao Issue Author e ao Planejamento** se o consumo dessas etapas pesar.
- **Limpeza de legado:** apagar `packages/api/docs/spec-codex-chatgpt.md` (fala de `SPEC_CODEX_HOME` e do Compozy, que não existem mais) e a tabela `software_connections`, que nenhum código usa.

## Histórico

- 2026-11-24 — Criação da spec a partir da Issue #6. Decisões do usuário: qualquer quantidade de contas por provedor; feature = trabalho atribuído; só as sessões do trabalho; cadastro pela tela com login pelo CLI; uma conta por provedor no trabalho; a troca vale para as próximas sessões; bloquear e avisar sem trocar sozinho; contas pessoais.
- 2026-11-24 — Q-01 (configuração pessoal compartilhada por links) e Q-02 (só a dona vê o nome da conta) respondidas pelo usuário. A spec segue Em revisão.
