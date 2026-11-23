# Spec E: A sessão do Codex dentro do Flow Dev

> **Status:** Rascunho · **Data:** 2026-11-23 · **Nível:** L4 ancorada (vai para spec-to-tasks) · **Depende de:** [Spec C](../sessao-no-flow-dev/spec.md) (serviço de sessões, conversa, pedidos) e [Spec D](../tarefas-e-plano-de-execucao/spec.md) (escolha de agente: REQ-109, REQ-110, DEC-28). Os IDs continuam a numeração das Specs A–D e nunca se repetem.
> **Contexto lido:** Specs B, C e D; `packages/api/src/application/terminal/claudeSessionRuntime.ts` (porta do runtime), `packages/api/src/application/services/terminal/hookEventSummarizer.ts`, `packages/api/src/infra/terminal/fileSessionContextBuilder.ts`, `packages/api/src/infra/agents/codexArguments.ts` (Codex isolado dos agentes de planejamento); o Codex CLI 0.159.3 instalado: `codex --help`, `codex features list`, e o protocolo gerado por `codex app-server generate-json-schema` (`thread/start`, `thread/resume`, `turn/start`, `turn/interrupt`, `skills/extraRoots/set`, `model/list`, `item/commandExecution/requestApproval`, `item/fileChange/requestApproval`, `item/tool/requestUserInput`, itens `agentMessage`, `commandExecution`, `fileChange`; `UserInput` do tipo `skill`).

## Resumo para revisão

- **O que muda:**
  - O Codex passa a conduzir sessões dentro do Flow Dev como o Claude conduz na Spec C: conversa, perguntas com opções, aprovações, interromper, encerrar e retomar.
  - Ele serve a todas as etapas:
    - à rota aprovada (a spec-writer na etapa de spec, a direct-executor na Execução direta);
    - a "Gerar tarefas";
    - às sessões do plano da Spec D.
  - O diálogo das sessões de rota também ganha a escolha de agente, modelo e esforço, que começa em Claude Code · Opus · Máximo.
- **Por quê:** a pessoa quer usar a assinatura do ChatGPT/Codex nas mesmas etapas, sem perder o controle pela tela.
- **Decisões principais:**
  - DEC-29: `codex app-server` por stdio, um processo por sessão.
  - DEC-30: o runtime do Codex se traduz para a porta e os formatos da Spec C, sem mudar o serviço, o broker nem a tela.
  - DEC-31: as skills do Flow Dev chegam ao Codex por `skills/extraRoots/set` e são acionadas pela entrada `skill`.
  - DEC-32: o catálogo do Codex é publicado pelo serviço, nunca consultado na requisição.
  - DEC-33: as perguntas usam a flag `default_mode_request_user_input`, com texto como plano B.
- **Riscos principais:**
  - O `app-server` e a ferramenta de perguntas são experimentais e podem mudar entre versões. Mitigação: o spike V-45 vem antes de tudo, há versão mínima conferida no `preflight`, e as perguntas caem para texto sem quebrar.
  - A tradução dos modos de permissão pode não bater com o Claude. O V-45 confirma cada modo.
- **Como vamos verificar:**
  - tradutores puros, de itens e pedidos;
  - o runtime contra um `app-server` falso por stdio;
  - o serviço com Postgres e roteiro;
  - um e2e com o agente Codex roteirizado;
  - smoke real (V-45, V-52).
- **Pendências:** nenhuma de produto. P-17 a P-20 dependem do V-45.

---

# Parte 1 — Produto

## 1. Contexto e problema

As Specs C e D colocaram o Claude Code dentro do Flow Dev e deixaram a pessoa escolher o agente de cada sessão. Só que o Codex aparece desabilitado com "O Codex ainda não conduz sessões no Flow Dev." (REQ-110 da Spec D). Hoje o Codex roda no projeto apenas como agente isolado, sem conversa e só para leitura, no Issue Author e no Planejamento. A pessoa tem a assinatura do Codex e quer usá-la na spec, na divisão e na execução, com o mesmo controle que tem sobre o Claude.

## 2. Usuários e papéis

Os mesmos da Spec C. Quem abriu a sessão, enquanto for a operadora, conversa e controla. Membros e administradores leem (REQ-080).

## 3. Objetivos

- **G12:** uma sessão do Codex é conduzida pela tela da tarefa com os mesmos controles e estados de uma sessão do Claude.
- **G13:** a pessoa escolhe Claude Code ou Codex, com modelo e esforço, em toda sessão: rota, geração de tarefas e plano.

## 4. Fora de escopo

- **Recursos próprios do Codex** que o Claude não tem na Spec C: modo plano, subagentes visíveis, busca na web, geração de imagem, `/review`, metas e memória. Não foram pedidos.
- **Mandar mensagem no meio da vez** (`turn/steer`): a mensagem fica "Na fila" como na Spec C (Sugestões).
- **Instalar o Codex ou fazer login pelo Flow Dev:** o `preflight` só informa.
- **Trocar de agente no meio de uma sessão:** a escolha vale do início ao fim (DEC-24 da Spec D).
- **Codex no Issue Author e no Planejamento:** já existe e não muda.

## 5. Histórias de usuário

