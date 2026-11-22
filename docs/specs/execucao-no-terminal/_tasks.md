---
schema_version: "compozy.tasks/v2"
workflow: execucao-no-terminal
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
    - from: task_01
      to: task_03
    - from: task_02
      to: task_03
    - from: task_03
      to: task_04
    - from: task_03
      to: task_05
    - from: task_04
      to: task_06
    - from: task_05
      to: task_06
    - from: task_06
      to: task_07
---

# Tarefas: Abrir a execução no terminal a partir do planejamento aprovado

> **Spec:** [spec.md](spec.md) · **Data:** 2026-11-22 · **Total:** 7 tarefas, 27 mini-tarefas · **Plano aprovado pelo usuário em 2026-11-22**

## Objetivo
Com o planejamento aprovado, a pessoa operadora abre, pelo diálogo "Abrir no terminal", o GNOME Terminal na pasta do próprio clone. Lá roda o Claude Code com todas as permissões, as quatro skills do Flow Dev, os anexos escolhidos e o prompt revisado como primeira mensagem.

## Estado
<!-- Keep this table in sync with each task file's frontmatter `status`. The implementer updates it when starting and finishing a task. -->
| Tarefa | Tipo | Complexidade | Depende de | Mini-tarefas | Status |
|---|---|---|---|---|---|
| [01 — Spike V-00 do terminal, das skills e dos anexos](task_01.md) | test | high | — | 3/3 | completed |
| [02 — Vínculo do clone local ao projeto](task_02.md) | backend | medium | — | 5/5 | completed |
| [03 — Abertura da sessão no servidor](task_03.md) | backend | critical | 01, 02 | 6/6 | completed |
| [04 — Anexos no servidor](task_04.md) | backend | high | 03 | 6/6 | completed |
| [05 — Diálogo de abertura no terminal](task_05.md) | frontend | medium | 03 | 3/3 | completed |
| [06 — Anexos no diálogo de abertura](task_06.md) | frontend | medium | 04, 05 | 2/2 | completed |
| [07 — Ponta a ponta e entrega](task_07.md) | test | medium | 06 | 2/2 | completed |

**Ondas:**
1. 01 ‖ 02 (o spike é manual e não toca no código; o vínculo pode começar junto).
2. 03.
3. 04 ‖ 05 (arquivos disjuntos: `packages/api` + `apps/web/src/app/api/terminal-attachments` contra `apps/web/src/features/issues/assigned-work`).
4. 06.
5. 07.

## Como executar (controle)
Veja o progresso e a próxima mini-tarefa liberada a qualquer momento: `python3 -I .claude/skills/spec-to-tasks/scripts/tasks_status.py docs/specs/execucao-no-terminal`.

1. **Escolha** a próxima tarefa liberada: `pending`, e todas as de que ela depende estão `completed`.
2. **Implemente** numa sessão nova: "implemente a mini-tarefa 02.1 de `docs/specs/execucao-no-terminal/task_02.md`" (ou a tarefa inteira). O implementador:
   - muda o `status` para `in_progress`;
   - marca `[x]` em cada mini-tarefa só depois de rodar o "Pronto quando" dela;
   - anota no "Registro de execução" os comandos e o resultado.
3. **Feche a tarefa:** ela passa a `completed` quando todas as mini-tarefas estão marcadas e os critérios de sucesso foram comprovados por comando. Repita a partir do passo 1 até todas as tarefas estarem `completed`.
4. **Revisão final, uma vez, depois de todas as tarefas:** "revise a feature contra a spec" com **spec-conformance**. Ela revisa tudo de uma vez: requisitos, regras do projeto, testes e o que os registros de execução afirmam. O veredito vai para `reviews/` e para a seção "Revisão final" abaixo.
5. **Se REPROVADO:** o prompt de correção do relatório vira uma rodada de correções; depois, nova revisão final. A feature está pronta quando a revisão final estiver APROVADO (ou APROVADO COM RESSALVAS aceito por você).

## Revisão final
<!-- spec-conformance appends one line per final review, starting with "- ", e.g. "2026-11-24 · review-001 · REPROVADO (2 bloqueantes) · reviews/review-001.md" -->
- 2026-11-22 · review-001 · REPROVADO (1 bloqueante, 5 importantes) · reviews/review-001.md
- 2026-11-22 · review-002 · APROVADO COM RESSALVAS, a aceitar (2 importantes: smoke V-10b pela UI e board_missing fora do escopo) · reviews/review-002.md

