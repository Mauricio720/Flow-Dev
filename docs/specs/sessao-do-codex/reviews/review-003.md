# Revisão parcial de conformidade 003 — Sessão do Codex

> **Data:** 2026-11-24 · **Escopo:** parcial, tarefas 01–06, depois das correções da review-002, e tudo o que essas correções tocaram (alterações não commitadas, arquivos modificados depois de `reviews/review-002.md`). A tarefa 07 continua `in_progress` (0/4) e fica fora, como nas revisões 001 e 002.
> **Spec:** `docs/specs/sessao-do-codex/spec.md`, com ownership de `_tasks.md` · **Regras lidas:** `AGENTS.md`, `CLAUDE.md`, `.claude/rules/code-standards.md`, guia de revisão de `software-testing`, referências de `spec-conformance`.
> **Independência:** as correções avaliadas aqui foram escritas na mesma sessão que fez esta revisão. Para compensar, cada correção foi conferida com mutação dos testes ou com a CLI real, e não só com leitura.

## Veredito parcial: APROVADO COM RESSALVAS

Os 8 achados da review-002 (1 bloqueante, 4 importantes, 3 menores) foram corrigidos e verificados. As suítes completas, o typecheck e o lint passaram, e a CLI 0.159.3 real aceitou o login, o catálogo, o `initialize` e o `thread/start` gerados pelo código atual. Restam dois achados menores e três pontos de spec. O veredito não aprova a feature: a tarefa 07, incluindo o smoke V-52 e a prova real de retomada, ainda falta.

| Bloqueante | Importante | Menor | Spec a discutir |
|---|---|---|---|
| 0 | 0 | 2 | 3 |

Esta revisão escreveu só este relatório e uma linha em "Revisão final" de `_tasks.md`.

## Verificação executada

Os comandos rodaram em sequência, sem `TEST_DATABASE_URL`.

| Comando | Saída | Resultado |
|---|---|---|
| `python3 -I .claude/skills/spec-to-tasks/scripts/tasks_status.py docs/specs/sessao-do-codex` | 01–06 completed; 07 in_progress 0/4 | — |
| `python3 -I .claude/skills/spec-conformance/scripts/scan_diff.py --repo . --worktree --max-lines 100` | Nenhum arquivo longo, escape de tipo, comentário, placeholder ou timeout aumentado nos arquivos das correções. `mock-in-source` em `codexProcess.ts:7` continua restrito a `NODE_ENV=test` | — |
| `pnpm --dir packages/api test` | exit 0 · 129 arquivos, 804 testes | ✅ |
| `pnpm --dir packages/api test:integration` | exit 0 · 157 arquivos passaram, 2 skipped; 770 testes passaram, 5 skipped. O V-49a, que falhou com carga na review-002, passou na suíte completa | ✅ |
| `pnpm --dir apps/web test` | exit 0 · 101 arquivos, 520 testes | ✅ |
| `pnpm --dir packages/api run typecheck` / `pnpm --dir apps/web run typecheck` | exit 0 / exit 0 | ✅ |
| `pnpm lint` | exit 0 · ESLint web; a API não tem script de lint | ✅ |
| `tsc -p <scratchpad>/tsconfig.scripts.json` (estende `packages/api/tsconfig.json`, inclui `scripts/*.ts`) | exit 0. `scripts/` fica fora do `include` do pacote (M-2) | ✅ |
| `pnpm --dir packages/api codex:protocol`, rodado de novo e comparado por `diff -r` | Regeneração idêntica aos 141 arquivos presentes | ✅ |
| `codex login status` real | exit 0 | — |
| Probe `tsx` com os módulos reais contra a CLI 0.159.3 instalada | `loginStatus("codex")` → `true`; `readCatalog()` → `loggedIn=true`, 8 modelos; `openCodexThread` com `CODEX_HOME` temporário, sem enviar nenhuma vez → thread criada. Nenhum `codex app-server` ficou vivo | ✅ |
| Mutações temporárias, restauradas e conferidas por `diff` | Sem a barreira de `thread/start`, de `turn/start` ou do spawn: o teste correspondente falha. Sem a correlação de `changes`: 4 testes falham. Sem `agentInfo.observe`: o teste de versão do Claude falha | ✅ |

## Situação dos achados da review-002

