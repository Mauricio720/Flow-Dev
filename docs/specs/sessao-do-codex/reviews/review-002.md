# Revisão parcial de conformidade 002 — Sessão do Codex

> **Data:** 2026-11-24 · **Escopo:** parcial, tarefas 01–06, após as correções da review-001 (alterações não commitadas, arquivos modificados depois de `reviews/review-001.md`). A tarefa 07 continua `in_progress` (0/4) e ficou de fora por pedido explícito do usuário nesta sessão.
> **Spec:** `docs/specs/sessao-do-codex/spec.md`, com ownership de `_tasks.md` · **Regras lidas:** `AGENTS.md`, `CLAUDE.md`, `.claude/rules/code-standards.md`, `.claude/rules/e2e-testing.md`, guia de revisão de `software-testing`, referências de `spec-conformance`.

## Veredito parcial: REPROVADO

As correções resolveram os seis bloqueantes e quatro dos cinco importantes da review-001, com evidência no código, nos testes e no schema da CLI 0.159.3. A suíte de integração, porém, falhou nesta revisão: a nova barreira de encerramento (B-6) deixou o V-49a sujeito a corrida sob carga. Ainda faltam os tipos gerados do protocolo, há um arquivo novo acima de 100 linhas e duas correções não têm prova automatizada da composição.

| Bloqueante | Importante | Menor | Spec a discutir |
|---|---|---|---|
| 1 | 4 | 3 | 2 |

Esta revisão escreveu só este relatório e uma linha em "Revisão final" de `_tasks.md`. Nenhum código, spec ou status de tarefa foi alterado.

## Verificação executada

Os comandos rodaram em sequência, não ao mesmo tempo, sem `TEST_DATABASE_URL`.

| Comando | Saída | Resultado |
|---|---|---|
| `python3 -I .claude/skills/spec-to-tasks/scripts/tasks_status.py docs/specs/sessao-do-codex` | 01–06 completed; 07 in_progress 0/4; 28/32 mini-tarefas | — |
| `python3 -I .claude/skills/spec-conformance/scripts/scan_diff.py --repo . --worktree --max-lines 100` | 461 arquivos (inclui Specs C/D). Nos arquivos das correções: `agentSdkSession.ts` 105 linhas; `mock-in-source` em `codexProcess.ts:7` (já aceito na review-001, restrito a `NODE_ENV=test`) | — |
| `pnpm --dir packages/api test` | exit 0 · 127 arquivos, 799 testes passaram | ✅ |
| `pnpm --dir packages/api test:integration` | exit 1 · 154 arquivos passaram, 1 falhou, 2 skipped; 760 passaram, 1 falhou, 5 skipped. `codex-runtime-start.test.ts:58`: log `codex_turn_started` ausente | ❌ |
| `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/codex-runtime-start.test.ts` ×8 | 8 de 8 execuções isoladas com 3/3 passando | intermitente |
| `pnpm --dir apps/web test` | exit 0 · 101 arquivos, 520 testes passaram | ✅ |
| `pnpm --dir packages/api run typecheck` | exit 0 · `tsc --noEmit` sem erros | ✅ |
| `pnpm --dir apps/web run typecheck` | exit 0 · typegen + `tsc --noEmit` sem erros | ✅ |
| `pnpm lint` | exit 0 · ESLint web; a API não tem script de lint | ✅ |
| `codex app-server generate-json-schema --experimental --out <scratchpad>` | exit 0 · inspecionados `PermissionsRequestApprovalResponse`, `PermissionsRequestApprovalParams`, `FileChangeRequestApprovalParams`, `ItemStartedNotification` | — |
| Probe Python com `codex app-server` real, `CODEX_HOME` temporário, sem nenhuma vez executada: `thread/start` → SIGKILL → `thread/resume` num processo novo | `ephemeral=false` e `ephemeral=true` deram o mesmo resultado: `-32600 no rollout found`. O rollout só existe depois da primeira vez, então o probe não distingue os dois casos (ver S-1) | inconclusivo |