### US-15 — Conversar com o Codex na tarefa (P1)
Como pessoa operadora, quero iniciar uma sessão do Codex e conversar com ele na tarefa, como faço com o Claude.
- **Por que P1:** sem isso, nada do Codex funciona.
- **Teste independente:** iniciar uma Tech Spec com o Codex, ver o texto dele e mandar a próxima mensagem.
- **Cenários de aceite:**
  1. **Dado** a Issue #42 com Tech Spec aprovada e o Codex logado na máquina, **quando** Ana troca o agente para "Codex", vê "gpt-6.1-sol · <maior esforço do modelo>" e confirma, **então** em até 10 s a etapa mostra "Em andamento", o prompt enviado e, em seguida, o texto do Codex.
  2. **Dado** que o Codex terminou a vez, **quando** Ana envia "Use o Button existente", **então** a resposta dele aparece embaixo, como na US-06.
  3. **Dado** o Codex sem login, **quando** Ana abre o diálogo, **então** a opção "Codex" aparece desabilitada com "Faça login no Codex: rode `codex login`." (REQ-110).
  4. **Dado** uma sessão do Codex em que a spec-writer grava `docs/specs/login/spec.md` e termina a vez, **então** surge o artefato "docs/specs/login/spec.md · spec-writer · versão 1", como na US-05.

### US-16 — Responder às perguntas do Codex (P1)
Como pessoa operadora, quero responder na tarefa às perguntas que o Codex faz, para a skill seguir sem eu ir ao terminal.
- **Por que P1:** a spec-writer pergunta várias vezes.
- **Teste independente:** numa Tech Spec com o Codex, responder às perguntas da spec-writer e ver o Codex seguir.
- **Cenários de aceite:**
  1. **Dado** a flag de perguntas funcionando (V-45), **quando** o Codex pergunta "Quem pode ver os comentários?" com "Só membros (Recomendado)" e "Qualquer pessoa", **então** a etapa mostra "Precisa de você", a pergunta, as opções com as descrições e "Outra".
  2. **Dado** essa pergunta, **quando** Ana escolhe "Outra" e escreve "Só o autor", **então** o Codex recebe esse texto e continua.
  3. **Dado** que a flag não funciona nesta versão do Codex, **quando** a spec-writer precisa perguntar, **então** as perguntas chegam como texto do Codex, a sessão vai para "Aguardando você", e Ana responde pelo campo de mensagem.

### US-17 — Aprovar o que o Codex quer fazer (P2)
Como pessoa operadora, quero escolher o modo de permissões e aprovar os comandos e as edições do Codex, como faço com o Claude.
- **Por que P2:** o padrão continua "Tudo liberado".
- **Teste independente:** em "Aceitar edições, perguntar comandos", aprovar `pnpm test` nesta sessão, aprovar sempre `pnpm lint` e recusar `rm -rf dist`.
- **Cenários de aceite:**
  1. **Dado** uma sessão do Codex em "Aceitar edições, perguntar comandos", **quando** ele quer rodar `pnpm test`, **então** a etapa mostra "Rodar comando: pnpm test", o motivo do Codex e os botões "Permitir", "Permitir nesta sessão", "Permitir sempre (todas as sessões do Codex nesta máquina)" e "Recusar".
  2. **Dado** esse pedido, **quando** Ana escolhe "Permitir nesta sessão", **então** os próximos `pnpm test` da mesma sessão rodam sem pedir, e uma sessão nova volta a pedir.
  3. **Dado** um pedido para `pnpm lint`, **quando** Ana escolhe "Permitir sempre", **então** a regra do Codex é gravada, e outra sessão do Codex, em qualquer projeto desta máquina, roda `pnpm lint` sem pedir.
  4. **Dado** uma sessão em "Perguntar tudo", **quando** o Codex quer alterar `src/app.ts`, **então** a etapa mostra "Alterar arquivos: src/app.ts" com o diff e os botões "Permitir", "Permitir nesta sessão" e "Recusar".

### US-18 — Interromper, encerrar e retomar o Codex (P2)
Como pessoa operadora, quero interromper, encerrar e retomar uma sessão do Codex como as do Claude.
- **Por que P2:** espelha as US-09 e US-10.
- **Teste independente:** interromper um comando longo, reiniciar o serviço e retomar com uma mensagem.
- **Cenários de aceite:**
  1. **Dado** o Codex rodando `pnpm build`, **quando** Ana aciona "Interromper", **então** em até 5 s a etapa mostra "Aguardando você", e a conversa registra "Interrompido por você".
  2. **Dado** uma sessão do Codex em "Precisa de você", **quando** o serviço reinicia, **então** ela fica "Interrompida", com a nota da US-10.1, e a pergunta aparece como "Cancelada".
  3. **Dado** essa sessão, **quando** Ana envia "Pode seguir", **então** o Codex continua a mesma conversa, lembrando o que já foi feito.

### US-19 — Escolher o agente na sessão de rota (P2)
Como pessoa operadora, quero escolher agente, modelo e esforço também ao abrir a sessão da rota aprovada, para fazer a spec ou a Execução direta com o Codex.
- **Por que P2:** a Spec D só dá a escolha na divisão e no plano.
- **Teste independente:** abrir a Tech Spec com "Codex" e ver a spec-writer rodar no Codex.
- **Cenários de aceite:**
  1. **Dado** o planejamento aprovado, **quando** Ana abre "Iniciar sessão", **então** o diálogo mostra "Agente: Claude Code · Modelo: Opus · Esforço: Máximo", editáveis.
  2. **Dado** esse diálogo, **quando** Ana troca o agente para "Codex", **então** o modelo passa ao modelo padrão do Codex e o esforço ao maior que esse modelo oferece, e o prompt aciona a spec-writer na forma do Codex (7.15).

## 6. Requisitos funcionais

