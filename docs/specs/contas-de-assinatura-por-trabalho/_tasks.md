---
schema_version: "compozy.tasks/v2"
workflow: contas-de-assinatura-por-trabalho
graph:
  nodes:
    - id: task_01
      file: task_01.md
    - id: task_02
      file: task_02.md
    - id: task_03
      file: task_03.md
    - id: task_04
      file: task_04.md
    - id: task_05
      file: task_05.md
    - id: task_06
      file: task_06.md
    - id: task_07
      file: task_07.md
    - id: task_08
      file: task_08.md
  edges:
    - from: task_01
      to: task_03
    - from: task_02
      to: task_03
    - from: task_03
      to: task_04
    - from: task_03
      to: task_07
    - from: task_04
      to: task_05
    - from: task_04
      to: task_06
    - from: task_02
      to: task_06
    - from: task_04
      to: task_08
---

# Tarefas: Várias contas de assinatura de IA, escolhidas por trabalho

> **Spec:** [spec.md](spec.md) · **Data:** 2026-11-25 · **Total:** 8 tarefas, 27 mini-tarefas

## Objetivo
Cada pessoa cadastra e loga quantas contas do Claude Code e do Codex quiser. A pessoa operadora escolhe uma conta por provedor em cada trabalho, e toda sessão do trabalho roda, e é retomada, na conta registrada nela. Quando a conta falha, a sessão é bloqueada com aviso, sem troca automática.

## Estado
| Tarefa | Tipo | Complexidade | Depende de | Mini-tarefas | Status |
|---|---|---|---|---|---|
| [01 — Migration, schema e DAO das contas](task_01.md) | backend | high | — | 3/3 | completed |
| [02 — Diretório da conta e inspetor de login](task_02.md) | backend | high | — | 4/4 | completed |
| [03 — Serviço e router de contas de IA](task_03.md) | backend | high | 01, 02 | 4/4 | completed |
| [04 — Escolha por trabalho e abertura de sessão](task_04.md) | backend | critical | 03 | 3/3 | completed |
| [05 — Worker com credenciais da conta, checagem de login e limite de uso](task_05.md) | backend | critical | 04 | 4/4 | completed |
| [06 — Catálogo do Codex por conta](task_06.md) | backend | medium | 02, 04 | 2/2 | completed |
| [07 — Página Contas de IA](task_07.md) | frontend | medium | 03 | 3/3 | completed |
| [08 — Contas na tela do trabalho](task_08.md) | frontend | medium | 04 | 4/4 | completed |

**Ondas:**
1. 01 e 02 em paralelo (arquivos disjuntos).
2. 03.
3. 04 e 07 em paralelo.
4. 05, 06 e 08 em paralelo. A 05 e a 06 mexem em `packages/api` em arquivos disjuntos (worker × catálogo); a 08 fica em `apps/web`.

## Como executar (controle)
Veja o progresso e a próxima mini-tarefa liberada a qualquer momento: `python3 -I .claude/skills/spec-to-tasks/scripts/tasks_status.py docs/specs/contas-de-assinatura-por-trabalho`.

1. **Escolha** a próxima tarefa liberada: `pending`, e todas as de que ela depende estão `completed`.
2. **Implemente** numa sessão nova: "implemente a mini-tarefa 02.1 de `task_02.md`" (ou a tarefa inteira). O implementador:
   - muda o `status` para `in_progress`;
   - marca `[x]` em cada mini-tarefa só depois de rodar o "Pronto quando" dela;
   - anota no "Registro de execução" os comandos e o resultado.
3. **Feche a tarefa:** ela passa a `completed` quando todas as mini-tarefas estão marcadas e os critérios de sucesso foram comprovados por comando. Repita a partir do passo 1 até todas as tarefas estarem `completed`.
4. **Revisão final, uma vez, depois de todas as tarefas:** "revise a feature contra a spec" com **spec-conformance**. Ela revisa tudo de uma vez: requisitos, regras do projeto, testes e o que os registros de execução afirmam. O veredito vai para `reviews/` e para a seção "Revisão final" abaixo.
5. **Se REPROVADO:** o prompt de correção do relatório vira uma rodada de correções; depois, nova revisão final. A feature está pronta quando a revisão final estiver APROVADO (ou APROVADO COM RESSALVAS aceito por você).

## Revisão final
- 2026-11-26 · review-001 · REPROVADO (1 bloqueante, 3 importantes, 4 menores) · reviews/review-001.md
- 2026-11-26 · review-002 · REPROVADO (sem correções desde a review-001: 1 bloqueante, 3 importantes, 4 menores) · reviews/review-002.md
- 2026-11-26 · review-003 · REPROVADO (segunda revisão sem correções: 1 bloqueante, 3 importantes, 4 menores) · reviews/review-003.md
- 2026-11-26 · review-004 · REPROVADO (terceira revisão sem correções da feature: 1 bloqueante, 3 importantes, 4 menores) · reviews/review-004.md
- 2026-11-26 · review-005 · REPROVADO (quarta revisão sem correções da feature: 1 bloqueante, 3 importantes, 4 menores) · reviews/review-005.md
- 2026-11-26 · review-006 · REPROVADO (correções da review-001 resolvidas; 1 bloqueante: Q-03 não implementada; 1 importante; 1 menor) · reviews/review-006.md

