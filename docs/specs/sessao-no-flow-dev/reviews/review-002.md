# Revisão de conformidade 002: A sessão do Claude dentro do Flow Dev

> **Data:** 2026-11-23 · **Escopo:** feature inteira (as 7 tarefas aparecem como `completed`) · **Intervalo:** mudanças não commitadas (`git diff HEAD` mais arquivos novos; nada foi commitado)
> **Spec:** `spec.md`, `_tasks.md`, `task_01.md` a `task_07.md`, `v20-spike.md`, `reviews/review-001.md`
> **Regras lidas:** as da review-001 (`AGENTS.md`, `apps/web/AGENTS.md`, `code-standards.md`, `e2e-testing.md`, skills `layered-backend`, `trpc-nextjs`, `nextjs-folder-structure`, `software-testing`)
> **Dispensa do usuário:** a 07.3 (passada manual do V-31 pela UI) e os e2e V-30a, V-30b e V-32g foram dispensados por decisão do usuário, que fará a validação manual. Não contam como falha desta revisão e também não foram comprovados por ela (registrado em `task_07.md`).

## Veredito: APROVADO COM RESSALVAS

Os defeitos da review-001 foram corrigidos e conferidos: nenhum achado bloqueante, e todas as verificações passam. Resta um achado importante só de teste (o smoke V-31a depende de o Claude escolher a ferramenta Write e falhou em 3 de 3 execuções desta revisão) e achados menores. A recomendação é corrigir o I-1 antes do merge.

| Bloqueante | Importante | Menor | Spec a discutir |
|---|---|---|---|
| 0 | 1 | 6 | 4 |

## Verificação executada

| Comando | Saída | Resultado |
|---|---|---|
| `pnpm typecheck` | exit 0 | ✅ |
| `pnpm --dir packages/api test` | exit 0 · 100 arquivos, 656 testes | ✅ |
| `pnpm --dir packages/api test:integration` | exit 0 · 110 arquivos passam e 2 ignorados · 618 testes passam e 5 ignorados (smoke com o Claude real, opt-in) | ✅ |
| `pnpm --dir apps/web test` | exit 0 · 84 arquivos, 418 testes | ✅ |
| `pnpm lint` | exit 0 (só o `apps/web` tem lint) | ✅ |
| `pnpm build` | exit 0 | ✅ |
| `tsc --noEmit` do `spike/` | exit 0 | ✅ |
| `scan_diff.py --worktree --max-lines 100` | só `schema.ts` (130, já passava de 100 antes e só ganhou uma linha de exportação); sem comentário, `@ts-ignore`, teste desabilitado nem timeout aumentado; as 23 dicas de `placeholder` são os `test.fixme` dispensados e texto de documentação; `debug-leftover` é o `console.log` do spike; `secret-like` é fixture (`sk-teste`); `hollow-assertion` acompanhada de asserção forte | — |
| Medição própria (AST dos 221 arquivos `.ts`/`.tsx` alterados): funções acima de 30 linhas, mais de 3 parâmetros, `if` em sequência | só sobraram casos que já existiam ou que o mapeamento de erros estende (ver M-3); nenhum no código novo | ✅ |
| Mutação do REQ-063 e do "Não entregue" (removi o título e o rótulo) | 2 testes falharam; arquivos restaurados | ✅ |
| Mutação do desligamento (na review anterior, `closeAll()` no lugar de `abandonAll()`) | os 2 testes de `session-shutdown.test.ts` falharam | ✅ |
| Smoke com o Claude real (`FLOW_DEV_REAL_CLAUDE=1`, 5 testes) | exit 0 do `vitest` com **1 falha**: V-31a esgotou os 600 s; V-31b (2 testes), V-31c e REQ-076 passaram | ❌ no V-31a, ver I-1 |
| Diagnóstico do V-31a, 2 execuções com cópia temporária do teste (removida) | em ambas, a pergunta foi respondida e a sessão chegou a "Aguardando você", mas nenhum artefato foi capturado | ver I-1 |

Não rodei o e2e (Playwright), dispensado. Não testei o processo `terminalSessionsWorker` por sinal real (SIGTERM com sessão ativa): a parada é provada chamando `worker.run` com o sinal abortado, com o runtime roteirizado (integração) e com o Claude real; falta só o trecho do CLI (`process.once` e `process.exit`), que é curto.

## Conformidade com a spec