**Abertura**
- **REQ-111** (US-15): QUANDO a pessoa confirmar uma sessão com o agente Codex, o sistema DEVE iniciá-la no Codex local, na pasta vinculada, com o prompt, os anexos, as skills do Flow Dev, o modelo, o esforço e o modo de permissões escolhidos, e a sessão DEVE seguir os estados da 7.2 da Spec C.
- **REQ-112** (US-15): O sistema DEVE considerar o Codex disponível para sessões só quando o binário estiver no PATH, na versão mínima da 7.13, e logado. Cada falta DEVE desabilitar a opção com a mensagem da 7.13 (REQ-110 da Spec D).
- **REQ-113** (US-15): SE o Codex não conseguir começar a sessão (modelo recusado, limite de uso, falha do processo), ENTÃO a sessão DEVE ir para "Falhou ao abrir" com o motivo informado pelo Codex (REQ-054).

**Conversa e eventos**
- **REQ-114** (US-15): O sistema DEVE mostrar na conversa o texto do Codex da conversa principal, com o comentário intermediário e a resposta final, cada mensagem completa. NÃO DEVE mostrar nem guardar o raciocínio, a saída dos comandos, os diffs aplicados sem pedido nem a atividade de subagentes (REQ-056).
- **REQ-115** (US-15): O sistema DEVE registrar os eventos da Spec B nas sessões do Codex, com os mesmos resumos e limites: início, prompt, arquivo criado, editado, removido ou movido (cada caminho), comando executado, skill acionada, aguardando você, encerrada.
- **REQ-116** (US-15): Uma skill DEVE ser considerada ativa na vez (REQ-041) quando o prompt ou a mensagem a acionar pela forma da 7.15, ou quando o Codex ler o `SKILL.md` de uma skill do Flow Dev, se o V-45 mostrar que essa leitura é observável. A captura de artefatos DEVE seguir as REQ-042 a REQ-048 e a REQ-103 da Spec D.

**Perguntas**
- **REQ-117** (US-16): QUANDO o Codex fizer perguntas pela ferramenta de perguntas, o sistema DEVE mostrá-las como as da Spec C (REQ-063 a REQ-067), cada uma de escolha única, com "Outra" quando o Codex permitir, e entregar ao Codex o rótulo escolhido ou o texto.
- **REQ-118** (US-16): SE uma pergunta do Codex for marcada como secreta, ENTÃO o campo DEVE esconder o que é digitado, e o sistema DEVE guardar só "(resposta oculta)" como resposta.
- **REQ-119** (US-16): SE a ferramenta de perguntas não estiver disponível na versão do Codex (DEC-33), ENTÃO a sessão DEVE seguir sem ela; as perguntas chegam como texto e são respondidas pelo campo de mensagem, sem erro na tela.

**Aprovações**
- **REQ-120** (US-17): O diálogo DEVE oferecer os três modos da 7.11 da Spec C também para o Codex, traduzidos pela 7.14, e a sessão DEVE seguir o modo do início ao fim.
- **REQ-121** (US-17): QUANDO o Codex pedir aprovação de um comando, o sistema DEVE mostrar o comando, o motivo e os botões "Permitir", "Permitir nesta sessão", "Recusar" (com motivo opcional, até 2.000 caracteres) e, quando o Codex propuser uma regra, "Permitir sempre (todas as sessões do Codex nesta máquina)", com a regra à vista.
- **REQ-122** (US-17): QUANDO o Codex pedir aprovação de alterações em arquivos, o sistema DEVE mostrar cada caminho com o tipo (criar, editar, remover, mover) e o diff, com os botões "Permitir", "Permitir nesta sessão" e "Recusar".
- **REQ-123** (US-17): QUANDO a pessoa escolher "Permitir sempre", o sistema DEVE gravar a regra proposta pelo Codex nas regras do Codex da máquina, sem alterar a regra; "Permitir nesta sessão" NÃO DEVE gravar nada fora da sessão.

**Controles e retomada**
- **REQ-124** (US-18): Interromper, encerrar, a fila de mensagens, a recuperação após reinício e a retomada (REQ-058 a REQ-060, REQ-073 a REQ-079) DEVEM valer para as sessões do Codex com as mesmas mensagens e os mesmos prazos.
- **REQ-125** (US-18): QUANDO a sessão do Codex for retomada, o sistema DEVE continuar a mesma conversa do Codex, com o mesmo modelo, o mesmo esforço e o mesmo modo de permissões.

**Escolha nas sessões de rota**
- **REQ-126** (US-19): O diálogo da rota aprovada DEVE oferecer agente, modelo e esforço (7.4 da Spec D), começando em Claude Code · Opus · Máximo, e a sessão DEVE rodar com a escolha confirmada. Substitui a seção 9 da Spec D, que mantinha a rota sem escolha.
- **REQ-127** (US-15, US-19): QUANDO a pessoa trocar o agente para Codex, o sistema DEVE sugerir o modelo que o Codex marca como padrão e o maior esforço que esse modelo oferece.

## 7. Regras de negócio

### 7.12 Catálogo do Codex
- Modelos e esforços vêm do próprio Codex instalado (`model/list`), sem os modelos ocultos. A lista mostra o nome de exibição; o valor guardado é o id do modelo.
- O esforço oferecido é o que o modelo informa como suportado. Isso substitui a linha "Codex" da 7.4 da Spec D, que citava o catálogo das Configurações.
- O catálogo é renovado quando o serviço sobe e a cada 10 min (DEC-32). Se uma escolha salva no plano não existir mais, "Iniciar" mostra "O modelo <id> não está mais disponível no Codex. Troque o modelo da sessão." (B-44).

