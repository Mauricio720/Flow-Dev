# Spec D: Tarefas e plano de execução

> **Status:** Rascunho · **Data:** 2026-11-23 · **Nível:** L4 ancorada (vai para spec-to-tasks) · **Depende de:** [Spec C](../sessao-no-flow-dev/spec.md) e [Spec B](../acompanhamento-e-artefatos/spec.md). As sessões Codex seguem o contrato da [Spec E](../sessao-do-codex/spec.md). Os IDs continuam a numeração das Specs A–C e nunca se repetem.
> **Contexto lido:** Specs A, B e C; `apps/web/PRODUCT.md`; `.claude/skills/spec-to-tasks/` (`SKILL.md`, `references/manifest-template.md`, `references/task-template.md`); `apps/web/src/features/issues/assigned-work/` (`stageTabs.ts`, `components/OperatorStages.tsx`, `ExecutionStage.tsx`, `ArtifactSection.tsx`, `ArtifactList.tsx`, `ArtifactViewer.tsx`, `artifactMarkdown.ts`); `packages/api/src/application/services/terminal/` (`terminalPromptCopy.ts`, `terminalEventIngestion.ts`, `artifactCapturePlan.ts`); `packages/api/src/application/terminal/sessionContext.ts`; `packages/api/src/infra/terminal/agentSdkQueryOptions.ts`; `packages/api/src/application/agents/agentCatalog.ts`; `packages/api/src/infra/database/schema/tasks/` (`artifacts.ts`, `terminal.ts`, `taskExecutionPlans.ts`); `sdk.d.ts` do `@anthropic-ai/claude-agent-sdk` 0.3.330 (`Options.model`, `Options.effort`); `packages/api/src/infra/agents/codexArguments.ts`; `codex --help` e `codex app-server --help` (CLI 0.159.3).

## Resumo para revisão

- **O que muda:**
  - A tarefa ganha a etapa **"Tarefas"**, entre o Planejamento e a sessão do Claude. Com a spec capturada, "Gerar tarefas" abre uma sessão que quebra a spec com a skill **spec-to-tasks**, no agente, no modelo e no esforço que a pessoa escolher (Claude Code ou Codex). A etapa também aparece quando a spec-to-tasks roda por pedido na conversa.
  - As tarefas aparecem como lista (status, dependências, mini-tarefas), e cada uma abre renderizada, com versões, como os artefatos.
  - Um **plano de execução** agrupa as tarefas em sessões. Cada sessão tem agente, modelo e esforço. Toda escolha começa em Claude Code · Opus · Máximo e pode ser trocada, sessão a sessão ou em todas de uma vez. Há os atalhos "Todas numa sessão", "Uma sessão por tarefa" e "Mesmo modelo para todas".
  - A pessoa inicia cada sessão do plano. Ela só libera quando as dependências estão concluídas, mas existe "Iniciar mesmo assim", com confirmação.
- **Por quê:** depois da spec, o fluxo para. Quebrar, escolher o modelo e montar cada sessão é feito à mão, sempre com o mesmo modelo.
- **Decisões principais:**
  - DEC-22: o conjunto de tarefas é lido dos artefatos, e não de uma tabela própria.
  - DEC-23: nas sessões do plano, os `.md` da pasta das tarefas são capturados mesmo sem skill ativa.
  - DEC-24: agente, modelo e esforço por sessão; no Claude, pelas opções do SDK.
  - DEC-26: "Iniciar" reaproveita o `open` da Spec C.
  - DEC-28: a sessão guarda o agente, e o serviço escolhe o runtime por ele; o do Codex vem da Spec E.
- **Riscos principais:**
  - O agente esquece de marcar a tarefa como concluída, e a próxima sessão fica bloqueada. Mitigação: instrução no prompt e "Iniciar mesmo assim" (REQ-102).
  - Uma combinação de modelo e esforço não é aceita. Mitigação: o spike V-33 vem antes, e só aparecem as combinações aceitas.
  - O Codex depende do CLI instalado, da versão mínima e do login local. A disponibilidade publicada pelo serviço mantém a escolha desabilitada enquanto qualquer requisito faltar (REQ-110, Spec E §7.13).
- **Como vamos verificar:**
  - leitores e regras do plano puros;
  - controllers e captura com o Postgres de teste;
  - um e2e da jornada gerar → planejar → executar, com o runtime roteirizado;
  - smoke real (V-33, V-42).
- **Pendências:** nenhuma de produto. A disponibilidade do Codex depende das condições locais da Spec E §7.13.

---

# Parte 1 — Produto

## 1. Contexto e problema

Com a Spec C, a rota Tech Spec ou PRD abre uma sessão do Claude no Flow Dev, e a spec-writer grava `docs/specs/<slug>/spec.md`. A Spec B guarda essa spec como artefato. O passo seguinte do método já existe fora do Flow Dev: a skill spec-to-tasks quebra a spec em `_tasks.md` e `task_NN.md`, e cada tarefa é implementada "numa sessão nova". No Flow Dev, porém, nada disso tem lugar:
- quebrar exige escrever o comando à mão na conversa;
- as tarefas aparecem só misturadas na lista de artefatos, sem estado;
- cada sessão de implementação usa o modelo padrão do Claude Code da pessoa, sem escolha por sessão nem outro agente, como o Codex.

O `PRODUCT.md` lista "Tarefas" entre as etapas removidas que seriam reescritas. Esta spec reescreve essa etapa sobre as sessões da Spec C.

## 2. Usuários e papéis

- **Pessoa operadora da tarefa:** gera as tarefas, monta o plano e inicia as sessões.
- **Membro com acesso ao projeto e administrador:** veem tarefas, conteúdo e plano em modo leitura (REQ-024).

## 3. Objetivos

- **G9:** a pessoa gera as tarefas da spec pela tarefa do Flow Dev, sempre com a spec-to-tasks, no agente e no modelo que escolher.
- **G10:** cada tarefa é legível no Flow Dev como os artefatos, com o estado atual e o histórico de versões.
- **G11:** a pessoa decide quantas sessões vai usar e com qual agente, modelo e esforço cada uma roda, e inicia cada sessão sabendo se as dependências estão concluídas.

## 4. Fora de escopo

- **Encadear as sessões sozinho:** decidido iniciar cada sessão à mão.
- **Trocar de modelo no meio de uma sessão:** decidido modelo por sessão; para um modelo por tarefa, a pessoa coloca uma tarefa por sessão.
- **A sessão do Codex em si** (conversa, pedidos, aprovações, interrupção, retomada): fica na [Spec E](../sessao-do-codex/spec.md). Esta spec só escolhe o agente e o usa.
- **Sessões em paralelo no mesmo clone, ou worktrees:** a regra da REQ-014 continua.
- **Editar tarefas ou mini-tarefas no Flow Dev:** os arquivos mudam pela conversa com o agente; a tela só lê.
- **Revisão final com a spec-conformance como etapa:** não foi pedida (ver Sugestões).
- **Escolher agente e modelo nas sessões de rota:** fica na Spec E (REQ-126).
- **Padrão por projeto:** decidido não ter; o padrão é fixo, e a escolha muda na divisão e em cada sessão.