Build, Playwright, latência específica do Codex e o smoke V-52 continuam fora deste gate parcial. Os skips não contam como prova.

## Situação dos achados da review-001

| Achado | Estado | Evidência |
|---|---|---|
| B-1 · login em stderr | ✅ Corrigido | `codexCatalogTransport.ts:33-44` lê stdout e stderr; `codex-catalog-transport.test.ts:21` usa um binário falso que escreve `Logged in using ChatGPT` em stderr e chama o `loginStatus` real. Lacuna menor em M-1 |
| B-2 · resposta por texto | ✅ Corrigido | `questionAnswerModel.ts:8` `questionKey = question.id ?? question.question`, usado no estado, no payload e no resumo; é a mesma chave da API (`questionAnswerValidation.ts:18`). `QuestionRequestCard.test.tsx:15` cobre dois IDs com o mesmo texto; `:52` cobre o segredo com ID próprio |
| B-3 · thread efêmera | ✅ Código / 🟡 prova | `codexThreadOptions.ts:17` `ephemeral: false`, como no spike (`probe_initialize.py:207/213`). `codex-runtime-start.test.ts:64` exige `false`. O V-49f (`codex-runtime-recovery.test.ts:40`) continua retomando uma thread inventada. A prova real exige uma vez com inferência (S-1) |
| B-4 · diff do pedido de arquivo | ✅ Corrigido | `codexSessionRequestBridge.ts:11-28` guarda os `changes` do item por `itemId` e os acrescenta ao pedido antes da tradução e da aceitação automática. O schema confirma: o pedido não traz `changes`; o `fileChange` de `item/started` exige `id` e `changes`. `codex-runtime-requests.test.ts:27/67` envia `item/started` e depois o pedido sem `changes`, e o diff chega com o caminho. Lacunas em M-1 e M-2 |
| B-5 · resposta de permissão extra | ✅ Corrigido | `codexSessionRequests.ts:25-29` devolve `{ permissions, scope: "turn" }`. No schema, `GrantedPermissionProfile` e `RequestPermissionProfile` têm os mesmos campos (`fileSystem`, `network`), `scope` aceita `turn`/`session` e só `permissions` é obrigatório. Permitir, recusar e bypass estão cobertos em `codex-runtime-requests.test.ts:68` e `codexSessionRequests.test.ts:12` |
| B-6 · close durante a abertura | ✅ Código / 🟡 prova | Barreiras em `codexSession.ts:39/51/58/61`; `close` espera `startup` (`:31`). Só o probe e o spawn retidos têm teste (I-4), e a barreira de `:61` causou o B-1 desta revisão |
| I-1 · motivo da recusa | ✅ Corrigido | `codexApprovalResult.ts:5-7` responde só `decline`; o motivo vai uma vez para a vez seguinte (`codexSession.ts:25/73-75`). `codex-runtime-requests.test.ts:73-92` prova que o motivo entra na segunda vez e não na terceira, e que a resposta RPC é `{ decision: "decline" }` |
| I-2 · UTF-8 fragmentado | ✅ Corrigido | `codexRpcFrames.ts:5/9/21` usa `StringDecoder`; `codexRpcFrames.test.ts:7` corta dentro do `ç`, junta frames e testa o EOF |
| I-3 · `thread/unsubscribe` | ✅ Corrigido | `codexSessionControls.ts:19-25` é chamado antes de parar o processo (`codexSession.ts:29-30`); `codex-runtime-start.test.ts:62` verifica a ordem `turn/start` → `thread/unsubscribe`. O caminho de erro não tem teste (M-1) |
| I-4 · limites de código | 🔀 Parcial | Os dois testes estão em 93 e 73 linhas; as notificações recebem um objeto. Houve uma violação nova e uma compactação (I-1) |
| I-5 · `agent_version` do Claude | 🟡 | `agentSdkSession.ts:68-71` chama `onAgentInfo` no `init`, mas não há teste da composição (I-3) |

## Conformidade com a spec (itens tocados pelas correções)

