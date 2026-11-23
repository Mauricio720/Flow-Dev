# Spec B: Acompanhamento e artefatos da execução no terminal

> **Status:** Implementada (smoke V-19 na tela pendente) · **Data:** 2026-11-22 · **Nível:** L4 ancorada (vai para spec-to-tasks) · **Depende de:** [Spec A — Abrir a execução no terminal](../execucao-no-terminal/spec.md). Os IDs são compartilhados com a Spec A e nunca se repetem.
> **Contexto lido:** o mesmo da Spec A, mais `apps/web/src/features/issues/assigned-work/` (`components/PlanningTimeline.tsx`, `workState.ts`), `packages/api/src/infra/agents/contextMcpEndpoint.ts`, `.claude/skills/spec-writer/SKILL.md` e `.claude/skills/spec-to-tasks/SKILL.md` (onde cada skill salva o que produz), `apps/web/node_modules/next/dist/docs/01-app/03-api-reference/04-functions/after.md`, e a documentação de hooks do Claude Code (`type: "http"`, `headers`, `onFailure`).

## Resumo para revisão

- **O que muda:**
  - A sessão aberta pela Spec A passa a avisar o Flow Dev do que faz.
  - A tarefa ganha a etapa "Execução no terminal", com estado (Em andamento, Aguardando você, Encerrada, Não confirmada) e eventos: prompts, arquivos editados, comandos, avisos.
  - Todo documento Markdown que uma skill escrever no clone (a spec da spec-writer, as tarefas da spec-to-tasks…) vira um **artefato** guardado no Flow Dev, com versões, visível na tarefa.
- **Por quê:**
  - A pessoa quer saber pela tarefa se a sessão precisa dela.
  - Os artefatos são a base de features futuras: gerar tarefas da spec, revisar e aprovar no Flow Dev, dar contexto à próxima sessão, conformidade e um mapa do projeto.
- **Decisões principais:**
  - DEC-02: hooks HTTP do Claude Code injetados com `--settings`.
  - DEC-03: eventos num route handler do Next.
  - DEC-04: token por sessão num arquivo `0600`.
  - DEC-12: artefato atribuído à skill ativa, a partir dos próprios eventos.
  - DEC-13: conteúdo versionado no Postgres.
  - DEC-14: captura quando o Claude termina a vez, depois de responder ao hook.
- **Riscos principais:**
  - O payload dos hooks e o evento da ferramenta Skill podem diferir do documentado; o spike V-15 vem antes de tudo.
  - Artefato atribuído à skill errada quando duas skills rodam na mesma vez (B-17).
- **Como vamos verificar:**
  - unitários da máquina de estados, do resumo de eventos e da atribuição de skill;
  - integração da ingestão e da captura com o Postgres de teste e um clone temporário;
  - e2e com eventos simulados;
  - smoke real (V-15, V-19).
- **Pendências:** nenhuma.

---

# Parte 1 — Produto

## 1. Contexto e problema

Com a Spec A, a pessoa abre o Claude no terminal, mas o Flow Dev não vê mais nada. Ela não sabe pela tarefa se o Claude está trabalhando ou esperando.

O que as skills produzem fica só no clone local da pessoa: spec-writer salva `docs/specs/<slug>/spec.md`, e spec-to-tasks salva `_tasks.md` e `task_NN.md` ao lado. Esses documentos são a matéria-prima de features futuras do Flow Dev, que vão precisar deles guardados no próprio Flow Dev, com histórico e ligados à tarefa.

## 2. Usuários e papéis

- **Pessoa operadora:** acompanha a própria sessão e lê os artefatos.
- **Membro com acesso ao projeto:** vê a etapa, os eventos e os artefatos das tarefas que pode ver, em modo leitura.
- **Features futuras do Flow Dev:** consomem os artefatos guardados. Não são pessoas, mas definem o que precisa ficar guardado (seção 11, P-08).

## 3. Objetivos

- **G5:** a tarefa mostra, em quase tempo real, se a sessão está trabalhando, esperando a pessoa ou encerrada, e o que foi feito.
- **G6:** o que as skills produzem em Markdown fica guardado no Flow Dev, ligado à tarefa e à skill, com todas as versões, mesmo que o clone mude ou suma.

## 4. Fora de escopo

- **Editar, comentar, aprovar ou gerar tarefas a partir dos artefatos:** são as features futuras; aqui só se guarda e se mostra.
- **Mapa do projeto:** feature futura.
- **Capturar código, diff ou outros tipos de arquivo:** decidido só Markdown.
- **Capturar Markdown escrito sem skill ativa:** decidido "o que a skill produzir".
- **Controlar a sessão pelo Flow Dev** (mandar mensagens, interromper, encerrar): o Flow Dev só observa.
- **Gravar a saída dos comandos ou o conteúdo dos arquivos editados:** decidido registrar só o resumo (REQ-019); os artefatos são a única exceção, e só para Markdown de skill.
- **Sessões abertas fora do Flow Dev:** sem os hooks, o Flow Dev não sabe delas.

## 5. Histórias de usuário

### US-03 — Acompanhar a sessão na tarefa (P2)
Como pessoa operadora, quero ver na tarefa o que a sessão do terminal está fazendo, para saber se ela precisa de mim sem olhar o terminal.
- **Por que P2:** a Spec A já entrega valor sozinha.
- **Teste independente:** abrir uma sessão, enviar uma mensagem no terminal e ver os eventos e o estado mudarem na tarefa.
- **Cenários de aceite:**
  1. **Dado** uma sessão recém-aberta, **quando** o Claude começa a trabalhar, edita `src/components/LoginButton.tsx` e roda `pnpm test`, **então** em até 5 s a etapa mostra "Em andamento", e a lista mostra "Editou src/components/LoginButton.tsx" e "Rodou: pnpm test".
  2. **Dado** que o Claude terminou a vez dele, **quando** a tela atualiza, **então** a etapa mostra "Aguardando você".
  3. **Dado** que Ana fechou o Claude com `/exit`, **quando** a tela atualiza, **então** a etapa mostra "Encerrada" com o horário, e a sessão vai para o histórico da tarefa.
  4. **Dado** que a janela foi aberta, mas o Claude não deu sinal de início em 60 s, **quando** o prazo vence, **então** a etapa mostra "Não confirmada: o Flow Dev não recebeu sinal do Claude. Confira a janela do terminal."

