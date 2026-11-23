---
schema_version: "compozy.tasks/v2"
workflow: sessao-no-flow-dev
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
  edges:
    - from: task_02
      to: task_03
    - from: task_01
      to: task_04
    - from: task_02
      to: task_04
    - from: task_04
      to: task_05
    - from: task_03
      to: task_06
    - from: task_05
      to: task_07
    - from: task_06
      to: task_07
---

# Tarefas: A sessão do Claude dentro do Flow Dev

> **Spec:** [spec.md](spec.md) · **Data:** 2026-11-23 · **Total:** 7 tarefas, 26 mini-tarefas · **Plano aprovado pelo usuário em 2026-11-23**

## Objetivo
"Iniciar sessão" roda o Claude Code por trás do Flow Dev, num serviço de sessões próprio, e a tarefa mostra a conversa. Ali a pessoa responde às perguntas, aprova ferramentas, manda mensagens, interrompe e encerra, e uma sessão cortada por reinício é retomada com a próxima mensagem.

## Estado
<!-- Keep this table in sync with each task file's frontmatter `status`. The implementer updates it when starting and finishing a task. -->
| Tarefa | Tipo | Complexidade | Depende de | Mini-tarefas | Status |
|---|---|---|---|---|---|
| [01 — Spike V-20 do Agent SDK](task_01.md) | test | high | — | 3/3 | completed |
| [02 — Esquema, estados e regras puras dos pedidos](task_02.md) | backend | high | — | 4/4 | completed |
| [03 — Interação pela web](task_03.md) | backend | high | 02 | 4/4 | completed |
| [04 — Runtime do SDK e início da sessão no serviço](task_04.md) | backend | critical | 01, 02 | 4/4 | completed |
| [05 — Pedidos, controles e reinício no serviço](task_05.md) | backend | high | 04 | 3/3 | completed |
| [06 — Conversa na tela](task_06.md) | frontend | high | 03 | 5/5 | completed |
| [07 — Ponta a ponta, regressão e entrega](task_07.md) | test | medium | 05, 06 | 3/3 | completed |

Tarefa 07 encerrada por decisão explícita do usuário em 2026-11-23, com validação manual sob sua responsabilidade. O encerramento não comprova os E2E/smokes pendentes; veja o registro da tarefa.

**Ondas:**
1. 01 ‖ 02. O spike é manual, fora do código do produto; o esquema e as funções puras não dependem do SDK.
2. 03 ‖ 04. Arquivos disjuntos: controllers, routers e schemas da web contra `application/services/terminal/session*`, `infra/terminal/*Runtime*` e `cli/`.
3. 05 ‖ 06. Os arquivos do serviço em `packages/api` contra `apps/web/src/features/issues/assigned-work`.
4. 07.

## Como executar (controle)
Veja o progresso e a próxima mini-tarefa liberada a qualquer momento: `python3 -I .claude/skills/spec-to-tasks/scripts/tasks_status.py docs/specs/sessao-no-flow-dev`.

1. **Escolha** a próxima tarefa liberada: `pending`, e todas as de que ela depende estão `completed`.
2. **Implemente** numa sessão nova: "implemente a mini-tarefa 02.1 de `docs/specs/sessao-no-flow-dev/task_02.md`" (ou a tarefa inteira). O implementador:
   - muda o `status` para `in_progress`;
   - marca `[x]` em cada mini-tarefa só depois de rodar o "Pronto quando" dela;
   - anota no "Registro de execução" os comandos e o resultado.
3. **Feche a tarefa:** ela passa a `completed` quando todas as mini-tarefas estão marcadas e os critérios de sucesso foram comprovados por comando. Repita a partir do passo 1 até todas as tarefas estarem `completed`.
4. **Revisão final, uma vez, depois de todas as tarefas:** "revise a feature contra a spec" com **spec-conformance**. Ela revisa tudo de uma vez: requisitos, regras do projeto, testes e o que os registros de execução afirmam. O veredito vai para `reviews/` e para a seção "Revisão final" abaixo.
5. **Se REPROVADO:** o prompt de correção do relatório vira uma rodada de correções; depois, nova revisão final. A feature está pronta quando a revisão final estiver APROVADO (ou APROVADO COM RESSALVAS aceito por você).

## Revisão final
<!-- spec-conformance appends one line per final review. -->
- 2026-11-23 · review-001 · REPROVADO (parcial; 1 bloqueante, 5 importantes) · reviews/review-001.md
- 2026-11-23 · review-002 · APROVADO COM RESSALVAS (0 bloqueantes, 1 importante; 07.3 e e2e dispensados pelo usuário) · reviews/review-002.md