Os itens que nenhuma correção tocou mantêm o estado e a evidência da review-001, cujos arquivos não foram alterados: REQ-111, 113, 115, 116, 119, 123, 126, 127, NFR-20, §15, §18, §19, US-19 e B-44 a B-49.

| Item | Status | Evidência |
|---|---|---|
| REQ-112 · disponibilidade | ✅ | B-1 corrigido; `loginStatus` real exercitado com stderr |
| REQ-114 · mensagens íntegras | ✅ | I-2 corrigido |
| REQ-117/118 · escolha, Outra e segredo | ✅ | B-2 corrigido; mesma chave na UI e na API |
| REQ-120 · três modos | ✅ | `accept_edits` recebe os `changes` correlacionados antes de `codexApprovalCanAutoAccept` (`codexSessionRequests.ts:14`); sem teste pelo runtime nesse modo (M-1) |
| REQ-121 · recusa com motivo | ✅ | I-1 corrigido e provado |
| REQ-122 · caminhos, tipos e diffs | ✅ | B-4 corrigido |
| REQ-124 · fila, interrupção, encerramento | 🟡 | Unsubscribe e barreiras implementados; barreiras de `thread/start`/`turn/start` sem teste (I-4); V-49a intermitente (B-1) |
| REQ-125 · mesma conversa | 🟡 | Código conforme o spike; prova automatizada simulada; prova real pendente (S-1) |
| §7.16 · permissões extras | ✅ | B-5 corrigido conforme o schema |
| §14 / NFR-21 · `agent_version` | 🟡 | Codex coberto em `codex-service-flow.test.ts:32`; Claude sem teste (I-3) |
| §10 · tipos gerados (`spec.md:232`) | 🔀 | I-2 |
| NFR-19 / DEC-29 · ciclo de vida do processo | 🟡 | Ver REQ-124 |
| DEC-32 · catálogo | ✅ | Login real reconhecido |
| P-18 · resume com thread persistente | ✅ | Opção igual à do spike |
| V-47d/e/f | ✅ | Sequências reais por stdio em `codex-runtime-requests.test.ts` |
| V-49d | 🟡 | I-4 |
| V-49f | 🟡 | Simulado; S-1 |
| V-50d | ✅ | Transporte de login real com binário controlado |
| V-51d/i | ✅ | IDs distintos do texto e repetidos |

## Regras do projeto

| Regra (fonte) | Status | Evidência |
|---|---|---|
| `.ts`/classe até 100 linhas (`code-standards.md`, File Size) | ❌ | I-1: `agentSdkSession.ts` com 105 linhas (100 no HEAD); `codexSession.ts` fica em 98 linhas por compactação |
| Funções até 30 linhas, até 3 parâmetros | ✅ | Funções novas dentro dos limites; `emitCodexNotification`/`handleCodexNotification` recebem objeto |
| Sem números/strings mágicos | 🟡 | M-3 |
| Contratos em application, processo/protocolo em infra (`layered-backend`) | ✅ | Bridge e resposta de permissões em infra; tradutores puros em application |
| Tipos do protocolo gerados na versão mínima (`spec.md:232`) | 🔀 | I-2 |
| Testes com oráculo independente e sem corrida (`software-testing`) | ❌ | B-1 (corrida); I-3/I-4 (composição não provada) |
| Fake só em teste | ✅ | `codexProcess.ts:26` recusa o roteiro fora de `NODE_ENV=test` |

## Achados por tarefa

### B-1 (Bloqueante) · 05.2 / 05.4 — V-49a falha sob carga após a barreira de close