### US-05 — Guardar no Flow Dev o que as skills produzem (P2)
Como pessoa operadora, quero que os documentos que as skills escrevem fiquem guardados na tarefa, com histórico, para revisá-los no Flow Dev e para que as próximas etapas os usem.
- **Por que P2:** depende da US-03 (mesmo canal de eventos).
- **Teste independente:** abrir uma Tech Spec, deixar a spec-writer escrever a spec e vê-la na tarefa.
- **Cenários de aceite:**
  1. **Dado** uma sessão de Tech Spec, **quando** a spec-writer escreve `docs/specs/login/spec.md` e o Claude termina a vez, **então** em até 5 s a tarefa mostra o artefato "docs/specs/login/spec.md · spec-writer · versão 1", e abri-lo mostra o conteúdo renderizado.
  2. **Dado** esse artefato, **quando** Ana pede um ajuste no terminal, e a spec-writer edita o arquivo e termina a vez, **então** surge a versão 2, e a versão 1 continua acessível.
  3. **Dado** que, sem skill ativa, o Claude edita `README.md`, **quando** termina a vez, **então** nenhum artefato é criado, e o evento "Editou README.md" aparece como sempre.
  4. **Dado** uma segunda sessão da mesma tarefa em que a spec-to-tasks cria `docs/specs/login/_tasks.md` e edita `spec.md`, **quando** o Claude termina a vez, **então** surge o artefato `_tasks.md` (spec-to-tasks, versão 1), e `spec.md` ganha a versão 3, marcada como spec-to-tasks.

## 6. Requisitos funcionais

**Acompanhamento** (IDs vindos da Spec A)
- **REQ-014** (US-03): SE a pessoa já tiver uma sessão ativa na mesma tarefa, ENTÃO o sistema DEVE pedir confirmação ("Já existe uma sessão aberta para esta tarefa. Abrir outra?") antes de abrir mais uma.
- **REQ-016** (US-03): QUANDO uma tarefa tiver ao menos uma sessão, a linha do tempo DEVE mostrar a etapa "Execução no terminal" com o estado da sessão mais recente.
- **REQ-017** (US-03): O sistema DEVE mudar o estado da sessão só pelas transições da seção 7.2.
- **REQ-018** (US-03): O sistema DEVE registrar na sessão estes eventos, com o horário:
  - início;
  - prompt enviado (primeiros 500 caracteres);
  - arquivo editado ou criado (só o caminho relativo);
  - comando executado (primeira linha, até 200 caracteres);
  - skill acionada (nome);
  - aguardando você;
  - pedido de atenção (texto do aviso);
  - encerrada (motivo).
- **REQ-019** (US-03): O sistema NÃO DEVE gravar a saída de comandos nem o conteúdo dos arquivos editados, salvo os artefatos da US-05.
- **REQ-020** (US-03): QUANDO um evento for registrado, o sistema DEVE mostrá-lo em até 5 s a quem estiver com a tarefa aberta.
- **REQ-021** (US-03): SE não chegar sinal de início em 60 s depois da abertura, ENTÃO a sessão DEVE ir para "Não confirmada" com a mensagem do cenário US-03.4.
- **REQ-022** (US-03): ENQUANTO uma sessão ativa estiver há 30 min sem eventos, o sistema DEVE mostrar "Sem sinal desde HH:MM" ao lado do estado, sem mudá-lo.
- **REQ-023** (US-03): O sistema DEVE listar as sessões anteriores da tarefa com a pessoa, a rota usada, o início e o fim, e mostrar os eventos de cada uma ao expandir.
- **REQ-024** (US-03, US-05): O sistema DEVE mostrar a etapa, os eventos e os artefatos em modo leitura a quem pode ver a tarefa e não é a pessoa operadora.
- **REQ-026** (US-03): SE chegar um evento que não pertence a uma sessão aberta, ENTÃO o sistema DEVE recusá-lo sem gravar nada.
- **REQ-034** (US-03): O histórico da sessão DEVE listar os anexos da Spec A com nome, tipo e tamanho, e indicar "disponível até DD/MM" ou "removido".