## 5. Histórias de usuário

### US-11 — Gerar as tarefas da spec (P1)
Como pessoa operadora, quero gerar as tarefas da spec pela tarefa, para não escrever o comando da spec-to-tasks à mão.
- **Por que P1:** sem tarefas, nada do resto existe.
- **Teste independente:** com a spec capturada, acionar "Gerar tarefas" e ver as tarefas na etapa.
- **Cenários de aceite:**
  1. **Dado** a Issue #42, cuja sessão de Tech Spec capturou `docs/specs/login/spec.md` (spec-writer), e sem conjunto de tarefas, **quando** Ana abre a aba "Tarefas", **então** vê "Nenhuma tarefa gerada ainda." e o botão "Gerar tarefas".
  2. **Dado** esse estado, **quando** Ana aciona "Gerar tarefas", **então** abre o diálogo de sessão com "Agente: Claude Code · Modelo: Opus · Esforço: Máximo", que Ana pode trocar, e o prompt `/flow-dev:spec-to-tasks Quebre em tarefas a spec docs/specs/login/spec.md…` (7.6), editável como na Spec A.
  3. **Dado** a sessão iniciada, **quando** a spec-to-tasks grava `_tasks.md`, `task_01.md`, `task_02.md` e `task_03.md` e o Claude termina a vez, **então** em até 5 s a aba mostra as três tarefas.
  4. **Dado** que, sem usar o botão, Ana escreveu na conversa da sessão da spec "/flow-dev:spec-to-tasks quebra essa spec", **quando** o `_tasks.md` é capturado, **então** a aba "Tarefas" mostra o conjunto do mesmo jeito.
  5. **Dado** a Spec E implementada e o Codex logado na máquina, **quando** Ana escolhe "Codex · gpt-6.1-sol · Alto" e confirma, **então** a sessão de geração roda no Codex, a spec-to-tasks grava os arquivos, e as tarefas aparecem como no cenário 3.

### US-12 — Ler as tarefas como artefatos (P1)
Como pessoa operadora, quero ver cada tarefa com o estado e o conteúdo renderizado, para revisar o que vai ser executado e acompanhar o progresso.
- **Por que P1:** é o pedido explícito ("igual os artefatos") e a base para montar o plano.
- **Teste independente:** abrir a tarefa 02 e ver o Markdown, as mini-tarefas marcadas e as versões.
- **Cenários de aceite:**
  1. **Dado** o conjunto de `docs/specs/login/`, **quando** a aba abre, **então** a lista mostra "01 — Esquema e DAO · backend · medium · depende de — · 0/3 · Pendente" e as demais na ordem do manifesto.
  2. **Dado** a lista, **quando** Ana abre a 02, **então** vê `task_02.md` renderizado com as caixas de mini-tarefa marcadas ou não, o seletor de versões e a opção "Visão geral", que abre o `_tasks.md`.
  3. **Dado** que Ana pediu um ajuste e a spec-to-tasks editou `task_02.md`, **quando** o Claude termina a vez, **então** a 02 mostra a versão 2, e a versão 1 continua acessível.
  4. **Dado** um `_tasks.md` sem o bloco `graph` no frontmatter, **quando** a aba abre, **então** mostra "Não foi possível ler o _tasks.md: o grafo de tarefas está ausente.", lista os arquivos como artefatos e não mostra o plano.

### US-13 — Montar o plano de execução (P1)
Como pessoa operadora, quero decidir quantas sessões usar e o modelo e o esforço de cada uma, para gastar o modelo forte só onde ele vale a pena.
- **Por que P1:** é o centro do pedido.
- **Teste independente:** montar um plano com três sessões e modelos diferentes, salvar e recarregar.
- **Cenários de aceite:**
  1. **Dado** as tarefas 01–03 sem plano, **quando** Ana aciona "Todas numa sessão", **então** o plano mostra a "Sessão 1" com 01, 02 e 03, "Opus · Máximo".
  2. **Dado** esse plano, **quando** Ana aciona "Uma sessão por tarefa", troca a Sessão 3 para "Sonnet · Alto" e salva, **então** ao recarregar há três sessões; a 1 e a 2 estão em "Opus · Máximo", e a 3 em "Sonnet · Alto".
  3. **Dado** três sessões não iniciadas, **quando** Ana aciona "Mesmo modelo para todas" com "Haiku · Médio", **então** as três passam a "Haiku · Médio".
  4. **Dado** que a 02 depende da 01, **quando** Ana coloca a 01 na Sessão 2 e a 02 na Sessão 1 e salva, **então** vê "A tarefa 02 depende da 01, que está numa sessão posterior.", e nada é salvo.
  5. **Dado** o Codex instalado, atualizado e autenticado nesta máquina, **quando** Ana abre o seletor de agente da Sessão 2, **então** ela pode escolher um modelo e esforço publicados pelo catálogo local; sem uma dessas condições, Codex aparece desabilitado com o motivo da Spec E §7.13.

### US-14 — Executar uma sessão do plano (P1)
Como pessoa operadora, quero iniciar cada sessão do plano com o agente e o modelo escolhidos e ver a próxima liberar quando as dependências terminarem, para controlar a execução passo a passo.
- **Por que P1:** sem isso, o plano não produz código.
- **Teste independente:** iniciar a Sessão 1, ver a 01 concluída e a Sessão 2 liberar.
- **Cenários de aceite:**
  1. **Dado** a Sessão 1 "Pronta", **quando** Ana aciona "Iniciar", **então** o diálogo mostra o prompt da 7.6 para `task_01.md` e "Claude Code · Opus · esforço Máximo (definido no plano)", sem edição; ao confirmar, a sessão roda nesse agente, com esse modelo e esse esforço.
  2. **Dado** essa sessão, **quando** o agente marca as três mini-tarefas, muda `status` para `completed` em `task_01.md` e termina a vez, **então** em até 5 s a 01 mostra "3/3 · Concluída", e a Sessão 2 passa a "Pronta".
  3. **Dado** a Sessão 2 com a 01 em "Em andamento", **quando** Ana abre o plano, **então** a Sessão 2 mostra "Bloqueada: aguardando 01 (Em andamento)"; ao acionar "Iniciar mesmo assim" e confirmar "A sessão depende de tarefas não concluídas: 01. Iniciar mesmo assim?", o diálogo abre, e o plano registra "Iniciada com dependências abertas por Ana às 15:10".
  4. **Dado** que Ana encerrou a Sessão 1 com a 01 em "Em andamento", **quando** a tela atualiza, **então** a Sessão 1 mostra "Encerrada · 1 tarefa não concluída" e o botão "Iniciar de novo".

## 6. Requisitos funcionais