### 7.13 Disponibilidade do Codex
| Situação | Mensagem na opção desabilitada |
|---|---|
| Serviço de sessões fora do ar | a da REQ-053 |
| `codex` fora do PATH | "Codex não encontrado. Instale o Codex CLI e tente de novo." |
| Versão menor que 0.159.3 (ou a mínima do V-45) | "Atualize o Codex para a versão <mínima> ou mais nova." |
| Sem login | "Faça login no Codex: rode `codex login`." |

### 7.14 Modos de permissões no Codex
| Modo (Spec C 7.11) | Política do Codex (a confirmar no V-45) | Esperado |
|---|---|---|
| Tudo liberado | aprovação `never`, sandbox `danger-full-access` | nada pede aprovação; as perguntas continuam (REQ-072) |
| Aceitar edições, perguntar comandos | aprovação `untrusted`, sandbox `workspace-write` | edições no clone seguem sozinhas; comandos fora da lista confiável do Codex pedem |
| Perguntar tudo | aprovação `untrusted`, sandbox `read-only` | edições e comandos fora da lista confiável pedem; leituras não |

Se o V-45 mostrar que uma linha não produz o "Esperado", a tradução muda nesta tabela, e o comportamento esperado continua o mesmo.

### 7.15 Acionar uma skill no Codex
O prompt de rota, o de "Gerar tarefas" e o do plano acionam a skill com uma entrada `skill`, com o nome e o caminho da skill no contexto da sessão. O texto da instrução é o mesmo do Claude, sem o `/flow-dev:…`. Na conversa, o prompt aparece como no Claude, com a skill entre colchetes: `[spec-writer] Escreva a spec da Issue abaixo…`. Uma mensagem da pessoa que comece com `$<nome-da-skill>` de uma skill do Flow Dev também a aciona.

### 7.16 O que o pedido de aprovação mostra no Codex (complementa a 7.10 da Spec C)
| Pedido | Mostra |
|---|---|
| Comando | "Rodar comando:", o comando inteiro, o motivo do Codex e, se houver, a regra proposta |
| Alteração de arquivos | "Alterar arquivos:", cada caminho com o tipo e o diff, até 20.000 caracteres no total, com o corte da 7.5 |
| Permissões extras (rede, pastas fora do clone) | "Pedir permissão:", o que o Codex pede e o motivo; só "Permitir" e "Recusar" |

## 8. Casos de borda e erros

| ID | Situação | Comportamento esperado | Ref. |
|---|---|---|---|
| B-43 | O Codex pede para escrever fora do clone (`grantRoot`) | É um pedido de "Alterar arquivos" com o caminho de fora à vista; sem "Permitir nesta sessão" | 7.16 |
| B-44 | O modelo escolhido sumiu do catálogo, ou o limite de uso da assinatura acabou | "Falhou ao abrir" com o motivo; no plano, a sessão continua editável | REQ-113, 7.12 |
| B-45 | A pessoa usa o Codex na mesma máquina, no terminal, ao mesmo tempo | As duas sessões são independentes; o Flow Dev só controla a dele | DEC-29 |
| B-46 | O Codex abre um subagente | O texto e os eventos do subagente não aparecem; os pedidos dele, se chegarem, aparecem como os da conversa principal | REQ-114, B-24 |
| B-47 | O Codex pergunta pela ferramenta em "Tudo liberado" | A pergunta aparece normalmente | REQ-117 |
| B-48 | O clone tem uma skill do projeto com o mesmo nome de uma do Flow Dev | A sessão aciona a do Flow Dev, pelo caminho da entrada `skill` | 7.15 |
| B-49 | O `app-server` morre no meio da vez | A sessão vai a "Interrompida" e segue a REQ-076 | REQ-124 |

## 9. Comportamento que não muda

- As sessões do Claude DEVEM CONTINUAR exatamente como na Spec C, salvo o valor inicial do diálogo da rota (REQ-126).
- O Codex do Issue Author e do Planejamento DEVE CONTINUAR isolado, com `--ignore-user-config` e só leitura.
- Na sessão, o Codex DEVE CONTINUAR A usar o login, o `config.toml`, as regras e as skills pessoais da pessoa, como o Claude usa os dele (DEC-05 da Spec A).
- Fora o "Permitir sempre" (REQ-123), o sistema DEVE CONTINUAR A não escrever no clone, no `~/.codex` nem no GitHub.
- Conversa, pedidos, eventos, artefatos e permissões de leitura DEVEM CONTINUAR nas tabelas e telas das Specs B e C, sem caminho próprio para o Codex.

## 10. Requisitos não funcionais

- **NFR-18** (desempenho): uma mensagem ou resposta chega ao Codex em até 2 s no p95 local, e o texto e os pedidos dele aparecem na tela em até 3 s, como a NFR-10. O `preflight` não abre o Codex: lê a disponibilidade e o catálogo publicados (DEC-32) em até 200 ms.
- **NFR-19** (segurança): o serviço executa só o `codex` do PATH, com argumentos fixos e sem shell. Fala com ele só por stdio, sem porta de rede e sem o daemon compartilhado. Ele mata o grupo do processo ao encerrar (NFR-12).
- **NFR-20** (privacidade): diffs mostrados em pedidos ficam no banco como o conteúdo dos pedidos do Claude (NFR-13); respostas secretas não são guardadas (REQ-118).
- **NFR-21** (compatibilidade): a versão do Codex usada fica registrada na sessão e no log, e uma versão abaixo da mínima nunca inicia sessão.