**Artefatos**
- **REQ-041** (US-05): QUANDO a sessão acionar uma skill (pelo comando no prompt ou por decisão do Claude), o sistema DEVE considerar essa skill ativa até o Claude terminar a vez.
- **REQ-042** (US-05): ENQUANTO uma skill estiver ativa, todo arquivo `.md` dentro do clone que a sessão criar ou editar DEVE virar artefato da tarefa, atribuído a essa skill.
- **REQ-043** (US-05): QUANDO o Claude terminar a vez ou a sessão for encerrada, o sistema DEVE ler o conteúdo atual de cada artefato tocado desde a última captura e guardar uma nova versão se o conteúdo mudou desde a versão anterior.
- **REQ-044** (US-05): O sistema DEVE identificar um artefato pela tarefa e pelo caminho relativo no clone; sessões diferentes da mesma tarefa que tocam o mesmo caminho acrescentam versões ao mesmo artefato, cada versão com a skill e a sessão que a produziram.
- **REQ-045** (US-05): A tarefa DEVE listar os artefatos com caminho, skill da última versão, número de versões e horário da última; ao abrir um, DEVE mostrar a versão mais recente como Markdown renderizado e permitir escolher versões anteriores.
- **REQ-046** (US-05): SE o arquivo passar de 1 MB, não existir mais no clone ou não puder ser lido, ENTÃO o sistema NÃO DEVE criar a versão e DEVE mostrar no artefato o motivo: "Maior que 1 MB", "Arquivo não encontrado no clone" ou "Não foi possível ler o arquivo".
- **REQ-047** (US-05): O sistema DEVE guardar artefatos e versões no Flow Dev até a Issue ser excluída, mesmo depois que a sessão terminar, o arquivo mudar no clone ou o vínculo local mudar.
- **REQ-048** (US-05): Arquivos fora do clone, arquivos que não terminam em `.md` e arquivos editados sem skill ativa NÃO DEVEM virar artefato; continuam só como eventos.
- **REQ-049** (US-03, US-05): QUANDO a Issue for excluída do Flow Dev, o sistema DEVE excluir junto os eventos, os artefatos e as versões da tarefa.
- **REQ-050** (US-05): O sistema DEVE oferecer os artefatos e as versões por um contrato de leitura próprio (lista e conteúdo), separado da tela, para as features futuras.

## 7. Regras de negócio

### 7.2 Estados da sessão

| De | Para | Quando |
|---|---|---|
| — | Abrindo | a janela foi disparada (Spec A) |
| — | Falhou ao abrir | o disparo falhou (Spec A) |
| Abrindo / Não confirmada / Aguardando você | Em andamento | início, prompt enviado, skill acionada, arquivo editado ou comando executado |
| Em andamento | Aguardando você | o Claude terminou a vez ou pediu atenção |
| Abrindo | Não confirmada | 60 s sem nenhum sinal |
| qualquer um, menos Encerrada e Falhou ao abrir | Encerrada | sinal de encerramento |

Encerrada e Falhou ao abrir são finais: eventos que chegam depois são descartados. Uma sessão é **ativa** enquanto não está num estado final.

### 7.8 Artefatos

- **Skill ativa:** começa quando a pessoa digita `/<skill>` no início de uma mensagem (inclusive o prompt de abertura) ou quando o Claude aciona uma skill. Termina quando o Claude termina a vez. Se outra skill for acionada na mesma vez, ela passa a ser a ativa dali em diante.
- **Caminho:** relativo à raiz do clone da sessão, depois de resolver links simbólicos. Um link que aponta para fora do clone não vira artefato.
- **Versão:** número sequencial por artefato, a partir de 1. Uma nova versão só existe se o conteúdo for diferente da versão anterior. Arquivo apagado ou renomeado não apaga o artefato: o caminho novo vira outro artefato.
- **Limites:** até 1 MB por versão; sem limite de versões.

### 7.4 Permissões (complementa a Spec A)

| Ação | Operadora | Membro com acesso | Admin (sem ser operadora) |
|---|---|---|---|
| Ver a etapa, os eventos e o histórico (com a lista de anexos) | sim | sim, leitura | sim, leitura |
| Ver os artefatos e as versões | sim | sim | sim |
| Editar ou apagar um artefato pelo Flow Dev | não | não | não |

### 7.5 Limites (complementa a Spec A)

- **Eventos:** o de prompt guarda até 500 caracteres; o de comando, até 200.
- **Tela:** mostra os 200 eventos mais recentes de cada sessão, com "N eventos anteriores não exibidos".
- **Artefatos:** até 1 MB por versão.

## 8. Casos de borda e erros

| ID | Situação | Comportamento esperado | Ref. |
|---|---|---|---|
| B-05 | A janela é fechada sem sinal de encerramento | A sessão fica no último estado e aparece "Sem sinal desde HH:MM" depois de 30 min; os artefatos já capturados na última vez continuam | REQ-022 |
| B-06 | Evento chega depois de um estado final | Descartado | 7.2 |
| B-07 | Evento grande demais para ser lido (arquivo enorme criado) | Não é gravado; a sessão mostra "1 evento não registrado" | NFR-03 |
| B-10 | O Flow Dev fica fora do ar durante a sessão | O Claude continua normalmente; os eventos desse intervalo se perdem, e as edições perdidas de artefatos não são capturadas até a próxima edição do mesmo arquivo | NFR-03 |
| B-11 | Primeira vez com todas as permissões: o Claude pede para a pessoa aceitar o modo no terminal | Pode passar dos 60 s e ir para "Não confirmada"; o primeiro sinal depois disso leva a "Em andamento" | 7.2 |
| B-17 | Duas skills na mesma vez (spec-writer e depois spec-to-tasks) | Cada arquivo é atribuído à skill ativa no momento da edição | 7.8 |
| B-18 | O Claude escreve um `.md` nos anexos da Spec A ou em `/tmp` com skill ativa | Não vira artefato: está fora do clone | REQ-048 |
| B-19 | O Claude termina a vez e logo encerra a sessão | Cada conteúdo vira no máximo uma versão (sem duplicar) | REQ-043 |
| B-20 | O conteúdo volta a ser igual ao de uma versão antiga | Vira uma versão nova, porque é diferente da anterior | 7.8 |
| B-21 | A pessoa troca o vínculo local para outra pasta | Os artefatos guardados continuam; as sessões novas usam o novo clone | REQ-047 |

## 9. Comportamento que não muda