**Geração**
- **REQ-083** (US-11): ENQUANTO a tarefa tiver uma spec capturada (7.1) e nenhum conjunto de tarefas, a etapa "Tarefas" DEVE aparecer com "Nenhuma tarefa gerada ainda." e, para quem pode operar (REQ-107), o botão "Gerar tarefas".
- **REQ-084** (US-11): QUANDO a pessoa acionar "Gerar tarefas", o sistema DEVE abrir o diálogo de sessão da Spec C com o prompt de geração da 7.6 e a escolha da REQ-109. A divisão DEVE ser feita pela skill spec-to-tasks; o Flow Dev não gera nem altera tarefas por conta própria.
- **REQ-085** (US-11): SE a tarefa tiver mais de uma spec capturada, ENTÃO o diálogo DEVE pedir qual quebrar, com a de versão mais recente selecionada.
- **REQ-086** (US-11): QUANDO qualquer sessão da tarefa capturar um `_tasks.md`, o sistema DEVE reconhecer o conjunto de tarefas da pasta dele e mostrar a etapa "Tarefas", seja qual for o prompt ou o agente que a originou.
- **REQ-109** (US-11): O diálogo de "Gerar tarefas" DEVE oferecer agente, modelo e esforço (7.4), começando em Claude Code · Opus · Máximo, e a sessão de geração DEVE rodar com a escolha confirmada.
- **REQ-110** (US-11, US-13, US-14): SE um agente não puder conduzir sessões nesta máquina (por exemplo, Codex ausente, desatualizado ou sem login), ENTÃO as opções dele DEVEM aparecer desabilitadas com o motivo informado pela checagem da máquina, e o `open` DEVE recusar esse agente.

**Leitura**
- **REQ-087** (US-12): A etapa DEVE listar as tarefas na ordem do manifesto com número, título, tipo, complexidade, dependências, mini-tarefas concluídas sobre o total e status (7.2).
- **REQ-088** (US-12): QUANDO a pessoa abrir uma tarefa ou a "Visão geral", o sistema DEVE mostrar a versão mais recente do arquivo como Markdown renderizado, com as caixas de mini-tarefa só para leitura, e permitir escolher as versões anteriores, como a REQ-045.
- **REQ-089** (US-12, US-14): Status, títulos, dependências e contagens DEVEM vir da versão mais recente capturada de cada arquivo; QUANDO uma versão nova for capturada, a lista e o plano DEVEM refleti-la em até 5 s para quem estiver com a tarefa aberta.
- **REQ-090** (US-12): SE o manifesto não atender à 7.3, ENTÃO a etapa DEVE mostrar "Não foi possível ler o _tasks.md: <motivo>." com os arquivos da pasta como artefatos, e o plano DEVE ficar indisponível.
- **REQ-091** (US-12): SE uma tarefa do manifesto não tiver arquivo capturado, ENTÃO ela DEVE aparecer com "Arquivo da tarefa não capturado" e status "Desconhecido".

**Plano**
- **REQ-092** (US-13): A pessoa DEVE poder montar o plano como uma lista ordenada de sessões; cada sessão DEVE ter ao menos uma tarefa, um agente, um modelo e um esforço (7.4), e cada tarefa DEVE estar em no máximo uma sessão.
- **REQ-093** (US-13): O sistema DEVE oferecer os atalhos "Todas numa sessão" e "Uma sessão por tarefa", que refazem as sessões não iniciadas com as tarefas que não estão em sessões iniciadas, e "Mesmo modelo para todas", que aplica um agente, um modelo e um esforço a todas as sessões não iniciadas.
- **REQ-094** (US-13): Toda sessão nova do plano DEVE vir com Claude Code · Opus · Máximo; esse é só o valor inicial, e a pessoa DEVE poder trocá-lo em cada sessão não iniciada (REQ-092) e em todas de uma vez (REQ-093).
- **REQ-095** (US-13): Dentro de uma sessão, as tarefas DEVEM ficar na ordem das dependências e, sem dependência entre elas, na ordem do número. SE uma tarefa ficar numa sessão anterior à de uma tarefa da qual depende, ENTÃO o sistema DEVE recusar o salvamento com a mensagem do cenário US-13.4.
- **REQ-096** (US-13): Uma sessão do plano iniciada (7.5) NÃO DEVE mudar de tarefas, agente, modelo nem esforço; as não iniciadas DEVEM poder ser editadas, reordenadas, juntadas e removidas.
- **REQ-097** (US-13): QUANDO o manifesto ganhar uma versão nova depois de o plano ser salvo, o sistema DEVE:
  - mostrar as tarefas novas em "Sem sessão";
  - tirar as tarefas removidas das sessões não iniciadas, removendo as sessões que ficarem vazias;
  - avisar "As tarefas mudaram desde que o plano foi salvo. Revise o plano." até o próximo salvamento.
- **REQ-098** (US-13): SE o plano tiver sido salvo em outra aba depois de carregado, ENTÃO o salvamento DEVE ser recusado com "O plano mudou em outra aba. Recarregue para continuar.", sem mudar nada.
- **REQ-099** (US-13): O plano NÃO PRECISA cobrir todas as tarefas; as que não estão em nenhuma sessão DEVEM aparecer em "Sem sessão".

**Execução**
- **REQ-100** (US-14): Uma sessão do plano DEVE estar "Pronta" quando não tiver uma execução em andamento e todas as dependências das suas tarefas que estão fora dela estiverem concluídas; caso contrário, "Bloqueada", com cada tarefa que falta e o status dela.
- **REQ-101** (US-14): QUANDO a pessoa acionar "Iniciar" numa sessão "Pronta", o sistema DEVE abrir o diálogo da Spec C com o prompt de execução da 7.6 e o agente, o modelo e o esforço do plano à vista, sem edição, e a sessão DEVE rodar nesse agente, com esse modelo e esse esforço, inclusive quando for retomada (REQ-077).
- **REQ-102** (US-14): ENQUANTO a sessão do plano estiver "Bloqueada", o sistema DEVE oferecer "Iniciar mesmo assim", que pede a confirmação do cenário US-14.3 e registra no plano quem iniciou e quando.
- **REQ-103** (US-14): ENQUANTO uma sessão do plano estiver ativa, todo `.md` da pasta do conjunto de tarefas que ela criar ou editar DEVE virar artefato, mesmo sem skill ativa, atribuído a "Plano de execução".
- **REQ-104** (US-14): Cada sessão do plano DEVE mostrar o estado da sessão mais recente dela, com o link para a conversa; o histórico de sessões (REQ-023) DEVE mostrar o agente, o modelo e o esforço de cada sessão que os tiver.
- **REQ-105** (US-14): QUANDO a sessão mais recente de uma sessão do plano chegar a um estado final com alguma tarefa dela não concluída, o sistema DEVE oferecer "Iniciar de novo", com o mesmo agente, o mesmo modelo e o mesmo esforço e com o prompt listando só as tarefas não concluídas.
- **REQ-106** (US-14): QUANDO todas as tarefas do manifesto estiverem concluídas, a etapa "Tarefas" DEVE aparecer como "Concluída".