## 11. Premissas e dependências

- **P-17:** com `-c features.default_mode_request_user_input=true`, o Codex 0.159.3 oferece a ferramenta de perguntas fora do modo plano e a envia por `item/tool/requestUserInput`. A confirmar no V-45; se falhar, vale a REQ-119.
- **P-18:** um `thread/resume` com o id da conversa funciona depois de o processo do `app-server` morrer, inclusive no meio de um comando. A confirmar no V-45.
- **P-19:** `skills/extraRoots/set` com a pasta `skills/` do contexto da sessão torna as skills do Flow Dev acionáveis pela entrada `skill`, sem copiá-las para o `~/.codex`. A confirmar no V-45.
- **P-20:** a tradução da 7.14 produz o comportamento esperado em cada modo. A confirmar no V-45.
- **Dependências:** Spec C concluída; Spec D com o registro de runtimes (DEC-28), a escolha de agente (REQ-109, REQ-110) e o `AgentChoiceField`.

---

# Parte 2 — Técnica

## 12. Visão geral da solução

O serviço de sessões da Spec C ganha um segundo runtime no registro da DEC-28 da Spec D: o `CodexAppServerRuntime`. Cada sessão do Codex sobe um `codex app-server` filho, falando JSON-RPC por stdio (DEC-29). O fluxo é este:
1. Conferir a versão, `skills/extraRoots/set` e `thread/start` (cwd, modelo, sandbox, aprovação, flag de perguntas).
2. `turn/start` com o prompt e a entrada `skill`.
3. As notificações e os pedidos do servidor são traduzidos para a porta da Spec C (DEC-30):
   - `agentMessage` → `onAssistantText`;
   - `fileChange`, `commandExecution`, `turn/started` e `turn/completed` → `onHook`, com o mesmo formato de payload que o resumidor da Spec B já entende;
   - pedidos de aprovação e perguntas → `onPermission`, no formato `Bash`, `Edit` ou `AskUserQuestion`, com a resposta traduzida de volta.
4. `push` vira `turn/start` depois do `turn/completed`; `interrupt` vira `turn/interrupt`; `close` encerra o processo; a retomada é um `thread/resume`.

O broker, o recorder, a máquina de estados, as tabelas e a tela não mudam. Mudam só os textos do pedido (7.16) e os botões novos ("Permitir nesta sessão").

## 13. Componentes e responsabilidades

| Componente | Responsabilidade | Local | Novo/Alterado |
|---|---|---|---|
| `CodexAppServerRuntime` | Implementa `AgentSessionRuntime` (start, resume, push, interrupt, close, abandon) | `packages/api/src/infra/terminal/codex/` | Novo |
| `CodexRpcClient` | JSON-RPC por stdio, ids, pedidos do servidor, encerramento do grupo | mesma pasta | Novo |
| `codexThreadOptions` | 7.14, modelo, esforço, flag de perguntas | mesma pasta | Novo |
| `codexItemTranslator` | Itens e notificações → payloads de hook da Spec B (REQ-114–116) | `packages/api/src/application/services/terminal/codex/` | Novo, puro |
| `codexRequestTranslator` | Pedidos do Codex ↔ `RuntimePermissionRequest/Result` (7.16, REQ-117–123) | mesma pasta | Novo, puro |
| `codex-protocol.ts` | Tipos gerados por `codex app-server generate-ts` na versão mínima, só os usados | `packages/api/src/infra/terminal/codex/` | Novo |
| `CodexCatalogPublisher` | Disponibilidade (7.13) e catálogo (7.12) publicados por máquina (DEC-32) | `packages/api/src/application/services/terminal/` | Novo |
| `sessionAgentCatalog` (Spec D) | Passa a ler o catálogo publicado do Codex | `application/terminal/` | Alterado |
| `PermissionRequestCard`, `permissionDisplayRules`, `answerMapper` | "Permitir nesta sessão", aviso do "sempre" do Codex, pedido de arquivos com diff, resposta secreta | web e `application/services/terminal/` | Alterado |
| `TerminalLaunchDialog` | Escolha de agente também na rota (REQ-126, REQ-127) | `apps/web/.../components/` | Alterado |
| `terminalPromptCopy` | Prompt por agente (7.15) | `application/services/terminal/` | Alterado |
| `ScriptedCodexAppServer` | `app-server` falso por stdio para testes (`FLOW_DEV_CODEX_FAKE_SCRIPT`, só com `NODE_ENV=test`) | `packages/api/test/support/` | Novo |

## 14. Modelo de dados

Migration `0050_codex_sessions.sql` com rollback.

- **`task_terminal_sessions`:**
  - `agent_version` text null (versão do Codex ou do Claude Code na abertura, NFR-21);
  - `claude_session_id` passa a guardar também o id da conversa do Codex. Mantém o nome, para não mexer na Spec C (DEC-30); no código, é lido como `agentSessionId`.
- **`task_terminal_requests`:** o check de `kind` ganha `file_change` e `extra_permission`. As decisões passam a aceitar `allow_session`.
- **`terminal_session_hosts`:** `codex_status` jsonb null, com `{ available, reason, version, models: [{ id, label, isDefault, efforts, defaultEffort }], refreshedAt }`.

**Dados existentes:** nada muda; as sessões atuais ficam com `agent = claude` (Spec D).

## 15. Interfaces e contratos