- QUANDO uma sessão mudar de estado ou um artefato for guardado, o sistema DEVE CONTINUAR A manter o status do planejamento, da tarefa, da fila e do quadro como estão.
- O sistema DEVE CONTINUAR A não escrever no GitHub nem no clone; a captura só lê arquivos.
- QUANDO o Issue Author ou o Planejamento rodarem, o sistema DEVE CONTINUAR A usar a configuração isolada de hoje, sem hooks.
- QUANDO a Spec A abrir uma sessão, o prompt, os anexos e as skills DEVEM CONTINUAR como a Spec A define; esta spec só acrescenta os hooks ao comando.

## 10. Requisitos não funcionais

- **NFR-02** (segurança): cada sessão DEVE ter um segredo próprio, que só ela conhece e que deixa de valer quando ela chega a um estado final; o servidor guarda só o hash.
- **NFR-03** (confiabilidade): falha ou lentidão no recebimento de eventos NÃO DEVE bloquear nem atrasar o Claude por mais de 5 s por evento. O recebimento DEVE responder em até 200 ms no p95 local e aceitar corpos de até 5 MB.
- **NFR-04** (privacidade): no banco ficam só os dados da REQ-018, já cortados nos limites da seção 7.5, os metadados dos anexos (REQ-034) e o conteúdo dos artefatos (US-05). Só quem pode ver a tarefa vê esses dados.
- **NFR-07** (desempenho): a captura de artefatos NÃO DEVE atrasar a resposta ao hook. O artefato DEVE aparecer na tarefa em até 5 s depois de o Claude terminar a vez, com até 20 arquivos tocados.
- **NFR-08** (acessibilidade): as mudanças de estado da etapa são anunciadas numa região `aria-live="polite"`. A lista de artefatos e o seletor de versão funcionam pelo teclado, e o conteúdo renderizado mantém a hierarquia de títulos.
- **NFR-09** (segurança): o Markdown dos artefatos é exibido com o HTML cru escapado, para que nenhum script do arquivo rode na página.

## 11. Premissas e dependências

- **P-07:** o Claude Code 2.1.329 dispara hooks `type: "http"` para SessionStart, UserPromptSubmit, PostToolUse (incluindo a ferramenta Skill), Stop, Notification e SessionEnd, com `onFailure` (exige 2.1.295 ou mais); confirmar no V-15.
- **P-08:** as features futuras (gerar tarefas, revisar e aprovar, contexto para a próxima sessão, conformidade, mapa do projeto) precisam de: conteúdo completo, versões, skill de origem, tarefa, sessão e caminho. Nada além disso foi pedido.
- **Dependência:** Spec A implementada (sessão, pasta da sessão, lançador, `checkout_path`).

---

# Parte 2 — Técnica

## 12. Visão geral da solução

O lançador da Spec A passa a gerar um token por sessão e a escrever `<sessão>/privado/settings.json` (`0600`, fora do `contexto/` que o Claude lê) com hooks HTTP. O comando ganha `--settings <sessão>/privado/settings.json`.

Cada hook faz POST em `/api/terminal-sessions/events`. O route handler:
1. resolve a sessão pelo hash do token;
2. resume o payload em `{kind, summary, path?, skill?}`;
3. grava o evento com a skill ativa naquele momento e aplica a máquina de estados;
4. responde `204`.

No `Stop` e no `SessionEnd`, ele agenda com `after()` a captura dos artefatos. A captura busca os `file_edit` com skill desde a última captura, lê cada `.md` do clone (`checkout_path` da sessão), compara o `sha256` com a última versão e grava uma nova se o conteúdo mudou.

A tela já faz polling de `tasks.byId`; o detalhe passa a trazer `execution`, e o intervalo cai para 3 s enquanto houver uma sessão ativa.

## 13. Componentes e responsabilidades

| Componente | Responsabilidade | Local | Novo/Alterado |
|---|---|---|---|
| `ExecutionStage` | Etapa, eventos, histórico e anexos (US-03) | `apps/web/src/features/issues/assigned-work/components/`; `PlanningTimeline.tsx`, `planningCopy.ts`, `workState.ts` | Novo / Alterado |
| `ArtifactList` + `ArtifactViewer` | Lista, seletor de versão, Markdown com `marked` (já é dependência de `apps/web`) e HTML escapado (US-05) | mesma pasta | Novo |
| Route handler de eventos | Autentica pelo token, entrega ao controller, agenda a captura com `after()` | `apps/web/src/app/api/terminal-sessions/events/route.ts` | Novo |
| `TerminalEventController` | Ingestão, estado e captura | `packages/api/src/controllers/` | Novo |
| `TerminalSessionStateMachine` | Seção 7.2, função pura | `packages/api/src/application/services/terminal/` | Novo |
| `HookEventSummarizer` | REQ-018/019 e detecção de skill (7.8), função pura | mesma pasta | Novo |
| `ArtifactCaptureService` | REQ-042–046, caminhos e versões | mesma pasta | Novo |
| `CheckoutFileReader` | Lê arquivos do clone com `realpath`, limite de 1 MB | `packages/api/src/infra/terminal/` | Novo |
| `ClaudeSessionSettingsWriter` | Token e `privado/settings.json` | mesma pasta | Novo |
| `GnomeTerminalLauncher` (Spec A) | Acrescenta `--settings` | mesma pasta | Alterado |
| `TerminalSessionController.open` (Spec A) | REQ-014: `allowAdditional` e `session_already_active` | `packages/api/src/controllers/` | Alterado |
| Expurgo de exclusão | REQ-049 | `infra/database/dao/issue-deletion/deletionPurge.ts` | Alterado |
| Routers | `execution` em `tasks.byId`; `tasks.artifacts.list/get` | `packages/api/src/routers/` | Alterado |

## 14. Modelo de dados

Migration `0047_terminal_tracking_artifacts.sql` com rollback `0047_terminal_tracking_artifacts_rollback.sql`.