**Permissão e exclusão**
- **REQ-107** (US-11–US-14): Só a pessoa operadora da tarefa DEVE poder gerar tarefas, salvar o plano e iniciar sessões do plano; as demais pessoas que veem a tarefa veem lista, conteúdo e plano em leitura.
- **REQ-108** (US-13): QUANDO a Issue for excluída, o sistema DEVE excluir junto o plano e as sessões dele.

## 7. Regras de negócio

### 7.1 A spec da tarefa
Uma spec capturada é um artefato da tarefa chamado `spec.md` com ao menos uma versão produzida pela spec-writer. A versão mais recente decide qual é a spec "mais recente" (REQ-085).

### 7.2 Status de uma tarefa
| `status` no frontmatter de `task_NN.md` | Mostrado como | Conta como concluída |
|---|---|---|
| `pending` | Pendente | não |
| `in_progress` | Em andamento | não |
| `completed`, `done`, `finished` | Concluída | sim |
| ausente, outro valor ou arquivo não capturado | Desconhecido | não |

As mini-tarefas são as linhas `- [ ]` e `- [x]` que começam um item na seção `## Mini-tarefas`. O status vem só do frontmatter; a contagem não o altera (B-34), e a tabela "Estado" do `_tasks.md` não é lida (B-33).

### 7.3 Manifesto válido
- Frontmatter com `schema_version: "compozy.tasks/v2"` e `graph.nodes`, com cada nó `{ id: task_NN, file: task_NN.md }` e ids únicos.
- `graph.edges` só com nós existentes e sem ciclos.
- De 1 a 30 tarefas.

Os motivos mostrados são: "o frontmatter está ausente ou inválido", "o grafo de tarefas está ausente", "a tarefa <id> aparece mais de uma vez", "a dependência <de> → <para> cita uma tarefa inexistente", "as dependências formam um ciclo" e "há mais de 30 tarefas".

### 7.4 Agentes, modelos e esforço
| Agente | Modelos | Esforço |
|---|---|---|
| Claude Code | Opus, Sonnet e Haiku (catálogo Claude das Configurações) | Baixo, Médio, Alto, Muito alto e Máximo (níveis do Agent SDK) |
| Codex | os que o Codex instalado informa (7.12 da Spec E) | os que cada modelo informa como suportados (7.12 da Spec E) |

- **Padrão** da divisão e de toda sessão nova do plano: Claude Code · Opus · Máximo (REQ-094, REQ-109). Não há padrão por projeto.
- A rota aprovada também permite escolher agente, modelo e esforço; começa em Claude Code · Opus · Máximo (REQ-126 da Spec E).
- Uma combinação recusada (V-33 no Claude, o spike da Spec E no Codex) não é oferecida.
- Um agente indisponível aparece desabilitado (REQ-110).

### 7.5 Estados de uma sessão do plano
| Estado | Quando |
|---|---|
| Pronta / Bloqueada | não iniciada, ou a última execução terminou com tarefas não concluídas (REQ-100) |
| Em execução | a sessão mais recente não está num estado final |
| Encerrada | a sessão mais recente terminou, com alguma tarefa não concluída (REQ-105) |
| Concluída | todas as tarefas dela estão concluídas |

A sessão do plano conta como **iniciada** quando alguma sessão ligada a ela chegou a começar (o agente respondeu). Uma sessão que só deu "Falhou ao abrir" continua editável (B-39).

### 7.6 Prompts
- **Geração:** `<skill> Quebre em tarefas a spec <caminho da spec>. Salve os arquivos na pasta dela e pare para minha revisão. Não implemente.`, em que `<skill>` aciona a spec-to-tasks na sintaxe do agente: `/flow-dev:spec-to-tasks` no Claude Code; no Codex, a que a Spec E definir.
- **Execução:** `Implemente, nesta ordem, as tarefas <caminhos dos task_NN.md> de <pasta>. Siga o "Como executar" do _tasks.md: uma mini-tarefa por vez; marque [x] e atualize o status no arquivo da tarefa e no _tasks.md só depois de rodar o "Pronto quando". Pare ao terminar essas tarefas e não comece outras. Não faça commit, push nem PR sem eu pedir.`

Os dois são editáveis no diálogo, como na Spec A. O plano não muda se a pessoa editar o prompt (B-35).

### 7.7 Permissões
| Ação | Operadora | Membro ou admin |
|---|---|---|
| Ver a lista, o conteúdo e as versões das tarefas, e o plano | sim | sim, leitura |
| Gerar tarefas, salvar o plano, iniciar (inclusive "mesmo assim" e "de novo") | sim | não |

### 7.8 Limites
- Até 30 tarefas por conjunto (7.3) e até 30 sessões por plano.
- Cada sessão tem de 1 a 30 tarefas.

## 8. Casos de borda e erros

| ID | Situação | Comportamento esperado | Ref. |
|---|---|---|---|
| B-32 | Dois `_tasks.md` capturados em pastas diferentes | Vale o conjunto da pasta cujo `_tasks.md` tem a versão mais recente; a etapa avisa "Há outro conjunto de tarefas em <pasta>." | REQ-086 |
| B-33 | O agente atualiza `task_02.md` e esquece a tabela do `_tasks.md` | O status vem de `task_02.md`; a tabela não é lida | 7.2 |
| B-34 | `status: completed` com mini-tarefas desmarcadas | Mostra "Concluída" e a contagem real (ex.: 2/3), sem inferir nada | 7.2 |
| B-35 | A pessoa edita o prompt e tira uma tarefa | O plano não muda; o status de cada tarefa vem do arquivo dela | 7.6 |
| B-36 | A pessoa deixa de ser operadora com o plano montado | O plano é da tarefa: ela passa a ler, e a nova operadora edita as sessões não iniciadas e as inicia | REQ-107 |
| B-37 | O clone mudou de branch e `task_01.md` sumiu | A captura mostra "Arquivo não encontrado no clone" (REQ-046), e a tarefa mantém o status da última versão capturada | REQ-089 |
| B-38 | Rota de Execução direta | A etapa só aparece se um `_tasks.md` for capturado | REQ-083, REQ-086 |
| B-39 | O modelo não está disponível na assinatura, ou o limite de uso acabou | A sessão vai a "Falhou ao abrir" com o motivo (REQ-054); a sessão do plano continua não iniciada e editável | 7.5 |
| B-40 | A sessão do plano edita `.md` fora da pasta das tarefas sem skill ativa | Não vira artefato (REQ-048) | REQ-103 |
| B-41 | Já existe sessão ativa na tarefa ao acionar "Iniciar" ou "Gerar tarefas" | Pede a confirmação da REQ-014, como hoje | REQ-014 |
| B-42 | O plano tem uma sessão em Codex, e o Codex fica indisponível (logout, binário removido) | "Iniciar" mostra o motivo da REQ-110; a sessão continua editável para trocar o agente | REQ-110 |

## 9. Comportamento que não muda