## Restrições globais
- Regras de `.agents/rules/code-standards.md` em todo código novo: sem comentários, arquivo `.ts` com no máximo 100 linhas, funções com no máximo 30 linhas, até 3 parâmetros, sem linhas em branco dentro de funções, sem números ou textos mágicos.
- Skills obrigatórias: `layered-backend` (backend), `trpc-nextjs` (procedures e routers), `nextjs-folder-structure` (frontend). Antes de mexer em `apps/web`, leia `apps/web/AGENTS.md` e o guia de Next em `apps/web/node_modules/next/dist/docs/`.
- Contratos em `packages/api/src/application/`, implementações em `packages/api/src/infra/`. Lançador, inspetor git, ferramenta de PATH, file store e construtor de contexto ficam atrás de interfaces, para usar fakes nos testes.
- Nunca passar por shell: `execFile`/`spawn` com array de argumentos e `shell: false` (NFR-01). A pasta sempre vem do vínculo salvo e revalidado, nunca da requisição.
- Textos da UI e mensagens de erro em pt-BR, exatamente como na spec (§5, §6, §7.1, §7.6).
- As inputs tRPC de `tasks.terminal.*` levam `projectId` e `taskId`, como as demais procedures `tasks.*` (decisão do usuário, 2026-11-22).
- A abertura só funciona com `FLOW_DEV_TERMINAL_ENABLED=true` no ambiente do servidor (Q-01 respondida: sim). Sem ela, `open` recusa com `terminal_disabled`.
- Verificação proporcional (AGENTS.md): durante a mini-tarefa, só os arquivos de teste afetados (`pnpm --dir <pacote> exec vitest run <arquivo>`, ou `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts <arquivo>` para integração) e o `typecheck` do pacote. Suíte completa do pacote uma vez, no fim da tarefa. `pnpm build` e Playwright só na task_07.
- Testes de integração: rode sem `TEST_DATABASE_URL` (o Postgres descartável sobe sozinho). Toda migration nova entra em `FEATURE_MIGRATIONS` de `packages/api/test/databaseMigrations.ts`.
- Não alterar `~/.claude`, o clone do projeto nem as tabelas legadas `local_machines` e `local_project_links`.

## Premissas e bloqueios
- **Q-01 (respondida):** a trava por `FLOW_DEV_TERMINAL_ENABLED=true` está ligada. Mensagem: "A abertura no terminal está desligada. Defina FLOW_DEV_TERMINAL_ENABLED=true no .env.local e reinicie o Flow Dev." Dona: 03.5.
- **Q-03 (decidida pelo V-00, ver `v00-spike.md`):** o `--add-dir` abre um diálogo a cada sessão e foi trocado por `--plugin-dir`; os comandos usam o namespace do plugin (`/flow-dev:direct-executor`, `/flow-dev:spec-writer`), que sempre vale a skill do Flow Dev. Original (superado): sem resposta do usuário, vale a sugestão da spec: a skill do Flow Dev deve prevalecer. Se o spike (01.2) mostrar que a do repositório prevalece, as cópias e o comando passam a usar o prefixo `flow-` (`flow-spec-writer`, `/flow-direct-executor`…). A task_01 registra o resultado em `v00-spike.md`; as mini-tarefas 03.1 e 03.3 seguem esse registro.
- **Q-02 (aberta, sem impacto):** valem os textos da §7.3.
- **`launch_failed`:** a §14 não tem coluna para esse estado, e a Spec B migra "as que têm `launch_failed` registrado". Por isso a 0046 acrescenta `launch_failed_at timestamptz null` e `launch_error text null` a `task_terminal_sessions` (02.1). A spec é atualizada na 07.2.
- **Nome das imagens da Issue:** `task_images` não guarda nome. O nome exibido vem do texto alternativo da imagem no corpo; se ele estiver vazio, usa `imagem-<n>.<ext>` (04.4).
- **Origem das skills:** a pasta `.claude/skills` da raiz do monorepo, encontrada subindo a partir de `process.cwd()` até achar `pnpm-workspace.yaml`. A variável `FLOW_DEV_SKILLS_DIR` sobrescreve o caminho, para testes (03.3).