- **`task_terminal_sessions`** (colunas novas):
  - `status` text, com check em `opening`, `running`, `waiting`, `unconfirmed`, `ended` e `launch_failed`; o default `opening` cobre as linhas da Spec A, e as que têm `launch_failed` registrado migram para esse estado;
  - `token_hash` text unique null;
  - `claude_session_id`, `end_reason`, `active_skill` text null;
  - `dropped_events` int default 0;
  - `started_at`, `ended_at`, `last_capture_at` null.

  `last_signal_at`, da Spec A, passa a ser atualizado a cada evento.
- **`task_terminal_events`**: `id` uuid, `session_id` FK (cascade), `kind` text (check: `started`, `prompt`, `skill`, `file_edit`, `command`, `waiting`, `attention`, `ended`), `summary` text (≤ 500), `path` text null, `skill` text null, `occurred_at`. Índices (`session_id`, `occurred_at`) e (`session_id`, `kind`, `occurred_at`).
- **`task_artifacts`**: `id` uuid, `task_id` FK (cascade), `project_id`, `relative_path` text, `latest_version` int, `last_failure` text null, `created_at`, `updated_at`. Unique (`task_id`, `relative_path`).
- **`task_artifact_versions`**: `id` uuid, `artifact_id` FK (cascade), `version` int, `skill` text, `session_id` FK (set null), `content` text, `sha256`, `byte_size` int (≤ 1 MB), `captured_at`, `trigger` text (check: `stop`, `session_end`). Unique (`artifact_id`, `version`).

**Dados existentes:** sessões abertas antes desta spec ficam `opening` sem token e nunca recebem eventos. Elas aparecem como "Não confirmada" na primeira leitura, o que é correto.

## 15. Interfaces e contratos

```ts
// alteração no open da Spec A (REQ-014)
tasks.terminal.open({ ..., allowAdditional: boolean }) // novo erro: session_already_active
tasks.byId → + execution: { sessions: Array<{ id; status; route; userName; openedAt; endedAt; lastEventAt;
  silentSince: string | null; droppedEvents; hiddenEvents: number;
  events: Array<{ kind; summary; occurredAt }>;
  attachments: Array<{ name; contentType; byteSize; availableUntil: string | null; removed: boolean }> }>;
  artifacts: Array<{ id; path; skill: string | null; versions: number; updatedAt; lastFailure: string | null }> }
tasks.artifacts.list({ projectId, taskId }) → Array<{ id; path; versions: Array<{ version; skill; sessionId: string | null; capturedAt; byteSize }> }>
tasks.artifacts.get({ projectId, taskId, artifactId, version?: number }) → { path; version; skill; sessionId: string | null; capturedAt; content: string }
```

As inputs de `tasks.artifacts.*` levam `projectId` e `taskId`, como as demais procedures `tasks.*` (desvio consciente da versão anterior da §15, que só trazia `taskId` e `artifactId`). `artifactId` de outra tarefa e versão inexistente respondem `NOT_FOUND` (`artifact_unavailable`).

**Endpoint de eventos:** `POST /api/terminal-sessions/events`, `Authorization: Bearer <token>`. Do JSON do hook, o handler usa: `hook_event_name`, `session_id`, `prompt`, `tool_name`, `tool_input.file_path`, `tool_input.command`, `tool_input.skill`, `message` e `reason`. Respostas:
- `204` sem corpo quando o token vale, inclusive para evento descartado;
- `401` quando não vale;
- `413` acima de 5 MB, contado em `dropped_events`.

Nunca devolve JSON de decisão, para não interferir no Claude. O corpo traz também campos que o handler não lê: `tool_response` (conteúdo e saída) e `last_assistant_message`.

**Settings** (formato confirmado no V-15 com o Claude Code 2.1.330; ver [v15-spike.md](v15-spike.md)). O `SessionStart` é aceito mas não entregue em hooks `http`, e o `SessionEnd` com `reason: "clear"` não encerra a sessão:

```json
{ "hooks": {
  "SessionStart":     [{ "hooks": [H] }],
  "UserPromptSubmit": [{ "hooks": [H] }],
  "PostToolUse":      [{ "matcher": "Write|Edit|MultiEdit|NotebookEdit|Bash|Skill", "hooks": [H] }],
  "Stop":             [{ "hooks": [H] }],
  "Notification":     [{ "hooks": [H] }],
  "SessionEnd":       [{ "hooks": [H] }] } }
// H = { "type": "http", "url": "<BETTER_AUTH_URL>/api/terminal-sessions/events",
//       "headers": { "Authorization": "Bearer <token>" }, "timeout": 5, "onFailure": "continue" }
```

## 16. Fluxos principais

**Receber evento (REQ-016–022, REQ-026, REQ-041)**
1. O handler lê o header, calcula o hash e busca a sessão. Sem sessão: `401`. Sessão em estado final: `204` sem gravar (B-06).
2. Lê o corpo até 5 MB; o summarizer produz o evento ou nada (ferramenta fora do filtro). Um `UserPromptSubmit` que começa com `/<skill>` ou um `PostToolUse` da ferramenta Skill vira o evento `skill` e define `active_skill`.
3. Numa transação com `SELECT … FOR UPDATE` na sessão:
   - insere o evento, com `skill = active_skill` se for `file_edit`;
   - aplica a máquina de estados;
   - atualiza `last_signal_at` e, no `started`, `claude_session_id` e `started_at`.
4. No `Stop`, limpa `active_skill` depois de gravar. No `SessionEnd`, apaga `privado/settings.json`. Nos dois, agenda a captura com `after()` e responde `204`.