## Restrições globais
- `.agents/rules/code-standards.md`: sem comentários, arquivos `.ts` com até 100 linhas, funções com até 30 linhas, até 3 parâmetros (senão um objeto), sem linhas em branco dentro de funções, constantes no lugar de números e strings mágicas.
- Skills obrigatórias: `layered-backend` (controllers, services, DAOs), `trpc-nextjs` (procedures `tasks.session.*`), `nextjs-folder-structure` (arquivos da web), `software-testing` (todo teste).
- Contratos em `packages/api/src/application/`, implementações em `packages/api/src/infra/`. O SDK só é importado em `infra/terminal/`.
- Toda a interface em português do Brasil, com os textos exatos da spec (seções 5, 6 e 7).
- Migration escrita à mão (`0048_session_interaction.sql` e `_rollback.sql`), registrada em `packages/api/drizzle/meta/_journal.json` e em `packages/api/test/databaseMigrations.ts`.
- Verificação proporcional (AGENTS.md):
  - durante a mini-tarefa, só o arquivo de teste afetado (`pnpm --dir <pacote> exec vitest run <arquivo>`, ou `exec vitest run --config vitest.integration.config.ts <arquivo>` para `packages/api/test/`) e o `typecheck` do pacote;
  - suítes completas só no fim de cada tarefa;
  - e2e só na 07.
- `pnpm --dir packages/api test:integration` sem `TEST_DATABASE_URL` (Postgres descartável, cerca de 1 min). Não matar processos com `pkill -f` que case com o próprio comando.
- Os agentes de planejamento (`packages/api/src/infra/agents/`) não mudam.

## Premissas e bloqueios
- P-09, P-10 e P-11 (spec §11) dependem do spike 01. Se o V-20 negar alguma delas, a 01.3 ajusta a spec (§15, DEC-20, riscos) antes de a 04 começar. A 04 e a 05 seguem o que estiver registrado em `v20-spike.md`.
- A 03.1 remove o lançador do GNOME. Os specs e2e `terminal-execution.spec.ts` e `terminal-tracking.spec.ts` ficam quebrados até a 07.1; unidade, integração, typecheck e build continuam passando.