| Item | Status | Evidência |
|---|---|---|
| REQ-051 a REQ-054 | ✅ | `terminalSessionController.ts`; `terminal-open*.test.ts`; `TerminalLaunchMode.test.tsx`; `session-supervisor-start.test.ts` (V-24g) |
| REQ-055, REQ-056, REQ-061, REQ-062 | ✅ | `sessionTimelineMerge.ts`; `session-recorder.test.ts` (V-27a, com mutação); `issue-deletion-terminal.test.ts` |
| REQ-057, NFR-10 | 🟡 | Poll de 1,5 s e ciclo de 1 s; nenhum teste mede 3 s e 2 s (igual à review-001; por desenho, sem teste de latência) |
| REQ-058 a REQ-060 | ✅ | `session-send.test.ts`; `SessionComposer.test.tsx` |
| **REQ-063** | ✅ | `QuestionField.tsx` mostra o título curto e o tipo de escolha; `QuestionRequestCard.test.tsx › "REQ-063 …"`, falha sem a correção |
| REQ-064 a REQ-070, REQ-072 | ✅ | `QuestionRequestCard.test.tsx`; `PermissionRequestCard.test.tsx`; `session-requests.test.ts`; `sessionRequestBroker.test.ts` |
| REQ-067, REQ-068 | ✅ | `session-answer.test.ts` (V-23f); `sessionRequestBroker.test.ts` prova com timers falsos que o pedido segue aberto após 30 min |
| REQ-071 | 🟡 | Grava com o arquivo não versionado (smoke V-31b passou nesta revisão); com o arquivo versionado o Claude Code não grava (S-1) |
| REQ-073 a REQ-075 | ✅ | `session-controls.test.ts` (V-25a a V-25c); `SessionControls.test.tsx` |
| **REQ-076** | ✅ | `RuntimeHandle.abandon()` (`agentSdkSession.ts:44`), `SessionHandleRegistry.abandonAll()`, `sessionWorkerComposition.ts:49`; `session-shutdown.test.ts` (as sessões continuam ativas e sem `ended_at`; o serviço seguinte as leva a "Interrompida", cancela a pergunta e escreve a nota); `session-real-claude.test.ts › "REQ-076 …"` passou com o Claude real nesta revisão |
| REQ-077 a REQ-079, B-23 | ✅ | `session-resume.test.ts`; `session-recovery.test.ts` (V-26e, com mutação na review anterior) |
| REQ-080, B-22 | ✅ | `sessionControlAuthorization.ts`; `session-send.test.ts`; `SessionConversation.test.tsx` |
| REQ-081, REQ-082 | ✅ | `session-runtime-read.test.ts`; `ExecutionStageSessions.test.tsx` |
| NFR-11, NFR-12, NFR-13, NFR-14 | ✅ | `session-recorder.test.ts` (V-27f); `agentSdkQueryOptions.test.ts`; `SessionConversation.test.tsx` |
| US-06 a US-09 | ✅ | testes de componente e integração; smoke V-31a/b/c |
| **US-10.1 (reinício → "Interrompida")** | ✅ | agora cobre a parada normal (REQ-076 acima) e a queda abrupta (V-31c) |
| US-10.2, US-10.3 | ✅ | `session-resume.test.ts` |
| B-24, B-25, B-27 a B-31 | ✅ | como na review-001; `session-controls.test.ts` (B-30) |
| B-26 | 🔀 | A spec foi atualizada (o Claude Code não grava com o arquivo versionado); smoke `session-real-permissions.test.ts` fixa o comportamento. Falta decidir S-1 |
| §9 "não muda" | ✅ | `artifact-capture*`, `terminal-event-route*`, `src/infra/agents/*` e `agent-settings*` passam; `git status` sem mudança em `src/infra/agents/` nem no route handler de eventos |
| DEC-15 a DEC-21 | ✅ | `v20-spike.md` e a spec (DEC-18 e DEC-20 atualizadas com o resultado do spike) |
| §14, §15 | ✅ / 🔀 | Modelo de dados conforme; `timeline` devolve também entradas alteradas (S-3) |
| Fora de escopo | ✅ | nenhuma sugestão fora de escopo foi implementada |
| V-30a, V-30b, V-32g (e2e) | ⚪ | `test.fixme`, dispensados pelo usuário (a tela exige autorização real do GitHub). O seed foi corrigido e o roteiro agora é por clone |
| V-31a | 🟡 | O serviço faz o certo; o teste do smoke não é confiável (I-1) |
| V-31b, V-31c, REQ-076 real | ✅ | passaram nesta revisão |
| §24 definição de pronto | ⚪ | e2e e smoke pela UI dispensados pelo usuário; o resto cumprido |
| V-20 a V-29, V-32a a V-32f | ✅ | testes de mesmo nome conferidos |

## Regras do projeto