- A abertura pela rota aprovada, o diálogo, os anexos, o modo de permissões e a conversa DEVEM CONTINUAR como nas Specs A e C. A rota começa em Claude Code · Opus · Máximo e usa o agente, modelo e esforço confirmados no diálogo (REQ-126 e REQ-127 da Spec E).
- A lista geral de artefatos da Spec B DEVE CONTINUAR a mostrar também os arquivos das tarefas.
- Fora das sessões do plano, a captura DEVE CONTINUAR a exigir skill ativa (REQ-042, REQ-048).
- A confirmação antes de uma segunda sessão na tarefa (REQ-014) DEVE CONTINUAR.
- O sistema DEVE CONTINUAR A não escrever no clone, salvo pela própria sessão do agente, nem no GitHub.
- As tabelas legadas `task_execution_plans` e `task_execution_runs` DEVEM CONTINUAR intocadas.

## 10. Requisitos não funcionais

- **NFR-15** (desempenho): com 30 tarefas, a etapa (lista e plano) DEVE carregar em até 1 s no p95 local, e o salvamento do plano DEVE responder em até 1 s.
- **NFR-16** (segurança): agente, modelo e esforço DEVEM ser validados no servidor contra a 7.4 e passados como opções do runtime, nunca como texto de comando (a NFR-12 continua). Os caminhos no prompt DEVEM vir dos artefatos capturados, relativos ao clone e sem `..`.
- **NFR-17** (acessibilidade):
  - o plano funciona inteiro pelo teclado: cada tarefa tem um seletor "Sessão", e não depende de arrastar e soltar;
  - status e estados têm texto, não só cor;
  - os avisos de bloqueio e de mudança nas tarefas usam `role="status"`.

## 11. Premissas e dependências

- **P-13:** "por padrão sempre vem no max" quer dizer Claude Code · Opus · Máximo, e é só o valor inicial (confirmado pelo usuário em 2026-11-23).
- **P-14:** o SDK 0.3.330, com o `claude` do PATH, aplica `model` e `effort` em `query()`, também no `resume`. A confirmar no V-33, junto com as combinações aceitas por modelo.
- **P-15:** a spec-to-tasks grava `_tasks.md` e `task_NN.md` na pasta da spec, no formato `compozy.tasks/v2` (`references/manifest-template.md`).
- **P-16:** a [Spec E](../sessao-do-codex/spec.md) define o runtime Codex na porta compartilhada da Spec C, as skills e a captura da Spec B. O acesso continua condicionado à disponibilidade local do CLI (REQ-110).
- **Dependência:** contrato da Spec E para sessões Codex; disponibilidade verificada por máquina. Spec C concluída.

---

# Parte 2 — Técnica

## 12. Visão geral da solução

Nada de infraestrutura nova. O **conjunto de tarefas** não tem tabela: um leitor puro interpreta a versão mais recente de `_tasks.md` e dos `task_NN.md` capturados pela Spec B (DEC-22) e devolve a lista com o estado. O **plano** fica em duas tabelas pequenas, salvo inteiro com versão otimista (DEC-25).

"Gerar tarefas" e "Iniciar" chamam o mesmo `tasks.terminal.open` da Spec C, com um `purpose` que define o prompt e a escolha de agente, modelo e esforço (DEC-26). A sessão grava `agent`, `model`, `effort` e `plan_item_id`. O supervisor escolhe o runtime pelo agente (DEC-28) e lhe repassa modelo e esforço. No Claude, eles vão para as opções do `query()` (DEC-24); no Codex, para o runtime da Spec E. Na ingestão de eventos, uma sessão do plano atribui a "Plano de execução" as edições de `.md` na pasta das tarefas quando não há skill ativa, e a captura da Spec B faz o resto (DEC-23).

## 13. Componentes e responsabilidades

| Componente | Responsabilidade | Local | Novo/Alterado |
|---|---|---|---|
| `TasksStage`, `TaskList`, `TaskViewer` | Aba "Tarefas", lista (REQ-087), conteúdo com versões, reaproveitando `useArtifactViewer` e `ArtifactViewer` (REQ-088) | `apps/web/src/features/issues/assigned-work/components/` | Novo |
| `GenerateTasksAction` | Botão e escolha da spec (REQ-083–085) | mesma pasta | Novo |
| `ExecutionPlanEditor`, `PlanSessionCard`, `PlanModelField` | Sessões, atalhos, seletor "Sessão" por tarefa, estados, "Iniciar", "mesmo assim" e "de novo" | mesma pasta | Novo |
| `useTaskSet`, `useExecutionPlan` | Leitura com polling de 5 s com a aba aberta; salvamento | `.../assigned-work/hooks/` | Novo |
| `stageTabs.ts`, `OperatorStages` | Aba "Tarefas" entre Planejamento e a sessão; aba inicial = Tarefas quando há conjunto e nenhuma sessão ativa | `.../assigned-work/` | Alterado |
| `TerminalLaunchDialog`, `AgentChoiceField` | `purpose`; escolha da spec; agente, modelo e esforço editáveis na geração e só para leitura no plano; opções indisponíveis desabilitadas (REQ-110) | `.../components/` | Alterado / Novo |
| `sessionAgentCatalog` | 7.4 e a disponibilidade por agente, para o `preflight` e as validações | `packages/api/src/application/terminal/` | Novo |
| `taskManifestParser`, `taskFileParser`, `taskSetReader` | 7.2 e 7.3, puros | `packages/api/src/application/services/tasks-set/` | Novo |
| `planRules`, `planReadiness`, `planReconciliation` | REQ-092–101, puros | mesma pasta | Novo |
| `TaskSetController`, `ExecutionPlanController` | `tasks.taskSet.get`, `tasks.plan.get/save`, REQ-107 | `packages/api/src/controllers/` | Novo |
| `ExecutionPlanDao` | Plano e sessões, versão otimista | `application/database/dao/` + `infra/database/dao/` | Novo |
| `TerminalSessionController.open/preflight`, `terminalPromptCopy` | `purpose`, prompts da 7.6, bloqueio e `force` | `controllers/`, `application/services/terminal/` | Alterado |
| `terminalEventIngestion` | Atribuição "Plano de execução" (DEC-23) | `application/services/terminal/` | Alterado |
| `ClaudeSessionRuntime` → `AgentSessionRuntime`, `buildQueryOptions`, `SessionSupervisor`, `sessionResume` | Porta comum por agente (DEC-28); `model` e `effort` no início e na retomada | `application/terminal/`, `infra/terminal/` | Alterado |
| `deletionPurge.ts` | Tabelas novas (REQ-108) | `infra/database/dao/issue-deletion/` | Alterado |
| `yaml` | Frontmatter do manifesto (DEC-27) | `packages/api/package.json` | Nova dependência |

## 14. Modelo de dados

Migration `0050_session_plans.sql` com rollback `0050_session_plans_rollback.sql`. Os nomes evitam as tabelas legadas `task_execution_plans` e `task_execution_runs`, da etapa removida.

- **`task_session_plans`**:
  - `id` uuid PK; `task_id` FK `tasks` (cascade), unique;
  - `tasks_folder` text (pasta relativa do conjunto);
  - `manifest_version` int (versão do `_tasks.md` em que o plano foi salvo, para a REQ-097);
  - `version` int ≥ 1 (otimista);
  - `updated_by` FK users, `updated_at`.