## Restrições globais
- Regras de `.agents/rules/code-standards.md`: sem comentários, arquivo `.ts` com até 100 linhas, função com até 30 linhas, até 3 parâmetros, sem linhas em branco dentro de funções, constantes para números e strings mágicos.
- Skills obrigatórias: `layered-backend` (serviços, DAOs, inspetor, home), `trpc-nextjs` (routers e consumo), `nextjs-folder-structure` (página e componentes), `e2e-environment` (Playwright), `software-testing` (todo teste).
- Migration: `packages/api/drizzle/0057_agent_accounts.sql` + `0057_agent_accounts_rollback.sql`, registrada em `drizzle/meta/_journal.json` e em `FEATURE_MIGRATIONS` de `packages/api/test/databaseMigrations.ts`. Antes de criar, confira se a 0057 continua livre (a 0056 é da escolha de worktree, Issue #7).
- NFR-01: o Flow Dev nunca lê, copia, grava no banco, registra em log ou devolve pela API o conteúdo das credenciais. O caminho do diretório da conta é derivado do `id` no servidor e só é mostrado à dona.
- NFR-02: dona e operação conferidas no serviço e de novo no worker.
- NFR-04: logs com `account=<id>|default`, nunca o e-mail.
- Comandos de CLI com `shell: false` e o ambiente de `buildAgentEnvironment`.
- Interface em pt-BR. Textos de erro e de estado exatamente como na spec.
- Não muda (spec §9): Issue Author e Planejamento seguem no login padrão; sessão sem conta mantém `HOME`, `CLAUDE_CONFIG_DIR` e `CODEX_HOME` do servidor.
- Verificação durante a tarefa: só os testes afetados (`pnpm --dir packages/api exec vitest run <arquivo>`, `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts <arquivo>`, `pnpm --dir apps/web exec vitest run <arquivo>`) e o `typecheck` do pacote. Integração sem `TEST_DATABASE_URL`. Suíte completa do pacote uma vez, ao fechar a tarefa.
- Antes do primeiro Playwright da sessão e depois da migration nova: `pnpm --dir apps/web e2e:prepare`.
- Sem testes manuais nas tarefas.

## Premissas e bloqueios
- **Migration 0057** (decisão do usuário em 2026-11-25: próxima livre do journal). Se outra feature ocupar a 0057 antes, use a próxima livre e corrija a spec.
- **Sessões de revisão automática** (`review`, `review_execute`, abertas por `SessionLauncher.launch`) também seguem a conta do trabalho (decisão do usuário em 2026-11-25; REQ-014 atualizado).
- **V-12b ativo**: o ambiente e2e tem GitHub falso, então a jornada da tela do trabalho roda no Playwright (decisão do usuário em 2026-11-25).
- **Fora das tarefas, por ser manual:** o spike V-01 (CLI num diretório novo, links de DEC-03, captura real da mensagem de limite) e o smoke V-13 (contas reais). O usuário faz esses testes no teste manual final. Até lá, o risco de onboarding ou de confiança num `CLAUDE_CONFIG_DIR` novo e a lista de links de DEC-03 só têm prova por sistema de arquivos e por runtime falso.
- **`session.get` não existe**: o histórico das sessões vem de `TerminalExecutionReader.read` (`packages/api/src/application/services/terminal/terminalExecutionReader.ts`). O campo `account` de spec §15 entra nessa visão (task 04.3).
- **Trabalho em andamento de outra sessão** (Issue #7) altera `packages/api/src/infra/database/schema/tasks/terminalTables.ts` sem commit. A 01.3 mexe no mesmo arquivo: faça rebase sobre o que estiver commitado e não reverta mudanças alheias.
- A limpeza de `packages/api/docs/spec-codex-chatgpt.md` (Sugestão fora do escopo) não foi aceita e não entra.

## Matriz de cobertura
| ID da spec | Descrição curta | Tarefa · mini-tarefa |
|---|---|---|
| REQ-001 | Cadastrar conta em "Aguardando login" | 03 · 03.1 |
| REQ-002 | Comando de login para copiar | 03 · 03.1 (backend), 07 · 07.2 (tela) |
| REQ-003 | Sem limite de quantidade | 03 · 03.1 |
| REQ-004 | Regras do nome | 03 · 03.1 |
| REQ-005 | Verificar login | 03 · 03.2 |
| REQ-006 | E-mail e plano do Claude | 02 · 02.2, 03 · 03.2 |
| REQ-007 | Último estado + reverificação em segundo plano | 03 · 03.2, 07 · 07.1 |
| REQ-008 | Renomear e refletir no histórico | 03 · 03.1, 04 · 04.3 |
| REQ-009 | Remover: logout, apagar, "(removida)" | 03 · 03.3 |
| REQ-010 | Recusar remoção com sessões abertas | 03 · 03.3 |
| REQ-011 | Só a dona vê e age | 03 · 03.4 |
| REQ-012 | Operadora escolhe por provedor | 04 · 04.1 |
| REQ-013 | Sem escolha → login padrão | 04 · 04.1 |
| REQ-014 | Abertura copia a conta (inclui revisão) | 04 · 04.2 |
| REQ-015 | Conta no diálogo e no cartão do plano | 08 · 08.3 |
| REQ-016 | Troca só vale para as próximas | 04 · 04.2, 05 · 05.4 |
| REQ-017 | Retomada na conta registrada | 05 · 05.4 |
| REQ-018 | Conta no histórico por papel | 04 · 04.3, 08 · 08.4 |
| REQ-019 | Recusa: conta de outra pessoa | 04 · 04.2 |
| REQ-020 | Recusa: conta removida | 04 · 04.2 |
| REQ-021 | Catálogo do Codex da conta | 06 · 06.1, 06.2 |
| REQ-022 | Deslogada → falha de abertura | 05 · 05.1 |
| REQ-023 | Verificação > 10 s | 05 · 05.1 |
| REQ-024 | Motivo de limite de uso | 05 · 05.3 |
| REQ-025 | Nunca outra conta | 05 · 05.1, 05.4 |
| REQ-026 | Configuração pessoal por links | 02 · 02.1 |
| NFR-01 | Sigilo das credenciais, 0700 | 02 · 02.1 |
| NFR-02 | Autorização no serviço e no worker | 03 · 03.4, 05 · 05.1 |
| NFR-03 | 1 s com 20 contas; 4 consultas; 10 s | 03 · 03.2, 05 · 05.1 |
| NFR-04 | Logs com id, sem e-mail | 05 · 05.4 |
| NFR-05 | Acessibilidade dos seletores | 08 · 08.1 |
| B-01 | Sem contas → só login padrão + link | 04 · 04.1, 08 · 08.1 |
| B-02 | Duas sessões em contas diferentes | 05 · 05.4 |
| B-03 | Duas abas: versão | 04 · 04.1, 08 · 08.2 |
| B-04 | CLI ausente | 02 · 02.3 |
| B-05 | Mesma assinatura em duas contas | 03 · 03.2 |
| B-06 | Diretório apagado fora | 02 · 02.1 |
| B-07 | Logout falha na remoção | 03 · 03.3 |
| B-08 | Item salvo antes da troca usa a conta atual | 04 · 04.2 |
| B-09 | Limite no meio da resposta | 05 · 05.3 |
| Seção 9 | Comportamento que não muda | 02 · 02.4, 05 · 05.2 |
| DEC-01–07 | Decisões técnicas | ver "Decisões relacionadas" de cada tarefa |
| Migração §20 | 0057 + rollback | 01 · 01.1 |
| V-02a–k | Serviço de contas | 03 |
| V-03a–f | Inspetor de login | 02 |
| V-04a–f | Diretório da conta | 02 |
| V-05a–h | Escolha do trabalho | 04 |
| V-06a, V-06e, V-06f | Abertura e visão da conta | 04 |
| V-06b–d | Ambiente no worker e retomada | 05 |
| V-07a–e | Falhas de login e limite | 05 |
| V-08a–b | Catálogo por conta | 06 |
| V-09a–b | Isolamento no router | 03 |
| V-09c | Isolamento no worker | 05 |
| V-10a | Runners sem sobrescrita | 02 |
| V-10b–c | Sessão sem conta; logs | 05 |
| V-11a–b | Página de contas (RTL) | 07 |
| V-11c–f | Tela do trabalho (RTL) | 08 |
| V-12a | E2E página de contas | 07 |
| V-12b | E2E jornada no trabalho | 08 |
| V-14a–c | Migration, índice, coluna da sessão (novo, da Definição de pronto) | 01 |
| V-15a–b | Desempenho da lista e concorrência (novo, de NFR-03) | 03 |
| V-01, V-13 | Manuais | fora das tarefas (teste manual do usuário) |

## Foco de revisão
1. Conta com estado "Aguardando login" que a verificação não encontra logada → continua "Aguardando login", não vira "Deslogada" (tabela de estados §7) → V-02k em 03.2.
2. Nome de uma conta removida reaproveitado → aceito, porque o índice único vale só para `removed_at is null` → V-14b em 01.2.
3. Item do plano salvo antes da troca e iniciado depois → usa a conta atual do trabalho (B-08) → V-06a em 04.2.
4. Retomada de uma sessão cuja conta foi deslogada depois → falha sem cair no login padrão nem em outra conta (REQ-022, REQ-025) → V-07e em 05.1.
5. Sessão de revisão automática aberta num trabalho com conta escolhida → recebe a conta (REQ-014 atualizado) → V-06e em 04.2.