- **Onde:** `packages/api/test/codex-runtime-start.test.ts:53-58` espera o hook `SessionStart` e o registro de `turn/start` no arquivo do servidor falso, e então chama `handle.close()`. Em `codexSession.ts:60-63`, `if (this.closing || this.abandoned) return;` vem antes de `this.deps.log.info("codex_turn_started", …)`.
- **Contra:** verificação exigida por `AGENTS.md` (suíte completa verde) e regra de testes sem dependência de tempo (`software-testing`).
- **Evidência executada:** a integração completa falhou em `:58`. Os logs recebidos foram só `codex_app_server_started` e `codex_app_server_exited`. Isolado, o arquivo passou 8 de 8 vezes.
- **Problema:** o servidor falso grava o pedido antes de responder. Quando o close chega entre esse registro e o processamento da resposta, a nova barreira descarta o log, e a asserção falha. O comportamento do produto é defensável; o oráculo do teste depende de tempo.
- **Correção esperada:** sincronizar o teste com um sinal do runtime (o log `codex_turn_started` ou a resposta de `turn/start` processada) antes de fechar, sem sleeps e sem aumentar timeouts. Se a decisão for registrar a vez mesmo quando o close chega durante o `turn/start`, ajustar o código e cobrir os dois casos.

### I-1 (Importante) · 05.2 / 05.6 — Limite de 100 linhas: violação nova e contorno por compactação

- **Onde:** `packages/api/src/infra/terminal/agentSdkSession.ts` tem 105 linhas; o HEAD tinha 100, e a correção do I-5 (`:22`, `:68-71`) passou do limite. `codexSession.ts:22-26` declara 5, 7 e 4 campos por linha, o construtor com duas instruções e dois métodos (`push` e `interrupt`) na mesma linha; `:35` põe o `abandon` inteiro numa linha.
- **Contra:** `.claude/rules/code-standards.md` (File Size): "Never create classes or `.ts` files with more than 100 lines… split its responsibilities".
- **Problema:** um membro por linha deixaria a classe bem acima de 100 linhas. Na review-001, `close` estava na linha 38; agora está na 27, mesmo com código acrescentado. O limite foi contornado, não atendido.
- **Correção esperada:** extrair responsabilidades. Por exemplo, a coordenação de startup/close de `CodexSession` e a emissão de metadados do `init` em `AgentSdkSession`. Um membro por linha, todo arquivo `.ts` com até 100 linhas, sem remover asserções.

### I-2 (Importante) · 05.1 / 03.4 — Tipos do protocolo continuam escritos à mão

- **Onde:** `packages/api/src/infra/terminal/codex/protocol/codexMethods.ts:6-16`. `PermissionsRequestApprovalResponse` foi escrito à mão (`:10`); `ThreadStartRequest = CodexThreadOptions["start"]` (`:13`) deriva do próprio builder.
- **Contra:** `spec.md:232`, "`codex-protocol.ts` · Tipos gerados por `codex app-server generate-ts` na versão mínima, só os usados"; risco de `spec.md:371`; item 4 do prompt da review-001.
- **Problema:** um tipo derivado do builder nunca detecta um erro do builder. Foi assim que `ephemeral: true` e o `{ decision }` das permissões passaram pela review-001. As respostas atuais batem com o schema, mas nada garante isso numa próxima mudança.
- **Correção esperada:** gerar os tipos usados com `codex app-server generate-ts` na 0.159.3, em infra, tipar requests, respostas e notificações por eles (`ThreadStartParams`, `PermissionsRequestApprovalResponse`, `FileChangeRequestApprovalParams`, `ItemStartedNotification`…) e mapear para os contratos de application.

### I-3 (Importante) · 02.2 / 05.6 — `agent_version` do Claude sem prova da composição

- **Onde:** `agentSdkSession.ts:68-71` chama `onAgentInfo`; o único teste é `agentSdkMessages.test.ts:6`, que verifica o helper `initAgentVersion`.
- **Contra:** `spec.md:245` ("versão do Codex ou do Claude Code na abertura"); prompt da review-001, I-5: "Testar nova sessão Claude com versão preenchida".
- **Contraexemplo:** removendo as linhas 68-71, todas as suítes continuam verdes.
- **Correção esperada:** um teste em que uma sessão Claude nova, com o SDK controlado emitindo `system/init` com `claude_code_version`, grave `agentVersion` pela `SessionHandlerFactory`. Manter o registro legado nulo.

### I-4 (Importante) · 05.4 — Barreiras de `thread/start` e `turn/start` sem teste