- **`task_session_plan_items`**:
  - `id` uuid PK; `plan_id` FK (cascade); `position` int;
  - `task_ids` text[] (1 a 30, `task_NN`);
  - `agent` text, com check em `claude` e `codex`;
  - `model` text e `effort` text, de 1 a 64 caracteres, validados no servidor contra a 7.4 (sem check fixo, porque o catálogo do Codex muda);
  - `forced_by` FK users null e `forced_at` null (REQ-102);
  - `created_at`. Unique (`plan_id`, `position`).
- **`task_terminal_sessions`** (colunas novas):
  - `purpose` text, com check em `route`, `generate_tasks` e `plan_item`; o default `route` cobre as linhas existentes;
  - `plan_item_id` uuid null, FK `task_session_plan_items` (set null);
  - `agent` text, com check em `claude` e `codex` e default `claude`, que cobre as linhas existentes;
  - `model` text null e `effort` text null.

**Dados existentes:** sem backfill; as sessões atuais ficam `purpose = route`, sem modelo. A exclusão da Issue já apaga `tasks` em cascata; confirmar a ordem no `deletionPurge.ts`.

## 15. Interfaces e contratos

```ts
tasks.taskSet.get({ projectId, taskId }) → {
  specs: Array<{ artifactId; path; updatedAt }>;            // 7.1, mais recente primeiro
  set: null | { folder; manifestArtifactId; manifestVersion; problem: string | null; otherFolders: string[];
    tasks: Array<{ id: string; number: string; title: string | null; type; complexity; dependsOn: string[];
      status: "pending" | "in_progress" | "completed" | "unknown"; miniDone: number; miniTotal: number; artifactId: string | null }> } }
type AgentChoice = { agent: "claude" | "codex"; model: string; effort: string };
tasks.plan.get({ projectId, taskId }) → { version; stale: boolean; unassigned: string[]; canEdit: boolean;
  items: Array<{ id; position; taskIds; choice: AgentChoice; state: "ready" | "blocked" | "running" | "ended" | "done";
    started: boolean; blockedBy: Array<{ taskId; status }>; forced: { by; at } | null; latestSessionId: string | null }> }
tasks.plan.save({ projectId, taskId, version, items: Array<{ id?: string; taskIds: string[]; choice: AgentChoice }> }) → { version }
// erros: plan_conflict | plan_invalid_order | plan_task_unknown | plan_task_duplicated | plan_item_started | plan_limits | task_set_unavailable | plan_control_denied
tasks.terminal.open({ ...Spec C, purpose:
  | { kind: "route" } | { kind: "generate_tasks"; specArtifactId; choice: AgentChoice } | { kind: "plan_item"; planItemId; force?: boolean } })
// erros novos: plan_item_blocked (sem force) | plan_item_not_ready (em execução ou concluída) | spec_not_found | agent_unavailable | choice_invalid
tasks.terminal.preflight({ ..., purpose }) → + { prompt: string; choice: AgentChoice | null;
  agents: Array<{ agent; available: boolean; reason: string | null; models: string[]; efforts: string[] }> }
```

A porta da Spec C passa a se chamar `AgentSessionRuntime` e ganha `model?: string; effort?: string` em `start` e `resume`. O `buildQueryOptions` só os inclui quando vierem preenchidos. O supervisor recebe um registro `Record<Agent, AgentSessionRuntime>`; até a Spec E, o registro só tem `claude`.

## 16. Fluxos principais

**Ler o conjunto (REQ-086–091)**
1. O controller confere a leitura da tarefa e busca os artefatos cujo caminho termina em `/_tasks.md`. Escolhe o de versão mais recente (B-32).
2. Ele lê a versão mais recente desse arquivo e dos `task_NN.md` da mesma pasta, e o `taskSetReader` aplica a 7.3 e a 7.2.

**Salvar o plano (REQ-092–100)**
1. REQ-107 e, em seguida, `planRules` sobre o conjunto atual: tarefas existentes, sem repetição, a ordem da REQ-095, os limites e as sessões iniciadas sem mudança.
2. Numa transação: `UPDATE task_session_plans SET version = version + 1 WHERE version = :version`. Zero linhas resulta em `plan_conflict` (REQ-098). Os itens não iniciados são substituídos e as posições renumeradas.

**Iniciar uma sessão do plano (REQ-100–103, REQ-105)**
1. O `preflight` monta o prompt de execução com as tarefas não concluídas do item e devolve a escolha e a disponibilidade dos agentes.
2. O `open` confere a disponibilidade do agente (`agent_unavailable`, REQ-110) e reavalia o `planReadiness` no servidor. "Bloqueada" sem `force` gera `plan_item_blocked`; com `force`, grava `forced_by` e `forced_at`.
3. Daí em diante, o fluxo é o da Spec C. A sessão nasce com `purpose = plan_item`, `plan_item_id`, `agent`, `model` e `effort`. O supervisor pega o runtime do agente e lhe passa modelo e esforço no `start`; o `sessionResume` também os repassa.

**Captura (REQ-103)**
1. Na ingestão de um `file_edit` em `.md`, sem skill ativa, numa sessão com `plan_item_id`, quando o caminho está na `tasks_folder` do plano, o evento é gravado com `skill = "plano-de-execucao"`. A captura da Spec B cria a versão, e a tela mostra "Plano de execução".

## 17. Decisões técnicas

### DEC-22 — Conjunto de tarefas lido dos artefatos
- **Decisão:** sem tabela de tarefas; o estado é calculado a cada leitura a partir da versão mais recente dos arquivos capturados.
- **Alternativas consideradas:**
  - tabela de tarefas sincronizada na captura: duplica o estado e diverge quando o arquivo muda de um jeito que o sincronizador não previu;
  - ler o clone ao vivo: depende do clone e da branch atuais, contra a REQ-047.
- **Consequências:** os arquivos que os agentes escrevem são a única fonte da verdade, e o Compozy continua compatível. O custo é ler até 31 arquivos por consulta, aceitável na NFR-15. O status só muda quando há captura.

### DEC-23 — Captura nas sessões do plano sem skill ativa
- **Decisão:** a ingestão atribui a "Plano de execução" os `.md` da pasta das tarefas editados numa sessão do plano sem skill ativa.
- **Alternativas consideradas:**
  - uma skill nova de execução acionada no prompt: mais uma skill para manter, e a skill ativa termina a cada vez (REQ-041), então as vezes seguintes não capturariam;
  - acionar a spec-to-tasks no prompt: ela regeneraria as tarefas.
- **Consequências:** é uma exceção estreita à REQ-048, limitada a uma pasta e às sessões do plano. A execução segue as instruções que a spec-to-tasks já põe em cada `task_NN.md`.

### DEC-24 — Agente, modelo e esforço por sessão
- **Decisão:** a escolha é gravada na sessão e reaplicada na retomada. No Claude, vai para `Options.model` e `Options.effort` do `query()`; no Codex, para o runtime da Spec E.
- **Alternativas consideradas:**
  - `setModel()` por tarefa dentro da sessão (recusado pelo usuário);
  - `--model` por `extraArgs` (contorna o contrato tipado do SDK);
  - Codex por `codex exec`, sem conversa, como os agentes de planejamento (recusado pelo usuário, que quer a sessão completa).