| Achado | Estado | Evidência |
|---|---|---|
| B-1 · V-49a com corrida | ✅ | `codex-runtime-start.test.ts` espera `sink.logged("codex_turn_started")` antes de `close()`; nenhum sleep ou timeout novo. Passou nas duas suítes completas posteriores |
| I-1 · limite de 100 linhas | ✅ | `codexSession.ts` com 85 linhas e um membro por linha; estado, abertura, saída e envio de vez em `codexSessionState.ts` (35), `codexSessionStartup.ts` (61), `codexSessionExit.ts` (33) e `codexTurnDispatch.ts` (19). `agentSdkSession.ts` com 98 linhas, usando `agentSdkExit.ts` e `agentSdkInfoReporter.ts`. `resumeCodexThread` passou a receber 3 parâmetros |
| I-2 · tipos gerados | ✅ com ressalva | `protocol/generated/` gerado por `generate-ts` 0.159.3, sem comentários, maior arquivo com 52 linhas. `codexMethods.ts` reexporta os tipos usados em `initialize`, `thread/start`, `thread/resume`, `turn/start`, `thread/unsubscribe`, permissões, `fileChange` e `item/started`. A CLI real aceitou os formatos (`title: null`, `requestAttestation: false`). Resíduo em M-1 |
| I-3 · versão do Claude | ✅ | `agentSdkSession.test.ts` monta a sessão com o SDK simulado e a `SessionHandlerFactory` real: grava `["session-1", "2.1.3"]` uma vez e nada quando o `init` não traz versão. A mutação foi detectada |
| I-4 · barreiras de abertura | ✅ | `codex-runtime-close-requests.test.ts` usa um filho falso (`fakeCodexChild.ts`) e fecha no momento exato da resposta de `thread/start` e de `turn/start`. Cobre também `turn/start` pendente (ordem `turn/start` → `thread/unsubscribe`) e unsubscribe rejeitado. O teste de spawn passou a verificar que nenhum pedido RPC foi enviado |
| M-1 · lacunas de teste | ✅ | Login negativo, inclusive exit 1 com texto `Logged in` (`codex-catalog-transport.test.ts`); resposta por texto rejeitada quando há ID (`questionAnswerValidation.test.ts`); `accept_edits` pelo runtime, com aceitação automática dentro do clone e pergunta fora dele ou em `ask_all` (`codex-runtime-file-approval.test.ts`); unsubscribe rejeitado |
| M-2 · `changes` sem liberação | ✅ | `codexSessionRequestBridge.ts` apaga a entrada em `item/completed`; `codexSessionRequestBridge.test.ts` cobre a anexação e a liberação |
| M-3 · strings e import | ✅ | `DENIAL_NOTE_PREFIX` em `codexTurnDispatch.ts:6`; `LOGGED_IN_PREFIX` em `codexCatalogTransport.ts:9`; import de `StringDecoder` no topo de `codexRpcFrames.ts` |

## Conformidade com a spec (itens tocados pelas correções)

Os itens que nenhuma correção tocou mantêm o estado das revisões 001 e 002.

| Item | Status | Evidência |
|---|---|---|
| REQ-112 · disponibilidade | ✅ | CLI real: logado, 8 modelos. Exit ≠ 0 nunca conta como logado |
| REQ-120/122 · modos e diffs de arquivo | ✅ | `codex-runtime-file-approval.test.ts` e `codex-runtime-requests.test.ts` |
| REQ-124 / NFR-19 / DEC-29 · encerramento | ✅ | Barreiras de probe, spawn, `thread/start` e `turn/start`; unsubscribe antes do término, inclusive quando rejeitado |
| REQ-125 / V-49f · mesma conversa | 🟡 | `ephemeral: false`, como no spike. O teste de retomada continua simulado e a prova real exige inferência (S-1, tarefa 07) |
| §7.16 · permissões extras | ✅ | `GrantedPermissionProfile` gerado tipa a resposta; testes de permitir, recusar e bypass |
| §10 · tipos gerados (`spec.md:232`) | ✅ com ressalva | M-1 |
| §14 / NFR-21 · `agent_version` | ✅ | Codex em `codex-service-flow.test.ts:32`; Claude em `agentSdkSession.test.ts` |
| REQ-121 · motivo da recusa | ✅ | Comportamento inalterado; aparência na timeline em S-3 |

## Regras do projeto

| Regra (fonte) | Status | Evidência |
|---|---|---|
| `.ts`/classe até 100 linhas (`code-standards.md`, File Size) | ✅ | Nenhum `.ts` das correções acima de 100 linhas; um membro por linha nos arquivos reescritos |
| Funções até 30 linhas, até 3 parâmetros | ✅ | Maior função nova: `openProcess`, com 16 linhas. Parâmetros extras viraram objetos |
| Sem comentários | ✅ | Os tipos gerados têm os comentários removidos pelo gerador; o scanner não achou comentários novos |
| Sem strings mágicas | ✅ | M-3 resolvido |
| Protocolo em infra, sem import de infra em application | ✅ | Só arquivos de `infra/terminal/codex` importam `protocol/generated` |
| Testes com oráculo independente e sem tempo fixo | ✅ | Sincronização por eventos ou pelo filho falso; as mutações confirmam que os testes detectam a falha |