**Capturar artefatos (REQ-042–046)**
1. Com a sessão travada, lista os `path` distintos de `file_edit` com `skill` não nula e `occurred_at > last_capture_at`, que terminam em `.md`.
2. Para cada caminho, o `CheckoutFileReader` resolve o `realpath`, exige que fique dentro de `checkout_path`, confere o limite de 1 MB e lê o conteúdo em UTF-8.
3. Faz o upsert de `task_artifacts` pelo caminho relativo. Se o `sha256` difere da última versão, insere `version = latest + 1` com a skill do último `file_edit` daquele caminho; se não, nada. Em caso de falha, grava `last_failure` (REQ-046).
4. Atualiza `last_capture_at`. A trava e a comparação de `sha256` tornam o `Stop` seguido de `SessionEnd` idempotente (B-19).

## 17. Decisões técnicas

### DEC-02 — Acompanhamento por hooks HTTP injetados com `--settings`
- **Decisão:** a sessão recebe, só para ela, hooks `type: "http"` que fazem POST no Flow Dev.
- **Alternativas consideradas:** seguir o transcript JSONL em `~/.claude/projects`, que é um formato interno, exige um processo vigiando arquivos e quebra entre versões; um wrapper com pty capturando a saída, que é frágil e capturaria a saída inteira (contra REQ-019).
- **Consequências:** os eventos são oficiais e tipados, e as configurações da pessoa continuam valendo, porque `--settings` soma uma camada.

### DEC-03 — Eventos num route handler do Next
- **Decisão:** `/api/terminal-sessions/events` em `apps/web`, com a URL tirada de `BETTER_AUTH_URL`.
- **Alternativas consideradas:** um endpoint loopback no worker, como `contextMcpEndpoint`, cuja porta efêmera muda a cada reinício e deixaria a sessão sem destino.
- **Consequências:** a URL é estável durante sessões longas; não é tRPC porque o corpo é o JSON cru do Claude, como já acontece com `task-images`.

### DEC-04 — Token literal num arquivo `0600` fora do `contexto/`
- **Decisão:** o token vai escrito no header dentro de `privado/settings.json`, legível só pelo dono e fora do diretório que a sessão recebe com `--add-dir`.
- **Alternativas consideradas:** uma variável de ambiente com `allowedEnvVars`, que o `gnome-terminal-server` pode não herdar; o JSON inline em `--settings`, que deixaria o token visível no `ps`.
- **Consequências:** o arquivo é apagado no `SessionEnd`, e os que sobram somem com a pasta da sessão (limpeza de 7 dias da Spec A).

### DEC-07 — Estado gravado na sessão, "sem sinal" calculado na leitura
- **Decisão:** a máquina de estados roda na ingestão. "Não confirmada" é gravado por uma transição condicional na leitura (sessão `opening` há 60 s), e "sem sinal" é só calculado.
- **Alternativas consideradas:** um job periódico, que seria mais uma peça para rodar e monitorar.
- **Consequências:** "Não confirmada" só aparece quando alguém olha a tarefa, o que basta.

### DEC-08 — Polling existente a 3 s
- **Decisão:** um `TERMINAL_POLL_MS = 3_000` em `workState.ts` enquanto houver uma sessão ativa.
- **Alternativas consideradas:** SSE ou WebSocket, com infraestrutura nova para um único caso.
- **Consequências:** cumpre REQ-020 e NFR-07 (≤ 5 s) com um padrão que já existe.

### DEC-12 — Artefato atribuído à skill ativa, a partir dos eventos
- **Decisão:** a skill ativa é detectada pelo `/<skill>` no prompt e pelo `PostToolUse` da ferramenta Skill, e os `.md` editados enquanto ela está ativa viram artefatos dela.
- **Alternativas consideradas:**
  - cada skill declarar no frontmatter os caminhos que produz: mais preciso, mas exige editar as skills, e um caminho errado silencia a captura;
  - um padrão fixo de pastas (`docs/specs/**`), que pegaria Markdown escrito fora de skill e erraria em repositórios com outra convenção;
  - o Claude entregar o artefato por uma ferramenta MCP, que depende de ele lembrar de chamá-la.
- **Consequências:** as skills ficam como estão; a precisão depende de o evento da ferramenta Skill chegar (V-15) e de uma skill por vez (B-17).

### DEC-13 — Conteúdo versionado no Postgres
- **Decisão:** cada versão guarda o texto completo em `task_artifact_versions.content`.
- **Alternativas consideradas:** guardar em disco, como os anexos, o que não tem backup, não dá para consultar e some com a máquina; guardar só o commit ou ref do git, já que o Claude muitas vezes não commita e o clone pode mudar.
- **Consequências:** as features futuras consultam por SQL ou pelo contrato da REQ-050; o volume é pequeno (Markdown até 1 MB por versão) e entra no backup do banco.

### DEC-14 — Captura no fim da vez, depois de responder ao hook
- **Decisão:** a captura roda no `Stop` e no `SessionEnd`, agendada com `after()` do Next (documentado para route handlers em `next/dist/docs/01-app/03-api-reference/04-functions/after.md`).
- **Alternativas consideradas:** capturar a cada `file_edit`, o que geraria versões intermediárias de cada edição parcial e mais escrita; capturar só no `SessionEnd`, o que perderia tudo quando a janela fecha sem o sinal de fim.
- **Consequências:** uma versão por vez do Claude; nenhum atraso no hook (NFR-03, NFR-07).

## 18. Segurança, privacidade e permissões

- **Autorização:**
  - leitura da tarefa em `tasks.byId` e `tasks.artifacts.*`;
  - operadora no `open`;
  - o token é a única credencial do endpoint de eventos.
- **Token:** 32 bytes aleatórios; só o SHA-256 vai para o banco; vale enquanto a sessão não chega a um estado final.
- **Leitura de arquivos do clone:**
  - só caminhos vindos de eventos da própria sessão;
  - `realpath` dentro de `checkout_path`, gravado na abertura e não na requisição;
  - só `.md` e até 1 MB.

  Um payload forjado precisaria do token.