- **Onde:** `packages/api/test/codex-runtime-close-start.test.ts:19-40` cobre close com o probe retido e com o spawn retido. As barreiras de `codexSession.ts:58` e `:61` não têm teste. O teste de `:29` chama-se "starts no RPC requests", mas só verifica `terminate` chamado uma vez.
- **Contra:** REQ-124, NFR-19, V-49d; prompt da review-001, B-6: "Testar probe/start/thread/turn retidos com sincronização explícita".
- **Contraexemplo:** removendo as linhas 58 e 61, as suítes continuam verdes, e uma vez pode começar depois do close.
- **Correção esperada:** com o servidor falso segurando `thread/start` e `turn/start` (como `waitForPath`), fechar durante cada um e verificar pelo registro de pedidos que nenhum `turn/start` posterior é enviado, que o grupo termina e que `onExit` chega uma vez, com `ended`.

### M-1 (Menor) · 04.1 / 05.3 / 05.4 / 06.4 — Lacunas de teste nas outras correções

- B-1: falta o caso negativo pelo `loginStatus` real (`Not logged in`, exit ≠ 0). Hoje o `catch` em `codexCatalogTransport.ts:37-40` aceita `Logged in` mesmo com exit ≠ 0.
- B-2: o payload da tela não passa pela `validateQuestionAnswers` real; a ligação foi conferida só por leitura.
- B-4: `codex-runtime-requests.test.ts:63` roda só em `ask_all`, e a resposta de `file-approval` não é verificada. Falta `accept_edits` pelo runtime, com aceitação automática do pedido correlacionado.
- I-3: o caminho de falha ou timeout do `thread/unsubscribe` (`codexSessionControls.ts:21-24`) não tem teste.

### M-2 (Menor) · 05.3 — `changes` guardados sem pedido nunca são liberados

- **Onde:** `codexSessionRequestBridge.ts:7/12` guarda os `changes` de todo item `fileChange`; só `withChanges` (`:26`) apaga.
- **Problema:** em bypass (`approvalPolicy: never`), ou com itens que não pedem aprovação, os diffs ficam na memória até o fim da sessão.
- **Correção esperada:** liberar a entrada em `item/completed` do mesmo item, ou limitar o mapa.

### M-3 (Menor) · 05.3 / 05.1 / 04.1 — Strings mágicas e import fora do lugar

- `codexSession.ts:75`: "O pedido anterior foi recusado pelo operador:" no meio da função; `codexCatalogTransport.ts:44`: literal `"Logged in"`. Extrair para constantes nomeadas (`code-standards.md`, Magic Numbers and Strings).
- `codexRpcFrames.ts:25`: o `import { StringDecoder }` está no fim do arquivo. Mover para o topo.

## Atualizações de spec a discutir

- **S-1 · prova da retomada (REQ-125, P-18, V-52):** na CLI 0.159.3, o rollout de uma thread só aparece depois da primeira vez. Sem inferência, `thread/resume` falha com `ephemeral` true ou false, então o probe da review-001 não distinguia os dois casos. A correção do B-3 se apoia no spike V-45, feito com inferência e `ephemeral=False`. Proposta: o V-52 (tarefa 07) inclui explicitamente "uma vez → morte do app-server → resume com histórico", e o V-49f é descrito como contrato de chamadas, não como prova de persistência.
- **S-2 · detecção de login (§7.13, DEC-32):** `codex login status` não tem saída estruturada nesta versão; a implementação depende do texto em inglês `Logged in` em stdout ou stderr. Vale registrar na spec esse contrato (texto e código de saída) e a versão em que foi conferido, para que uma atualização da CLI tenha onde ser checada.

## Divergências entre o relatório do implementador e a evidência

- Nenhuma entrada de "Registro de execução" foi acrescentada para as correções da review-001: os arquivos de tarefa não mudam desde 15:21, e a review-001 é das 15:45. Não há saída de comandos registrada para conferir; os resultados acima vêm só desta sessão.
- O prompt da review-001 pedia provas para B-3 (start → perda → resume), B-6 (os quatro pontos retidos), I-3 (caminho de erro) e I-5 (nova sessão Claude). Essas provas estão ausentes ou parciais (I-3, I-4, M-1, S-1).