## Matriz de cobertura
| ID da spec | Descrição curta | Tarefa · mini-tarefa |
|---|---|---|
| V-00a–e | Spike manual do terminal, das skills e da leitura de anexos | 01 · 01.1–01.3 |
| P-02, P-03, P-06 | Premissas confirmadas pelo spike | 01 · 01.1–01.3 |
| Q-03 | Precedência da skill de mesmo nome | 01 · 01.2 |
| §24 (v00-spike.md, §15 ajustada) | Registro do spike | 01 · 01.3 |
| §14, §20, DEC-06 | Migration 0046 e rollback | 02 · 02.1 |
| REQ-001 | Salvar, trocar, remover o próprio vínculo | 02 · 02.4 |
| REQ-002, REQ-003, §7.1 | Quatro validações e mensagens | 02 · 02.2–02.4 |
| REQ-004 | Cada pessoa vê só o próprio vínculo | 02 · 02.4 |
| US-01 (1–3), B-02, B-08 | Cenários do vínculo | 02 · 02.3–02.5 |
| V-01a–l | Integração e unidade do vínculo | 02 · 02.2–02.4 |
| V-01m–o | Componente da seção "Meu repositório local" | 02 · 02.5 |
| NM-05 | Edição de detalhes, quadro e agentes continua só de admin | 02 · 02.4 |
| REQ-007, REQ-037, §7.3, B-16 | Prompt pré-preenchido | 03 · 03.1 |
| V-02a–g | Builder do prompt | 03 · 03.1 |
| NFR-01, B-09, DEC-01, DEC-05 | Linha de comando sem shell | 03 · 03.2 |
| REQ-012 | Claude ou terminal ausentes | 03 · 03.2 (detecção), 03.5 (recusa) |
| V-04a–c, V-04g | Lançador | 03 · 03.2 |
| NM-04, V-11e | Agentes de planejamento sem `--add-dir` | 03 · 03.2 |
| REQ-036, REQ-038, REQ-039, §7.7, DEC-11 | Skills copiadas por sessão | 03 · 03.3 |
| NM-08, V-04d–f | Cópia das skills; `~/.claude` e clone intocados | 03 · 03.3 |
| REQ-005, REQ-006 (servidor), REQ-009 (servidor), §7.4 | Preflight | 03 · 03.4 |
| V-03a–c | Preflight: operadora, aprovação, vínculo | 03 · 03.4 |
| REQ-010, REQ-011, REQ-013, B-04, Q-01 | Validações do `open` | 03 · 03.5 |
| V-03d–h, V-03k, V-03l | Validações do `open` | 03 · 03.5 |
| REQ-015, REQ-040 (servidor), §16 passos 4–6 | Idempotência, transação, disparo, `launch_failed` | 03 · 03.6 |
| V-03i, V-03j | Mesmo `requestKey`; falha no disparo | 03 · 03.6 |
| NM-01, NM-02, NM-03, V-11c, V-11d, V-11f | Status inalterados; nada abre sozinho; sem GitHub | 03 · 03.6 |
| OBS-01, OBS-02, OBS-03 | Logs de abertura, falha de disparo, skill ausente | 03 · 03.6 |
| REQ-029, §7.6, B-13 | Tipos, assinatura, nome seguro | 04 · 04.1 |
| V-12a–d, V-12h | Regras puras dos anexos | 04 · 04.1 |
| REQ-030 (envio), NFR-06, DEC-09 | Staging, limites, dedupe, permissões | 04 · 04.2 |
| V-12e–g, V-12k | Serviço e file store | 04 · 04.2 |
| REQ-027 (servidor), V-12i | Route handlers de anexos | 04 · 04.3 |
| OBS-04 | Log de anexo recusado | 04 · 04.3 |
| REQ-028, B-12 (servidor) | Imagens da Issue no preflight | 04 · 04.4 |
| V-13a, V-13b | Ordem do corpo; 10 marcadas | 04 · 04.4 |
| REQ-031, REQ-030 (abertura), B-15, DEC-10 | `open` com anexos | 04 · 04.5 |
| NM-07, V-11b | Imagens do composer inalteradas | 04 · 04.5 |
| V-13c–e, V-13g, V-13h | Entrega na sessão, seção Anexos, limites, ids alheios | 04 · 04.5 |
| REQ-033, REQ-035, B-14, REQ-025 | Limpeza 24 h e 7 dias; expurgo da Issue | 04 · 04.6 |
| V-12j, V-13f, V-11a | Limpeza e expurgo | 04 · 04.6 |
| OBS-05 | Log da limpeza | 04 · 04.6 |
| REQ-005 (UI), B-01 | Ação só para a operadora com aprovação | 05 · 05.1 |
| V-09a | Ação | 05 · 05.1 |
| REQ-006, REQ-008, REQ-009, REQ-013 (UI), B-03, NFR-05 (diálogo) | Diálogo | 05 · 05.2 |
| V-09b–g | Diálogo | 05 · 05.2 |
| US-02 (1–5), REQ-040 (UI), NM-06 | Confirmação e linha "Execução aberta…" | 05 · 05.3 |
| V-09h–k | Confirmação | 05 · 05.3 |
| REQ-027 (UI), REQ-032, NFR-05 (anexos) | Picker | 06 · 06.1 |
| V-14a, V-14b, V-14d, V-14f | Picker | 06 · 06.1 |
| US-04 (1–4), REQ-028 (UI), B-12 (UI), B-15 (UI) | Integração no diálogo | 06 · 06.2 |
| V-14c, V-14e, V-14g–i | Integração no diálogo | 06 · 06.2 |
| V-10a | E2E com lançador falso | 07 · 07.1 |
| V-10b, §24 | Smoke real, suítes completas, spec atualizada | 07 · 07.2 |

## Foco de revisão
1. Prompt começando com `-`, ou com `$(rm -rf ~)`, crases e aspas → chega como um único argumento literal, depois de `--`, sem shell → V-04b e V-04g em 03.2.
2. Duas confirmações simultâneas com o mesmo `requestKey` → uma linha, uma janela, a mesma `sessionId` → V-03i em 03.6.
3. `open` com o id de um anexo de outra pessoa, de outra tarefa ou já ligado a outra sessão → `attachment_missing`, nada abre → V-13h em 04.5.
4. Arquivo `.png` com conteúdo de ZIP, ou `.txt` com byte nulo → recusado com a mensagem da §7.6 → V-12b e V-12c em 04.1.
5. Falha no disparo do terminal → pasta da sessão apagada, sessão com `launch_failed_at`, resposta `terminal_unavailable`, nenhum anexo perdido no staging de outras aberturas → V-03j em 03.6.