- **Conteúdo dos artefatos:** pode ter dados sensíveis do projeto e é visível a quem vê a tarefa, como a própria Issue.
- **Renderização:** o HTML cru é escapado (NFR-09).

## 19. Observabilidade

Logs com o prefixo `[terminal]`:
- token recusado (sem o token);
- evento descartado por tamanho;
- captura (sessão, quantos arquivos, quantas versões novas, falhas com o motivo, sem o conteúdo).

`dropped_events` e `last_failure` aparecem na tela.

## 20. Migração, rollout e reversão

**Ordem:** primeiro a Spec A no ar. Depois a migration 0047, o lançador com `--settings`, o route handler e por fim a UI.

**Rollback:**
- apaga as colunas novas e as três tabelas novas, perdendo eventos e artefatos;
- as sessões em andamento continuam no terminal, e os hooks passam a receber `401` sem travar o Claude (NFR-03).

Antes de reverter em uso real, exporte `task_artifact_versions`, porque elas são a base das features futuras.

## 21. Riscos técnicos

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| Os hooks não disparam ou o payload difere (ex.: `SessionEnd` ao fechar a janela) | média | médio | V-15 registra os payloads reais; summarizer tolerante a campos ausentes; B-05 |
| A ferramenta Skill não gera `PostToolUse`, ou o nome da skill não vem em `tool_input.skill` | média | alto | V-15 primeiro; plano B: `PreToolUse` com o mesmo matcher, ou detecção só pelo `/<skill>` no prompt |
| `onFailure` não respeitado faz uma falha de hook bloquear | baixa | alto | P-07; V-15 testa com o Flow Dev desligado |
| `after()` não roda quando o servidor reinicia no meio da captura | baixa | baixo | o próximo `Stop` captura tudo desde `last_capture_at` |
| Artefato atribuído à skill errada | baixa | médio | B-17; o evento `skill` fica visível na lista |

---

# Parte 3 — Verificação

## 22. Estratégia de testes

- **Unitários (Vitest):** máquina de estados, summarizer (com os payloads reais capturados no V-15 como fixtures), detecção de skill, montagem do settings. Funções puras.
- **Integração (`packages/api test:integration`):**
  - ingestão e captura com o Postgres descartável e um clone temporário criado no teste;
  - `CheckoutFileReader` contra links simbólicos e arquivos grandes reais.
- **Route handler:** teste do `route.ts` com o controller ligado ao banco de teste, incluindo `after()`.
- **Componentes (RTL):** `ExecutionStage`, `ArtifactList` e `ArtifactViewer`.
- **E2E (Playwright):** sobre o spec e2e da Spec A, os eventos são simulados com POSTs usando o token guardado pelo lançador falso, e o teste escreve arquivos `.md` no clone temporário.
- **Smoke manual:** V-15 e V-19 com o Claude real.

## 23. Matriz de verificação

| ID | Cobre | Componente | Nível(is) | Casos (resumo) |
|---|---|---|---|---|
| V-15 | DEC-02, DEC-04, DEC-12, P-07 | spike manual | smoke | hooks com Bearer chegam; payload de cada evento salvo como fixture; a ferramenta Skill gera evento com o nome; `/spec-writer` no prompt aparece em `UserPromptSubmit`; Flow Dev desligado não trava o Claude; `SessionEnd` ao fechar a janela |
| V-05 | REQ-017, 7.2, REQ-021, B-06, B-11 | máquina de estados | unidade | todas as transições; estados finais; Abrindo → Não confirmada aos 60 s; sinal atrasado → Em andamento; `launch_failed` |
| V-06 | REQ-018, REQ-019, REQ-041, 7.8 (skill ativa), NFR-04 | `HookEventSummarizer` | unidade | um caso por evento; cortes de 500 e 200; sem saída nem conteúdo; ferramenta fora do filtro ignorada; `/skill` e ferramenta Skill viram evento `skill` |
| V-07 | REQ-026, NFR-02, NFR-03, B-07, B-10 | route handler de eventos | integração | token inválido 401; estado final 204 sem gravar; corpo > 5 MB 413 e `dropped_events`; resposta sem corpo; settings `0600` fora de `contexto/` e apagado no fim |
| V-08 | US-03 (1–4), REQ-014, REQ-016, REQ-020, REQ-022–024, REQ-034, B-05, NFR-08 | `ExecutionStage` + `workState` + `open` | componente + integração | rótulos de estado; "Sem sinal desde"; histórico expandível com anexos; leitura sem ações; polling a 3 s com sessão ativa; aria-live; segunda abertura pede confirmação |
| V-16 | REQ-042, REQ-044, REQ-048, 7.8, B-17, B-18, B-20 | `ArtifactCaptureService` (atribuição) | unidade + integração | `.md` com skill vira artefato; sem skill não vira; `.ts` não vira; fora do clone e link simbólico para fora não viram; duas skills na mesma vez; mesmo caminho em duas sessões acumula versões; conteúdo antigo repetido vira versão nova |
| V-17 | REQ-043, REQ-046, REQ-047, NFR-07, B-19, B-21, DEC-14 | captura + `CheckoutFileReader` | integração | versão só se mudou; `Stop` + `SessionEnd` sem duplicar; > 1 MB, apagado e ilegível gravam `last_failure`; captura depois do 204; 20 arquivos em até 5 s; troca de vínculo mantém artefatos |
| V-18 | US-05 (1–2), REQ-045, NFR-08, NFR-09 | `ArtifactList` + `ArtifactViewer` | componente | lista com skill, versões e horário; Markdown renderizado; `<script>` escapado; seletor de versão pelo teclado; motivo de falha visível |
| V-19 | US-03 e US-05 ponta a ponta | fluxo completo | e2e + smoke | abre (Spec A), simula início, `/spec-writer`, edição de `docs/specs/x/spec.md` e `Stop`: etapa "Aguardando você" e artefato v1 em até 5 s; nova edição e `Stop` gera v2; smoke real com a spec-writer de verdade |
| V-20 | REQ-049, REQ-050, seção 9 | expurgo + `tasks.artifacts.*` | integração | excluir a Issue apaga eventos, artefatos e versões; `list` e `get` com e sem versão; leitura sem permissão recusada; status do planejamento inalterado; agentes de planejamento sem hooks |