- **Consequências:** o modelo é fixo do início ao fim da sessão. Uma mudança de nomes no catálogo do Claude Code exige atualizar a 7.4.

### DEC-25 — Plano salvo inteiro, com versão otimista
- **Decisão:** um `save` com a lista completa e a `version` lida.
- **Alternativas consideradas:** operações granulares (mover tarefa, trocar modelo): mais procedures e corridas entre elas, para um plano de até 30 itens.
- **Consequências:** a tela edita localmente e salva de uma vez; duas abas não se sobrescrevem (REQ-098).

### DEC-26 — "Gerar tarefas" e "Iniciar" reaproveitam o `open` da Spec C
- **Decisão:** `purpose` no `open` e no `preflight`.
- **Alternativas consideradas:** procedures próprias, que repetiriam as checagens de vínculo, de branch, do serviço e dos anexos.
- **Consequências:** um só caminho de abertura. O `open` passa a conhecer o plano, por meio de uma porta de leitura.

### DEC-28 — Runtime escolhido pelo agente da sessão
- **Decisão:** a sessão grava `agent`, e o supervisor usa um registro de runtimes por agente atrás da mesma porta (`AgentSessionRuntime`). Conversa, pedidos, estados e captura continuam nas tabelas das Specs B e C.
- **Alternativas consideradas:**
  - ramificar o supervisor com `if codex`: espalha a diferença por todo o fluxo;
  - um serviço de sessões separado para o Codex: duplica heartbeat, órfãs e despacho.
- **Consequências:** esta spec entrega o registro só com o Claude. A Spec E acrescenta o Codex sem mexer no plano nem na tela.

### DEC-27 — `yaml` como dependência direta
- **Decisão:** o pacote `yaml`, com versão fixada, só para o frontmatter.
- **Alternativas consideradas:** um parser próprio (o `graph` aninhado é frágil à mão); `gray-matter` (traz `js-yaml` e mais API que o necessário).
- **Consequências:** uma dependência pequena e sem dependências próprias.

## 18. Segurança, privacidade e permissões

- **Autorização no controller,** a cada chamada: REQ-107 em `plan.save` e no `open` com `purpose`; leitura da tarefa em `taskSet.get` e `plan.get`.
- **Validação no servidor:** os `task_ids` existem no conjunto atual; modelo e esforço estão na 7.4 (NFR-16); o agente escolhido está disponível (REQ-110); o `planItemId` e o `specArtifactId` pertencem à mesma tarefa.
- **Prompt:** monta-se só com caminhos de artefatos capturados, já relativos ao clone. O Markdown é renderizado com o renderizador escapado da Spec B (NFR-09).
- **Nenhum dado novo sensível:** o plano guarda ids, agente, modelo e esforço.

## 19. Observabilidade

Logs com o prefixo `[plan]`:
- plano salvo (sessões e tarefas, sem o conteúdo);
- conflito de versão;
- sessão do plano iniciada (item, agente, modelo, esforço, `force`);
- manifesto inválido (motivo).

O log `[session]` da Spec C passa a incluir o agente, o modelo e o esforço.

## 20. Migração, rollout e reversão

**Ordem:**
1. V-33 registrado em `v33-spike.md`.
2. Migration 0050.
3. Leitores puros e `taskSet.get`.
4. Plano (DAO, regras, procedures).
5. `purpose`, prompts, registro de runtimes e modelo no runtime.
6. Captura (DEC-23).
7. UI.

Não há trava nova: a etapa vive sob `FLOW_DEV_TERMINAL_ENABLED`, como a Spec A. O Codex se habilita sozinho quando a Spec E registrar o runtime dele.

**Rollback:** reverter o código esconde a aba; as sessões do plano continuam no histórico, como sessões comuns. O rollback da migration apaga os planos e as colunas novas, e os artefatos ficam intactos.

## 21. Riscos técnicos

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| O agente não atualiza o `status`, e a sessão seguinte fica bloqueada | média | médio | instrução no prompt (7.6); status lido do `task_NN.md` (B-33); REQ-102 |
| Uma combinação de modelo e esforço é recusada, ou é ignorada sem erro | média | médio | V-33; só as combinações aceitas na 7.4; o modelo efetivo aparece no log do `init` |
| Opus · Máximo esgota rápido o limite da assinatura | média | médio | é o padrão pedido; a falha aparece como na REQ-054 (B-39); "Mesmo modelo para todas" troca em um passo |
| A spec-to-tasks muda o formato do manifesto | baixa | médio | a 7.3 aceita só o v2, e a REQ-090 mostra os arquivos crus |
| A Spec E atrasa, ou o `app-server` do Codex (experimental) muda | média | médio | o Codex fica desabilitado (REQ-110); o caminho Claude não depende dele (DEC-28) |
| Duas sessões no mesmo clone editam os mesmos arquivos | baixa | médio | a confirmação da REQ-014 continua; worktrees ficam fora |

---

# Parte 3 — Verificação

## 22. Estratégia de testes

Base: `software-testing` (uma ficha de risco por linha, fronteiras reais).

- **Funções puras com casos principais, de limite e de erro:** os parsers, `planRules`, `planReadiness` e `planReconciliation`. É ali que moram as regras das seções 7.2, 7.3 e 7.5.
- **Postgres descartável** (`packages/api test:integration`) no salvamento com versão, na imutabilidade das sessões iniciadas, no `open` com `purpose`, na ingestão com atribuição e na exclusão. O risco ali é SQL e concorrência.
- **Dublês:**
  - `ScriptedSessionRuntime`, que registra as opções recebidas e grava arquivos roteirizados no clone temporário;
  - relógio controlado onde houver horário.
- **Uma jornada e2e:** gerar → ler → planejar → executar → liberar a próxima.
- **Sem prova automática:** que o Claude real respeita `model` e `effort` e segue o prompt de execução. Isso fica com o V-33 e o V-42. O Codex real é provado na Spec E.

## 23. Matriz de verificação