| Regra (fonte) | Status | Evidência |
|---|---|---|
| Sem comentários | ✅ | scanner sem `comment-added` |
| `.ts` até 100 linhas (`code-standards.md`, File Size) | ✅ | nenhum arquivo novo acima de 100; `agentSdkSession.ts` e `scriptedSessionRunner.ts` estão em 100 e 99; os do spike foram divididos; `schema.ts` (130) é anterior |
| Funções até 30 linhas, até 3 parâmetros, até 3 `if` em sequência | ✅ | medição própria; os casos que sobram já existiam (M-3) |
| Sem linhas em branco em funções | ✅ | só em blocos `describe` de testes |
| Números e strings mágicos | ✅ | constantes nomeadas; discriminantes de união como no código existente |
| Dados sensíveis fora do código | ✅ | fixture de teste |
| Camadas, tRPC, estrutura do frontend | ✅ | como na review-001; sem importação entre features irmãs |
| `software-testing` | ✅ / 🟡 | fronteiras reais e mutações conferidas; ver I-1 |
| e2e independentes (`e2e-testing.md` §2) | ✅ | roteiro por clone (`scriptFileFor`), sem arquivo global; `scriptedSessionSteps.test.ts` prova que dois clones leem roteiros distintos |
| Verificação proporcional (`AGENTS.md`) | ✅ | suítes completas só no fim; nenhum `testTimeout` aumentado |
| Interface em português do Brasil | ✅ | textos conferidos |
| Processo (sem commit, sem PR) | ✅ | nada commitado |

## Verificação das correções da review-001

| Achado | Situação | Evidência |
|---|---|---|
| B-1 parar o serviço encerra sessões | corrigido | ver REQ-076 acima |
| I-1 REQ-063 | corrigido | mutação conferida |
| I-2 roteiro global dos e2e | corrigido | `sessionScript.ts`, `scriptedSessionSteps.ts:scriptFileFor`, sem `describe` serial |
| I-3 "Não entregue" sem teste | corrigido | `SessionConversation.test.tsx`, mutação conferida |
| I-4 pendências da definição de pronto | aceito pelo usuário | ver topo |
| I-5 code-standards | corrigido | medição acima |
| M-3 prova de "sem prazo" | corrigido | `sessionRequestBroker.test.ts` |
| M-1, M-2, M-4, M-5 | abertos | ver abaixo |

## Achados

### I-1 (Importante) · task_07 (07.3) — o smoke V-31a não é confiável e o registro o dá como "passou"
- **Onde:** `packages/api/test/session-real-claude.test.ts` (o teste "V-31a") — o prompt manda "Salve em docs/specs/sair/spec.md" sem dizer qual ferramenta; a condição de término exige um artefato `docs/specs/sair/spec.md`. `v20-spike.md` (seção "Smoke V-31", linha V-31a): "**Passou.** … o `docs/specs/sair/spec.md` virou artefato".
- **Contra:** `software-testing` (teste determinístico, oráculo que não depende de sorte); REQ-026/Spec B (os artefatos vêm de edições de arquivo registradas pelos hooks, `hookToolEvents.ts`: Write, Edit, MultiEdit, NotebookEdit).
- **Problema:**
  - Desta vez, o V-31a esgotou os 600 s na execução completa e falhou também em duas execuções de diagnóstico (200 s e 240 s), 3 de 3.
  - O diagnóstico mostra a pergunta respondida, a sessão em "Aguardando você", o arquivo no disco e o Claude dizendo "Salvei a spec em `docs/specs/sair/spec.md`", mas os eventos gravados foram `started`, `prompt`, `skill` e quatro `command`, sem nenhum `file_edit`: o Claude gravou a spec com `mkdir -p … && cat > …` por Bash.
  - Quando passou antes, ele havia usado Write.
  - O serviço fez o que a Spec B define; o teste é que depende de uma escolha do modelo.
  - Um registro "passou" que não se reproduz tira o valor da evidência.
- **Escapa:** uma regressão real do acompanhamento (por exemplo, um hook que deixa de chegar) seria confundida com variação do modelo, e vice-versa.
- **Correção esperada:** o prompt do V-31a pede explicitamente a ferramenta Write ("use a ferramenta Write"), e o teste falha com uma mensagem que mostre os eventos gravados quando o artefato não aparecer; `v20-spike.md` passa a dizer que o V-31a depende da ferramenta que o Claude escolhe, com o resultado desta revisão.

### M-1 (Menor) — apoios de teste dentro do código de produção
`InflightTracker` e `worker.idle()` (`sessionWorkerParts.ts`, `sessionWorkerComposition.ts`) e `WorkerOverrides.messages` só servem aos testes; a §13 não os prevê. Também `SessionHandleRegistry.closeAll()` não tem uso em produção desde a correção do B-1 (só os smokes opt-in o chamam).