## 24. Definição de pronto

- Spec A concluída.
- V-15 executado e o resultado registrado em `docs/specs/acompanhamento-e-artefatos/v15-spike.md`, com a §15 ajustada.
- `pnpm --dir packages/api test` e `pnpm --dir packages/api test:integration` passando.
- `pnpm --dir apps/web test` e o spec e2e (`pnpm --dir apps/web test:e2e <spec>`) passando.
- `pnpm typecheck`, `pnpm lint` e `pnpm build` (rota nova) passando.
- Smoke V-19 real feito uma vez.

---

## Questões em aberto

Nenhuma.

## Sugestões fora do escopo

- Comparar duas versões (diff) no visualizador: ajuda a revisar o que mudou entre as vezes do Claude.
- Baixar o artefato como `.md`.
- Registrar o hash da skill que produziu cada versão (ver a sugestão da Spec A): útil para a futura feature de mapa do projeto e para avaliar as skills.

## Histórico

- 2026-11-22 — Criação, a partir da divisão da Spec A. Vieram US-03, REQ-014, REQ-016–024, REQ-026, REQ-034, 7.2, NFR-02–04, DEC-02–04, DEC-07, DEC-08, B-05–07, B-10, B-11 e V-05–V-08, com os mesmos IDs. Novos: US-05 (artefatos produzidos pelas skills e guardados no Flow Dev com versões, a pedido do usuário), REQ-041–050, 7.8, NFR-07–09, P-07, P-08, DEC-12–14, B-17–21 e V-15–V-20. Estado `launch_failed` acrescentado à 7.2.
- 2026-11-22 — V-15 executado (Claude Code 2.1.330): `SessionStart` não chega por hook `http`, então o `started` é gravado no primeiro evento; `SessionEnd` com `reason: "clear"` não encerra a sessão; `Notification` não foi observado; a ferramenta Skill chega por `PostToolUse` com `tool_input.skill` namespaced.
- 2026-11-22 — Implementada. Premissas aprovadas com o plano e conferidas na implementação:
  - **P-A:** `/flow-dev:spec-writer`, `/spec-writer` e `tool_input.skill` namespaced gravam a skill como `spec-writer`.
  - **P-B:** um prompt que começa com `/skill` gera `prompt` e depois `skill`; comandos embutidos (`exit`, `quit`, `clear`, `compact`, `help`, `resume`, `model`, `config`, `status`) não viram skill (e `/exit` e `/clear` nem chegam ao `UserPromptSubmit`, V-15c).
  - **P-C:** `summary` guarda o valor cru; a tela acrescenta o verbo ("Editou …", "Rodou: …").
  - **P-D:** `file_edit` fora do clone guarda o caminho absoluto, e a captura o ignora (B-18).
  - **P-E:** `last_failure` guarda a mensagem da REQ-046 e é limpo na próxima captura bem-sucedida; um arquivo que falha antes de existir versão cria o artefato com `latest_version = 0`.
  - **P-F:** os artefatos ficam numa seção "Artefatos" dentro da aba "Execução no terminal".
  - **P-G:** o e2e V-19a/b está escrito e completo, mas fica `test.fixme` com a anotação `feature-gate` do V-10a (a tela do trabalho exige GitHub e quadro controlados); o V-19c cobre o fluxo. **Pendente:** o V-19c rodou em modo `-p`, sem a tela do navegador, o GNOME Terminal nem o `/exit` interativo; a prova do fluxo visível (etapa "Aguardando você", artefato renderizado, seletor de versão, "Encerrada" com horário) ainda não existe.
  - **P-H:** os testes da migration usam `MIG-a` a `MIG-f`.
  - **P-I:** as inputs de `tasks.artifacts.*` levam `projectId` e `taskId` (§15).
  - **P-J:** quem só lê vê "Aguardando a pessoa operadora".
  - **P-K:** "Não confirmada" é gravada por `tasks.byId` antes do `snapshot`, que é só de leitura.
- 2026-11-22 — Decisões tomadas na implementação, a partir do V-15 ([v15-spike.md](v15-spike.md)):
  - o `started` é gravado no primeiro evento da sessão, porque o `SessionStart` não chega por hook `http`;
  - o `SessionEnd` com `reason: "clear"` só dispara a captura, sem encerrar a sessão nem apagar o `settings.json`;
  - JSON inválido com token válido responde `204` sem gravar;
  - `last_capture_at` guarda a marca d'água do maior `occurred_at` capturado, e a ingestão toma o horário dentro da trava da sessão, para que nenhum evento fique para trás de uma captura;
  - o erro `artifact_unavailable` (NOT_FOUND) cobre artefato ou versão inexistente.
- 2026-11-22 — Revisão final (review-001): `Smoke V-19` na tela marcado como pendente (P-G); linha do tempo passa a respeitar o modo leitura (P-J); `summary` dos eventos é cortado em 500 em todos os tipos; sessão em estado final recebe `204` antes da leitura do corpo; a expiração de "Não confirmada" filtra pelo projeto; o horário do artefato reflete só a última versão.