## Prompt de correção

> Corrija a revisão parcial `docs/specs/sessao-do-codex/reviews/review-002.md` nesta ordem, sem concluir nem marcar a tarefa 07 e sem alterar nada fora do listado:
>
> 1. **B-1 · task_05 (05.2/05.4)** — `packages/api/test/codex-runtime-start.test.ts`: antes de `handle.close()`, esperar um sinal do runtime de que a resposta de `turn/start` foi processada (por exemplo, o log `codex_turn_started`), com sincronização explícita; nada de sleep e nada de aumentar timeout. Se a decisão for registrar a vez mesmo quando o close chega durante o `turn/start`, ajustar `codexSession.ts:60-63` e testar os dois casos. Pronto quando a integração completa passa.
> 2. **I-1 · task_05 (05.2) / task_02 (02.2)** — `agentSdkSession.ts` (105 linhas) e `codexSession.ts` (compactado): extrair responsabilidades até cada `.ts` ter no máximo 100 linhas com um membro e uma instrução por linha. Não remover asserções.
> 3. **I-2 · task_05 (05.1) / task_03 (03.4)** — gerar com `codex app-server generate-ts` (0.159.3) os tipos usados, em `packages/api/src/infra/terminal/codex/`, e tipar por eles os requests, respostas e notificações (`ThreadStartParams`, `ThreadResumeParams`, `TurnStartParams`, `PermissionsRequestApprovalResponse`, `FileChangeRequestApprovalParams`, `ItemStartedNotification`, `ThreadUnsubscribeParams`). Remover os tipos derivados do builder (`spec.md:232`).
> 4. **I-3 · task_02 (02.2) / task_05 (05.6)** — teste de sessão Claude nova, com SDK controlado emitindo `system/init` com `claude_code_version`, que grave `agentVersion` pela `SessionHandlerFactory`. Legado continua nulo.
> 5. **I-4 · task_05 (05.4)** — testes de close com `thread/start` retido e com `turn/start` retido, usando o servidor falso com espera por arquivo. Verificar pelo registro de pedidos que nenhum `turn/start` ocorre depois do close, que o grupo termina e que há um único `onExit`, com `ended`. Fazer o teste "starts no RPC requests" verificar o que o nome promete.
> 6. **M-1** — acrescentar: `loginStatus` negativo (`Not logged in`, exit 1) e decidir se exit ≠ 0 pode contar como logado; payload de `QuestionRequestCard` validado por `validateQuestionAnswers`; `accept_edits` pelo runtime com aceitação automática do pedido de arquivo correlacionado e a resposta de `file-approval` verificada; falha/timeout de `thread/unsubscribe` sem impedir o término do grupo.
> 7. **M-2** — `codexSessionRequestBridge.ts`: liberar os `changes` em `item/completed` do mesmo item.
> 8. **M-3** — constantes para "O pedido anterior foi recusado pelo operador:" e `"Logged in"`; mover o import de `StringDecoder` para o topo de `codexRpcFrames.ts`.
>
> Restrições: `.ts` até 100 linhas, funções até 30, até 3 parâmetros, sem comentários, sem strings mágicas, sem novas dependências. Preserve o perfil pessoal, o isolamento dos outros agentes e a exceção `pg_notify`. Registre cada correção no "Registro de execução" da tarefa dona, com a saída dos comandos.
>
> Ao terminar, rode uma vez, em sequência, e registre a saída de:
> `pnpm --dir packages/api test` · `pnpm --dir packages/api test:integration` · `pnpm --dir apps/web test` · `pnpm --dir packages/api run typecheck` · `pnpm --dir apps/web run typecheck` · `pnpm lint`.
> Não defina `TEST_DATABASE_URL`, não aumente timeouts nem reduza workers, e não conte skips como sucesso.