```ts
// sem procedure nova; mudam os tipos que a tela já consome
tasks.terminal.open({ ..., purpose: { kind: "route"; choice: AgentChoice } | ...Spec D })
tasks.session.decidePermission({ ..., decision: "allow" | "allow_session" | "allow_always" | "deny", reason? })
// "allow_session" só em pedidos do Codex; erro: decision_not_offered
timeline.entries[type="permission"] += { kind: "command" | "file_change" | "extra_permission";
  offers: Array<"allow" | "allow_session" | "allow_always" | "deny">; alwaysScope: "project" | "machine" | null }
timeline.entries[type="question"].questions[] += { secret: boolean }

interface CodexRpc {                       // contrato interno do runtime
  request<M extends ClientMethod>(method: M, params: ParamsOf<M>): Promise<ResultOf<M>>;
  onNotification(handler: (n: ServerNotification) => void): void;
  onServerRequest(handler: (r: ServerRequest) => Promise<unknown>): void;
  close(): Promise<void>;
}
```

A tradução dos pedidos segue a 7.16 e a seção 16. As opções exatas do `thread/start` e do `turn/start` ficam registradas no `v45-spike.md`.

## 16. Fluxos principais

**Iniciar (REQ-111–113)**
1. O supervisor assume a sessão como na Spec C e pega no registro o runtime do agente `codex`.
2. O runtime sobe `codex app-server` com o cwd do clone, faz `initialize` e confere a versão.
3. Em seguida, `skills/extraRoots/set` com `contexto/skills/` e `thread/start` com o modelo, a política da 7.14 e `config` com a flag de perguntas (DEC-33).
4. O `turn/start` leva o esforço e as entradas `text`, `skill` e `localImage` (anexos de imagem); os demais anexos entram por caminho no texto, como na Spec A.
5. `thread/started` grava o id da conversa e leva a sessão a `running`. Um erro antes disso leva a `launch_failed` (REQ-113).

**Pedido (REQ-117–123)**
1. O `codexRequestTranslator` converte o pedido do Codex num `RuntimePermissionRequest`:
   - comando → `Bash`, com a regra proposta;
   - arquivos → `file_change`, com os diffs;
   - perguntas → `AskUserQuestion`, com escolha única.
2. O broker da Spec C grava o pedido e espera.
3. A resposta volta traduzida:
   - "Permitir" → `accept`;
   - "Permitir nesta sessão" → `acceptForSession`;
   - "Permitir sempre" → `acceptWithExecpolicyAmendment`, com a regra proposta;
   - "Recusar" → `decline`, e o motivo entra como mensagem na próxima vez;
   - perguntas → `{ answers: { <id>: { answers: [rótulo | texto] } } }`.

**Eventos (REQ-115, REQ-116)**
1. Ao enviar o prompt, o runtime emite o hook `UserPromptSubmit` e, quando houver entrada `skill`, o evento de skill.
2. Cada `fileChange` concluído vira um `PostToolUse` por caminho. Cada `commandExecution` concluído vira `PostToolUse` de `Bash`. `turn/completed` vira `Stop`, e a captura da Spec B roda.

**Interromper, encerrar e retomar (REQ-124, REQ-125)**
- `turn/interrupt` com o id da vez ativa.
- No encerramento, `thread/unsubscribe` e, depois, o fim do grupo do processo.
- Na retomada, `thread/resume` com o id da conversa, o mesmo modelo e a mesma política, seguido de `turn/start` com a mensagem. Uma falha leva a sessão a `ended` (REQ-078).

## 17. Decisões técnicas

### DEC-29 — `codex app-server` por stdio, um processo por sessão
- **Decisão:** cada sessão do Codex sobe o próprio `codex app-server`, filho do serviço de sessões, sem o daemon compartilhado.
- **Alternativas consideradas:**
  - `codex exec` com `resume`, sem conversa: recusado pelo usuário, que quer a sessão completa;
  - um único `app-server` para todas as sessões: um travamento derruba todas e mistura o ciclo de vida;
  - o daemon compartilhado (`app-server daemon`): pode ser o mesmo que a pessoa usa no terminal (B-45) e tem estado fora do controle do Flow Dev;
  - um SDK do Codex para TypeScript: não instalado nem conferido; o protocolo do `app-server` é o que a CLI instalada oferece.
- **Consequências:** um processo por sessão ativa, como o Claude, isolamento simples e encerramento pelo grupo do processo. O protocolo é experimental (NFR-21, V-45).

### DEC-30 — O Codex traduzido para a porta da Spec C
- **Decisão:** o runtime do Codex emite os mesmos payloads de hook e pedidos de permissão que o Claude, e o resto do serviço não sabe qual agente está do outro lado.
- **Alternativas consideradas:** um modelo de eventos neutro, reescrevendo o resumidor da Spec B e o broker da Spec C (mais mudança, mais regressão); tabelas próprias do Codex (duplicam a tela e o histórico).
- **Consequências:** a tradução fica concentrada em dois módulos puros e testáveis. O preço é que os nomes de ferramenta do Claude (`Bash`, `Edit`, `AskUserQuestion`) viram o vocabulário interno. Os pedidos sem equivalente (`file_change`, `extra_permission`, `allow_session`) entram como extensões explícitas.

### DEC-31 — Skills por raiz extra e entrada `skill`
- **Decisão:** a pasta `skills/` do contexto da sessão (Spec A, DEC-11) vira raiz extra de skills, e o prompt aciona a skill com uma entrada `skill` com o caminho.
- **Alternativas consideradas:** copiar as skills para o `~/.codex/skills` (escreve fora da sessão, contra a seção 9); colar o `SKILL.md` no prompt (perde as referências da skill e as leituras sob demanda).
- **Consequências:** o mesmo conteúdo serve aos dois agentes. O `[spec-writer]` na conversa é só exibição (7.15).