| ID | Cobre | Falha que detecta | Fronteira real | Casos (resumo) |
|---|---|---|---|---|
| V-33 | P-14, DEC-24, 7.4 | o SDK ignora ou recusa modelo e esforço | spike manual, Claude real, repositório temporário | cada modelo × esforço: aceito ou recusado; o modelo no `init`; `resume` mantém o modelo; Opus · Máximo responde |
| V-34 | 7.2, 7.3, REQ-087, REQ-090, REQ-091, B-33, B-34 | estado errado; manifesto inválido aceito | parsers puros | v2 válido; sem frontmatter; sem `graph`; id repetido; aresta órfã; ciclo; 31 tarefas; `done` e `finished`; caixas fora de "Mini-tarefas" ignoradas; arquivo ausente vira "Desconhecido" |
| V-35 | REQ-092–098, REQ-099, REQ-100, REQ-105, 7.5, 7.8 | ordem impossível salva; sessão iniciada alterada; bloqueio errado | regras puras | ordem inválida com a mensagem; duplicada; atalhos respeitam as iniciadas; "mesmo modelo" só nas não iniciadas; padrão Opus · Máximo; pronta/bloqueada com dependência interna e externa; reconciliação (nova, removida, sessão vazia); "de novo" só com tarefas não concluídas |
| V-36 | REQ-098, REQ-107, REQ-108, NFR-16, B-36 | duas abas se sobrescrevem; quem não opera salva; sobra depois da exclusão | `ExecutionPlanController` + Postgres | versão velha leva a `plan_conflict`; item iniciado leva a `plan_item_started`; modelo fora do catálogo; membro e ex-operadora recusados; exclusão apaga o plano |
| V-37 | REQ-083–086, REQ-101, REQ-102, REQ-105, REQ-109, 7.1, 7.6, B-41 | prompt errado; sessão bloqueada inicia sem `force`; escolha não gravada | `open`/`preflight` + Postgres | `generate_tasks` com a spec e a escolha (padrão e trocada); duas specs, a mais recente primeiro; `plan_item` bloqueado leva a `plan_item_blocked`, e com `force` grava quem e quando; `agent`, `model` e `effort` na sessão; prompt só com as não concluídas |
| V-38 | REQ-101, DEC-24, DEC-28, seção 9 | modelo perdido no resume; runtime errado para o agente; sessão de rota com modelo forçado | `buildQueryOptions` puro + supervisor com dois roteiros registrados + Postgres | `start` e `resume` com `model` e `effort`; sessão `codex` vai ao roteiro `codex` e `claude` ao `claude`; sessão `route` sem modelo |
| V-39 | REQ-103, REQ-089, B-37, B-40 | `task_01.md` não capturado na execução; captura vazando para fora da pasta | ingestão + captura + Postgres + clone temporário | sessão do plano sem skill captura `task_01.md` como "Plano de execução"; `.md` fora da pasta, não; sessão comum sem skill, não; arquivo sumido mostra o motivo, e o status fica o da última versão |
| V-40 | US-11–US-14 na tela, REQ-088, REQ-104, REQ-106, NFR-17 | controles para quem só lê; plano inacessível pelo teclado | componentes (RTL) | lista e "Visão geral"; versões; aviso de manifesto inválido; atalhos; seletor "Sessão"; erro de ordem; escolha editável na geração e só para leitura no plano; Codex desabilitado com o motivo; confirmação de "mesmo assim"; "Encerrada · 1 tarefa não concluída"; leitura para membro; etapa "Concluída" |
| V-41 | US-11–US-14 ponta a ponta | partes desconectadas | Playwright + web + serviço com roteiro + Postgres de teste | spec semeada → "Gerar tarefas" → roteiro grava `_tasks.md` e duas tarefas → "Uma sessão por tarefa", Sessão 2 em Sonnet · Alto → iniciar a 1 → roteiro marca `completed` → a 2 fica "Pronta" |
| V-42 | US-11 e US-14 com o Claude real | o que o roteiro não reproduz | smoke manual pela UI | spec-to-tasks real gera as tarefas; uma sessão em Sonnet atualiza o status e libera a seguinte |
| V-44 | REQ-110, B-42, NFR-16 | agente indisponível aceito; modelo de outro agente aceito | `sessionAgentCatalog` puro + `open`/`plan.save` com Postgres | sem runtime `codex`: `preflight` marca indisponível com a mensagem, e `open` recusa com `agent_unavailable`; `opus` com `codex` leva a `choice_invalid`; esforço fora da 7.4 recusado |
| V-43 | Seção 9, REQ-014 | regressão nas Specs A–C | testes existentes + Postgres | abertura pela rota sem modelo; lista geral de artefatos; captura sem skill fora do plano; segunda sessão; tabelas legadas intocadas |

## 24. Definição de pronto

- V-33 executado e registrado em `docs/specs/tarefas-e-plano-de-execucao/v33-spike.md`, com a 7.4 ajustada ao resultado.
- `pnpm --dir packages/api test` e `pnpm --dir packages/api test:integration` passando.
- `pnpm --dir apps/web test` e o e2e novo (`pnpm --dir apps/web test:e2e e2e/task-plan.spec.ts`), mais o `session-conversation.spec.ts` afetado, passando.
- `pnpm typecheck`, `pnpm lint` e `pnpm build` passando.
- Smoke V-42 feito uma vez pela UI.
- `apps/web/PRODUCT.md` atualizado: "Tarefas" deixa de constar como removida.

---

## Questões em aberto

Nenhuma. A P-13 registra a interpretação de "max"; se estiver errada, muda só a REQ-094.

## Sugestões fora do escopo

- Encadear as sessões do plano sozinho, parando em pergunta pendente, em falha ou em tarefa não concluída.
- "Revisar contra a spec" (spec-conformance) quando todas as tarefas estiverem concluídas, com o veredito na etapa.
- Sessões em paralelo com worktrees, para tarefas sem dependência entre si.
- Mostrar uma estimativa de uso da assinatura por sessão do plano.

## Histórico

- 2026-11-23 — Criação da spec. Decisões do usuário:
  - plano com início manual de cada sessão;
  - modelo e esforço por sessão;
  - etapa aberta pelo botão e também por detecção;
  - plano definido pela pessoa, com "Todas numa sessão" como opção;
  - padrão "max" (P-13);
  - dependência aberta bloqueia, com "Iniciar mesmo assim";
  - a divisão é sempre feita pela spec-to-tasks.
- 2026-11-23 — O usuário confirmou que Opus · Máximo é só o valor inicial (P-13), sem padrão por projeto, e pediu o Codex na divisão e na execução, com sessão completa. Como o runtime do Codex tem o tamanho da Spec C, ele foi separado na Spec E. Esta spec ganhou a escolha de agente (REQ-109, REQ-110, B-42, DEC-28, V-44), e o Codex fica desabilitado até a Spec E.
- 2026-11-23 — A Spec E foi escrita. A escolha de agente na rota passou para ela (REQ-126), e o catálogo do Codex vem do próprio Codex (7.12 da Spec E).
- 2026-11-23 — A numeração da migration mudou de 0049 para 0050: a `0049_session_preparation` (correção da Spec C, com a coluna `prepared_at`) já ocupava o número. Nenhuma outra regra mudou.
- 2026-11-23 — V-33 executado (`v33-spike.md`): as 15 combinações da 7.4 foram aceitas e o `resume` mantém o modelo. A 7.4 e a P-14 não divergiram. O SDK **não recusa** um esforço fora do enum, então a validação do servidor (NFR-16) é a única barreira.
- 2026-11-23 — `tasks.plan.get` ganhou o campo `agents` (disponibilidade de cada agente, a mesma do `preflight`), para o editor do plano desabilitar o Codex com o motivo sem chamar o `preflight`, que é pesado e tem efeitos (REQ-110, B-42). O restante da §15 não mudou.