## Achados

### M-1 (Menor) · task_05 (05.1/05.3) — Tipos gerados ainda não cobrem as respostas de comando e pergunta, e sobram raízes sem uso

- **Onde:** `packages/api/scripts/syncCodexProtocol.ts:13-35` gera `CommandExecutionRequestApprovalParams/Response`, `PermissionsRequestApprovalParams`, `ToolRequestUserInputParams/Response` e `ItemCompletedNotification`, que nenhum código importa. As respostas de comando (`codexApprovalResult.ts:3`, `{ decision: unknown }`) e de pergunta (`codexQuestionTranslator.ts:21`) saem de `codexSessionRequests.ts:20/23` sem conferência contra esses tipos.
- **Contra:** `spec.md:232` ("só os usados") e o objetivo de I-2 da review-002 (tipar também as respostas).
- **Evidência:** comparei com os tipos gerados. `{ acceptWithExecpolicyAmendment: { execpolicy_amendment: string[] } }` e `{ answers: { [id]: { answers: string[] } } }` batem hoje com `CommandExecutionApprovalDecision` e `ToolRequestUserInputResponse`. Não há defeito atual; o risco é uma mudança futura passar sem o `tsc` acusar.
- **Correção esperada:** em `codexSessionRequests.ts`, conferir os retornos com `satisfies` contra os tipos gerados de resposta, sem importar tipos de infra em application. Remover das raízes o que continuar sem uso.

### M-2 (Menor) · task_05 (05.1) — Script de geração fora do typecheck do pacote

- **Onde:** `packages/api/tsconfig.json` inclui só `src`; `scripts/syncCodexProtocol.ts` não é checado por `pnpm --dir packages/api run typecheck`.
- **Contra:** verificação exigida por `AGENTS.md` (typecheck do pacote alterado).
- **Evidência:** checado à parte nesta revisão com uma configuração temporária: exit 0. Uma mudança futura no script passaria sem checagem.
- **Correção esperada:** incluir `scripts` no typecheck do pacote, por exemplo `"include": ["src", "scripts"]`, ou mover o gerador para `src/cli/`, onde ficam os outros comandos `tsx`.

## Atualizações de spec a discutir

- **S-1 · prova real da retomada (REQ-125, P-18, V-52), mantida da review-002:** o rollout só aparece depois da primeira vez, então só um smoke com inferência prova "uma vez → app-server morto → resume com histórico". Proposta: deixar isso explícito no V-52 da tarefa 07.
- **S-2 · contrato do login (§7.13, DEC-32), mantida da review-002:** a implementação agora exige exit 0 e o texto `Logged in` em stdout ou stderr, conferidos na 0.159.3. Vale registrar na spec.
- **S-3 · motivo da recusa na timeline (REQ-121, `spec.md:292`):** o motivo é anexado ao texto da próxima mensagem (`codexTurnDispatch.ts:10-12`), e o hook `UserPromptSubmit` registra o texto completo, que vira o evento `prompt` em `hookEventSummarizer.ts:33-35`. A pessoa operadora vê, junto da própria mensagem, a frase "O pedido anterior foi recusado pelo operador: …". É transparente sobre o que o Codex recebeu, mas a spec não diz se a frase deve aparecer junto da mensagem, à parte ou não aparecer.

## Divergências entre o relatório do implementador e a evidência

- Nenhuma. As entradas de 2026-11-24 no "Registro de execução" das tarefas 02, 04 e 05 conferem com os arquivos, as contagens de testes e os comandos desta revisão.
- Limite já declarado: o implementador e o revisor foram a mesma sessão.

## Prompt de correção

> Ajustes opcionais antes do merge, sem tocar na tarefa 07:
>
> 1. **M-1 · task_05** — `packages/api/src/infra/terminal/codex/codexSessionRequests.ts`: conferir com `satisfies` a resposta de `item/commandExecution/requestApproval` contra `CommandExecutionRequestApprovalResponse` e a de `item/tool/requestUserInput` contra `ToolRequestUserInputResponse`, sem importar tipos de infra em application. Em `scripts/syncCodexProtocol.ts`, remover das raízes os tipos que continuarem sem uso e rodar `pnpm --dir packages/api codex:protocol`.
> 2. **M-2 · task_05** — fazer `pnpm --dir packages/api run typecheck` cobrir o gerador (`"include": ["src", "scripts"]` ou mover para `src/cli/`).
>
> Restrições: `.ts` até 100 linhas, sem comentários, sem novas dependências.
> Ao terminar: `pnpm --dir packages/api run typecheck` e `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/codex-runtime-requests.test.ts test/codex-runtime-file-approval.test.ts`.