### DEC-32 — Catálogo e disponibilidade publicados pelo serviço
- **Decisão:** o serviço de sessões consulta `model/list` e o estado do login quando sobe e a cada 10 min, e grava o resultado em `terminal_session_hosts.codex_status`. O `preflight` só lê.
- **Alternativas consideradas:** consultar o Codex no `preflight` (sobe um processo por abertura de diálogo, com lentidão parecida com a das sondagens de 5 s já vistas no projeto); um catálogo fixo nas Configurações (desatualiza a cada lançamento).
- **Consequências:** o diálogo abre rápido. Um login feito há menos de 10 min pode aparecer como pendente; o `open` confere de novo antes de iniciar.

### DEC-33 — Perguntas pela flag em desenvolvimento, com texto como plano B
- **Decisão:** as sessões do Codex sobem com `features.default_mode_request_user_input = true`. Se o V-45 ou uma versão futura mostrar que a ferramenta não funciona, a flag sai, e as perguntas seguem como texto (REQ-119).
- **Alternativas consideradas:** só texto (menos estruturado; escolhido como plano B); o modo plano do Codex (não edita arquivos, e a spec-writer precisa escrever a spec).
- **Consequências:** a spec-writer funciona nos dois casos, porque já pergunta em texto quando não tem a ferramenta. A flag é desligada por uma constante, sem mudar a tela.

## 18. Segurança, privacidade e permissões

- **Permissões:** as mesmas da Spec C (REQ-080), conferidas no controller. O serviço só assume sessões da própria máquina (NFR-12).
- **Pedidos:** "Permitir sempre" usa só a regra proposta pelo Codex e gravada no pedido. A pessoa não escreve regra livre, e o aviso deixa claro que ela vale para a máquina inteira (REQ-121, REQ-123).
- **Validação das respostas:** só rótulos existentes, ou "Outra" quando o Codex permitir. "Permitir nesta sessão" só é aceito nos pedidos que o ofereceram (`decision_not_offered`).
- **"Tudo liberado" no Codex** é `danger-full-access`, o mesmo risco do `--dangerously-skip-permissions` do Claude, sob a trava `FLOW_DEV_TERMINAL_ENABLED`.

## 19. Observabilidade

O log `[session]` passa a incluir:
- o agente e a versão do Codex;
- a abertura e o fim do `app-server`, com o código de saída;
- os pedidos, pelo tipo, sem o conteúdo;
- a flag de perguntas ativa ou desligada;
- os erros JSON-RPC, pelo método.

Nova linha `[codex-catalog]` com a disponibilidade e o número de modelos a cada renovação.

## 20. Migração, rollout e reversão

**Ordem:**
1. V-45 registrado em `v45-spike.md`, com a 7.14, P-17 a P-20 e a versão mínima ajustadas.
2. Migration 0050.
3. Tradutores puros.
4. Cliente RPC e runtime, contra o `app-server` falso.
5. Registro no supervisor e catálogo publicado.
6. Tela (pedidos e diálogo da rota).

O Codex aparece habilitado só depois do passo 5.

**Rollback:** reverter o código tira o Codex do registro; as sessões do Codex ativas ficam sem runtime e caem na REQ-076 ("Interrompida"), sem retomada até o código voltar. O rollback da migration apaga `codex_status` e `agent_version`, e os pedidos `file_change` ficam inválidos. Reverta o código antes.

## 21. Riscos técnicos

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| O protocolo do `app-server` muda numa atualização do Codex | média | alto | tipos gerados numa versão fixa; versão registrada e mínima conferida; contrato coberto pelo V-46 contra o servidor falso e pelo V-45 contra o real |
| A ferramenta de perguntas some ou quebra (está em desenvolvimento) | média | médio | REQ-119: texto como plano B, sem quebrar a sessão |
| A tradução de modos dá mais ou menos acesso que o esperado | média | alto | V-45 por modo; a 7.14 só fecha com o resultado |
| `thread/resume` falha depois de o processo morrer | baixa | médio | V-45; a REQ-078 encerra com uma mensagem clara |
| O "Permitir sempre" do Codex libera comandos em outros projetos | média | médio | aviso explícito no botão (REQ-121); a escolha padrão continua "Permitir" |
| Uso da assinatura do ChatGPT por um cliente local fora do previsto nos termos | baixa | alto | uso pessoal, na própria máquina, como os agentes locais; revisar os termos antes de distribuir |

---

# Parte 3 — Verificação

## 22. Estratégia de testes

Base: `software-testing`.

- **Tradutores puros, com casos tirados do protocolo gerado:**
  - itens → hooks;
  - pedidos ↔ respostas;
  - política da 7.14.
  É ali que mora a regra.
- **O runtime contra o `ScriptedCodexAppServer`,** um processo real falando JSON-RPC por stdio. Prova o enquadramento das mensagens, os ids, os pedidos do servidor, o fim do grupo do processo e a morte no meio da vez. O Codex real seria lento, custaria e variaria.
- **Serviço com Postgres e roteiro,** para provar que a Spec C vale com o agente `codex`: fila, idempotência, recuperação e retomada.
- **Um e2e:** iniciar com Codex → texto → pergunta → aprovação de comando "nesta sessão" → encerrar.
- **Sem prova automática:** o comportamento do Codex real (perguntas, modos, retomada, skills). Isso fica com o V-45 e o V-52.