### M-2 (Menor) — mapa de leituras sem limite
`SessionTimelineController.readChecks` (`sessionTimelineController.ts:24`) guarda uma entrada por pessoa e projeto e nunca remove. O crescimento é limitado por pessoas × projetos.

### M-3 (Menor) — a feature aumentou uma função que já passava de 30 linhas
`createTasksRouter` (`routers/tasks.ts:22`) tinha 31 linhas em `HEAD` e agora tem 34 com o `session`. `taskErrorMapper.ts` e `terminalErrorCatalog.ts` têm correntes de `if` anteriores. Contra `code-standards.md`, mas já eram violações anteriores.

### M-4 (Menor) — testes alheios à feature alterados
`AgentSettings.test.tsx`, `ProjectSettings.test.tsx` e `localCheckoutPicker.test.ts` já falhavam antes e foram ajustados (justificado e registrado).

### M-5 (Menor) — `DESIGN.md` sem os cartões novos
Os cartões de pergunta e de aprovação (borda âmbar de 2 px, `rounded-xl`) não estão descritos no `DESIGN.md`, que diz que "na thread, só o draft e o composer têm caixa".

### M-6 (Menor) — a variável do roteiro tem duas condições diferentes
`terminalPorts.ts:12` dispensa a checagem do `claude` com `FLOW_DEV_SESSION_FAKE_SCRIPT` quando `NODE_ENV !== "production"`, mas a spec (§13) e `scriptFromEnvironment` só aceitam `NODE_ENV=test`. Em desenvolvimento, com a variável definida por engano, o `open` não confere o `claude` e o serviço usaria o SDK real. Alinhar as duas condições.

## Atualizações de spec a discutir
- **S-1 (B-26, REQ-071):** com `.claude/settings.local.json` versionado, a regra não é gravada e a tela não avisa. Decidir se a tela avisa ou se basta o registro na spec.
- **S-2 (Bash e artefatos):** o acompanhamento só captura Markdown gravado por Write, Edit, MultiEdit e NotebookEdit; um arquivo que a skill grava por Bash não vira artefato, como visto no V-31a. Decidir se a Spec B deve cobrir também o Bash.
- **S-3 (§15 e V-27e):** a `timeline` devolve também as entradas alteradas depois do cursor, e quem não vê o projeto recebe `NOT_FOUND` e não `FORBIDDEN`. Atualizar a §15 e o V-27e.
- **S-4 (cópia):** `terminal_disabled` ainda fala em "abertura no terminal" (a Q-01 e o V-03l fixam o texto).
- **Cabeçalho da spec:** o status ainda diz "Implementada (falta a passada manual pela UI do V-31)". Atualizar depois da validação manual do usuário.

## Divergências entre o relatório do implementador e a evidência
- `v20-spike.md` (V-31a) e `task_07.md` dão o V-31a como "Passou". Nesta revisão ele falhou 3 de 3 (I-1): a evidência de que a captura funciona depende da escolha da ferramenta pelo modelo.
- Fora isso, os registros das correções (B-1, I-1 a I-3, I-5) conferem com o código e com as execuções.

## Prompt de correção

> Corrija, nesta ordem, sem alterar nada fora do listado:
> 1. **I-1 — task_07 (07.3)** — `packages/api/test/session-real-claude.test.ts`: o prompt do V-31a pede "use a ferramenta Write" para gravar `docs/specs/sair/spec.md`; quando o artefato não aparece, a falha mostra os eventos gravados (tipo e resumo). `docs/specs/sessao-no-flow-dev/v20-spike.md`: na linha V-31a, registrar que o resultado depende da ferramenta que o Claude escolhe e o que esta revisão observou. Teste: `FLOW_DEV_REAL_CLAUDE=1 pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/session-real-claude.test.ts` passa pelo menos duas vezes seguidas.
> 2. **M-6** — `packages/api/src/infra/terminal/terminalPorts.ts`: usar a mesma condição de `scriptFromEnvironment` (`NODE_ENV=test`); ajustar o teste correspondente.
> 3. **M-1** — remover `SessionHandleRegistry.closeAll()` se nada em produção o usa (os smokes podem usar `abandonAll()`).
>
> Restrições: arquivos `.ts` com até 100 linhas, funções com até 30 linhas, até 3 parâmetros, sem comentários, sem novas dependências.
> Ao terminar, rode e mostre a saída de: `pnpm typecheck`, `pnpm --dir packages/api test`, `pnpm --dir packages/api test:integration`, `pnpm --dir apps/web test`, `pnpm lint`, `pnpm build`.