## Matriz de cobertura
| ID da spec | Descrição curta | Tarefa · mini-tarefa |
|---|---|---|
| P-09, P-10, P-11, DEC-19, DEC-20 | premissas do SDK | 01 · 01.1–01.3 |
| REQ-051 | abrir dentro do Flow Dev | 03 · 03.1; 04 · 04.3 |
| REQ-052, 7.11 | modo de permissões | 03 · 03.1; 06 · 06.1 |
| REQ-053 | serviço fora do ar | 03 · 03.1; 06 · 06.1 |
| REQ-054 | falhou ao abrir | 04 · 04.3 |
| REQ-055, REQ-061 | linha do tempo e histórico | 03 · 03.4; 06 · 06.2 |
| REQ-056 | sem raciocínio, saída e subagentes | 04 · 04.3 |
| REQ-057, NFR-10 | latência na tela e entrega | 05 · 05.2; 06 · 06.2 |
| REQ-058, REQ-059, REQ-060 | enviar mensagem | 03 · 03.2; 05 · 05.2; 06 · 06.5 |
| REQ-062 | exclusão da Issue | 03 · 03.4 |
| REQ-063, REQ-064, REQ-066, 7.9 | perguntas | 02 · 02.4; 06 · 06.3 |
| REQ-065 | resposta entregue e registrada | 05 · 05.1 |
| REQ-067 | pedido já respondido | 02 · 02.2; 03 · 03.3 |
| REQ-068 | pedido sem prazo | 05 · 05.1 |
| REQ-069, REQ-070, 7.10 | aprovação | 02 · 02.4; 06 · 06.4 |
| REQ-071 | Permitir sempre | 04 · 04.1; 05 · 05.1 |
| REQ-072 | Tudo liberado | 05 · 05.1 |
| REQ-073, REQ-074, REQ-075 | interromper, encerrar, leitura | 03 · 03.3; 05 · 05.2; 06 · 06.5 |
| REQ-076–REQ-079 | reinício e retomada | 05 · 05.3 |
| REQ-080, 7.4 | quem controla | 03 · 03.2, 03.3; 06 · 06.2 |
| REQ-081, REQ-082, 7.2 | estados | 02 · 02.3; 03 · 03.4; 06 · 06.2 |
| 7.5 | limites | 02 · 02.4; 03 · 03.2; 04 · 04.3 |
| NFR-11 | falha de gravação não para o Claude; órfãs | 04 · 04.3; 05 · 05.3 |
| NFR-12 | só a própria máquina, sem shell, sem porta | 04 · 04.2, 04.3 |
| NFR-13 | conteúdo guardado e visível a quem vê a tarefa | 03 · 03.4 |
| NFR-14 | acessibilidade | 06 · 06.2–06.5 |
| DEC-16, §20 | serviço sem watch, scripts | 04 · 04.4 |
| DEC-18 | hooks em processo | 04 · 04.3 |
| DEC-21, §14 | tabelas novas | 02 · 02.1, 02.2 |
| Seção 9, REQ-014 | não muda | 03 · 03.1; 07 · 07.1, 07.2 |
| B-22 | deixou de ser operadora | 03 · 03.2; 06 · 06.2 |
| B-23 | mensagem na fila retoma | 05 · 05.3 |
| B-24 | pergunta de subagente | 04 · 04.3 |
| B-25 | `/exit` | 01 · 01.2 |
| B-26 | settings.local.json versionado | 07 · 07.3 |
| B-27 | web fora, serviço segue | 05 · 05.1 |
| B-28 | sessões antigas | 03 · 03.4; 06 · 06.2 |
| B-29 | texto acima de 50.000 | 04 · 04.3 |
| B-30 | interromper sem vez ativa | 05 · 05.2 |
| B-31 | duas sessões em tarefas diferentes | 04 · 04.3 |
| V-20a–k | spike | 01 |
| V-21a–c | máquina de estados | 02 · 02.3 |
| V-21d, V-21e | sem "sem sinal" no Flow Dev; não confirmada | 03 · 03.4 |
| V-22a–f | validação e resumo | 02 · 02.4 |
| V-22g | mapeamento para o SDK | 04 · 04.1 |
| V-23e | corrida no pedido (DAO) | 02 · 02.2 |
| V-23a–d, V-23f–i | interação pela web | 03 · 03.2, 03.3 |
| V-24a, V-24b, V-24g, V-24i | assumir, iniciar, falhar | 04 · 04.3 |
| V-24h | opções do `query()` | 04 · 04.2 |
| V-24c–f | pedidos no serviço | 05 · 05.1 |
| V-24j | entrega das mensagens na fila | 05 · 05.2 |
| V-25a–c | interromper e encerrar | 05 · 05.2 |
| V-26a–e | reinício | 05 · 05.3 |
| V-27a–c, V-27f | gravação da conversa | 04 · 04.3 |
| V-27d, V-27e | exclusão e linha do tempo | 03 · 03.4 |
| V-28a–i | componentes | 06 · 06.2–06.5 |
| V-29a, V-29d | diálogo | 06 · 06.1 |
| V-29b, V-29c | `open` e `preflight` | 03 · 03.1 |
| V-30a, V-30b | e2e | 07 · 07.1 |
| V-31a–c | smoke real | 07 · 07.3 |
| V-32a | migration e sessões antigas | 02 · 02.1 |
| V-32b, V-32f | `open` mantém o resto da Spec A | 03 · 03.1 |
| V-32c–e, V-32g | regressão das Specs A e B | 07 · 07.1, 07.2 |

## Foco de revisão
1. Dois ciclos do serviço (ou dois serviços na mesma máquina) pegam a mesma sessão `opening` → só um chama `runtime.start` → teste em 04.3 (V-24b).
2. Resposta chega para um pedido cuja promessa morreu num reinício → o pedido já está `cancelled`, e a resposta é recusada com `request_closed`, sem tocar no runtime → teste em 03.3 (V-23f) e 05.3 (V-26a).
3. `answerQuestion` com um rótulo que não existe no payload, ou "Permitir sempre" sem regra sugerida → recusado antes de gravar → teste em 02.4 (V-22c, V-22d).
4. Mensagem do subagente (`parent_tool_use_id` preenchido) ou bloco de raciocínio no fluxo do SDK → nada gravado em `task_terminal_messages` → teste em 04.3 (V-27a).
5. Sessão antiga (`runtime = terminal`) aparecendo com campo de mensagem ou sendo assumida pelo serviço → nunca → testes em 03.4 (V-27e) e 06.2 (V-28h).