## 23. Matriz de verificação

| ID | Cobre | Falha que detecta | Fronteira real | Casos (resumo) |
|---|---|---|---|---|
| V-45 | P-17–P-20, DEC-29, DEC-31, DEC-33, 7.14, B-47 | o Codex não faz o que a spec supõe | spike manual, Codex real, repositório temporário | login por assinatura; skill do Flow Dev pela entrada `skill`; pergunta com a flag em cada modo; os três modos com edição e comando; `acceptForSession` e regra gravada; `resume` após `kill -9`; `turn/interrupt` num `sleep 30`; leitura do `SKILL.md` observável; versão mínima |
| V-46 | REQ-114–116, B-46 | texto de raciocínio ou subagente gravado; arquivo sem evento | `codexItemTranslator` puro | `agentMessage` principal e de subagente; `reasoning` ignorado; `fileChange` com add, update, delete e move; `commandExecution`; `turn/completed` vira `Stop`; prompt com skill vira evento de skill |
| V-47 | REQ-117–123, 7.16, B-43 | decisão errada mandada ao Codex; "sempre" com regra livre; secreto guardado | `codexRequestTranslator` puro | cada botão para cada decisão; pergunta com e sem "Outra"; secreta vira "(resposta oculta)"; `grantRoot` sem "nesta sessão"; permissão extra só permitir e recusar |
| V-48 | 7.14, REQ-120, REQ-125 | modo traduzido errado; modo perdido na retomada | `codexThreadOptions` puro | os três modos; modelo e esforço; flag ligada; mesmas opções no resume |
| V-49 | REQ-111, REQ-113, REQ-124, REQ-125, NFR-19, B-49 | processo órfão; resposta sem destino; morte não detectada | `CodexAppServerRuntime` + `ScriptedCodexAppServer` por stdio | start → `thread/started`; pedido do servidor respondido; interrupt; close mata o grupo; servidor morre no meio e chega `crashed`; resume com a conversa; erro antes do início leva a `failed` |
| V-50 | REQ-112, 7.12, 7.13, DEC-32, NFR-18, B-44 | Codex habilitado sem login; catálogo vazio derruba o diálogo | `CodexCatalogPublisher` + Postgres, Codex falso | cada linha da 7.13; modelos ocultos fora; renovação; `open` reconfere; modelo sumido |
| V-51 | REQ-121, REQ-122, REQ-126, REQ-127, REQ-118 na tela | botão errado; aviso do "sempre" ausente; padrão errado na rota | componentes (RTL) | pedido de comando com os quatro botões e o aviso; pedido de arquivos com o diff; campo secreto; diálogo da rota em Claude · Opus · Máximo; troca para Codex com o padrão do Codex |
| V-52 | US-15–US-18 com o Codex real | o que o servidor falso não reproduz | smoke manual pela UI | Tech Spec com a spec-writer no Codex, com perguntas respondidas; uma sessão do plano no Codex; reiniciar e retomar |
| V-53 | US-15–US-17 ponta a ponta | partes desconectadas | Playwright + web + serviço com `ScriptedCodexAppServer` + Postgres de teste | inicia com Codex; texto; pergunta respondida; comando "nesta sessão"; encerra; outra pessoa em leitura |
| V-54 | REQ-124, seção 9 | regressão nas sessões do Claude e nos agentes isolados | testes existentes das Specs B–D + Postgres | Claude sem mudança; Issue Author e Planejamento com Codex isolado; fila, interromper e retomar com `codex` no roteiro do serviço |

## 24. Definição de pronto

- V-45 registrado em `docs/specs/sessao-do-codex/v45-spike.md`, com a 7.14, a versão mínima e P-17 a P-20 ajustadas.
- `pnpm --dir packages/api test` e `pnpm --dir packages/api test:integration` passando.
- `pnpm --dir apps/web test` e o e2e novo (`pnpm --dir apps/web test:e2e e2e/codex-session.spec.ts`), mais o `session-conversation.spec.ts` e o `task-plan.spec.ts` afetados, passando.
- `pnpm typecheck`, `pnpm lint` e `pnpm build` passando.
- Smoke V-52 feito uma vez pela UI.
- Spec D atualizada: a linha Codex da 7.4 aponta para a 7.12 desta spec, e a seção 9 registra a REQ-126.

---

## Questões em aberto

Nenhuma de produto. P-17 a P-20 são fatos a confirmar no V-45. O plano B de cada uma está nas REQ-119 e REQ-078 e na tabela 7.14.

## Sugestões fora do escopo

- Mandar a mensagem durante a vez com `turn/steer`, em vez de esperar na fila.
- Mostrar o plano de passos que o Codex publica (`turn/plan/updated`) como um resumo na etapa.
- Mostrar o uso da assinatura (`account/rateLimits/read`) no diálogo, antes de escolher o modelo.
- Usar o Codex também no `/review` como revisão automática depois do plano.

## Histórico

- 2026-11-23 — Criação da spec, separada da Spec D porque a sessão do Codex tem o tamanho da Spec C. Decisões do usuário:
  - sessão completa, com conversa;
  - o Codex na divisão, na execução e também na etapa de spec;
  - perguntas pela flag em desenvolvimento, com texto como plano B;
  - os mesmos três modos de permissões;
  - "Permitir nesta sessão" e "Permitir sempre" (este valendo para a máquina);
  - Claude Code · Opus · Máximo como valor inicial também nas sessões de rota.
