---
schema_version: "compozy.tasks/v2"
workflow: acompanhamento-e-artefatos
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
      to: task_05
    - from: task_05
      to: task_06
    - from: task_06
      to: task_07
    - from: task_04
      to: task_08
    - from: task_07
      to: task_08
---

# Tarefas: Acompanhamento e artefatos da execução no terminal

> **Spec:** [spec.md](spec.md) · **Data:** 2026-11-22 · **Total:** 8 tarefas, 27 mini-tarefas · **Plano aprovado pelo usuário em 2026-11-22**

## Objetivo
A sessão do Claude aberta pela Spec A avisa o Flow Dev por hooks HTTP. A tarefa mostra a etapa "Execução no terminal", com o estado, os eventos e o histórico. Todo `.md` que uma skill escreve no clone vira um artefato da tarefa, guardado no Postgres com versões e visível na tela.

## Estado
<!-- Keep this table in sync with each task file's frontmatter `status`. The implementer updates it when starting and finishing a task. -->
| Tarefa | Tipo | Complexidade | Depende de | Mini-tarefas | Status |
|---|---|---|---|---|---|
| [01 — Spike V-15 dos hooks HTTP do Claude Code](task_01.md) | test | high | — | 3/3 | completed |
| [02 — Migration 0047 e schema do acompanhamento](task_02.md) | backend | medium | — | 2/2 | completed |
| [03 — Recebimento dos eventos da sessão](task_03.md) | backend | critical | 01, 02 | 5/5 | completed |
| [04 — Captura dos artefatos](task_04.md) | backend | high | 03 | 3/3 | completed |
| [05 — Leitura da execução, contratos dos artefatos, REQ-014 e expurgo](task_05.md) | backend | high | 03 | 5/5 | completed |
| [06 — Etapa Execução no terminal na tela](task_06.md) | frontend | medium | 05 | 4/4 | completed |
| [07 — Artefatos na tela](task_07.md) | frontend | medium | 06 | 3/3 | completed |
| [08 — Ponta a ponta e entrega](task_08.md) | test | medium | 04, 07 | 1/2 | in_progress |

**Ondas:**
1. 01 ‖ 02. O spike é manual e não toca no código; a migration não depende do formato dos payloads. A spec põe o V-15 antes de tudo, então nenhuma tarefa de código além da 02 começa antes dele.
2. 03.
3. 04 ‖ 05. Arquivos disjuntos, exceto a composição: a 04 mexe em `terminalEventComposition.ts`, e a 05 em `terminalComposition.ts` e `composition.ts`.
4. 06. Pode rodar junto com a 04, porque fica só em `apps/web/src/features/issues/assigned-work`.
5. 07.
6. 08.

## Como executar (controle)
Veja o progresso e a próxima mini-tarefa liberada a qualquer momento: `python3 -I .claude/skills/spec-to-tasks/scripts/tasks_status.py docs/specs/acompanhamento-e-artefatos`.

1. **Escolha** a próxima tarefa liberada: `pending`, e todas as de que ela depende estão `completed`.
2. **Implemente** numa sessão nova: "implemente a mini-tarefa 03.1 de `docs/specs/acompanhamento-e-artefatos/task_03.md`" (ou a tarefa inteira). O implementador:
   - muda o `status` para `in_progress`;
   - marca `[x]` em cada mini-tarefa só depois de rodar o "Pronto quando" dela;
   - anota no "Registro de execução" os comandos e o resultado.
3. **Feche a tarefa:** ela passa a `completed` quando todas as mini-tarefas estão marcadas e os critérios de sucesso foram comprovados por comando. Repita a partir do passo 1 até todas as tarefas estarem `completed`.
4. **Revisão final, uma vez, depois de todas as tarefas:** "revise a feature contra a spec" com **spec-conformance**. Ela revisa tudo de uma vez: requisitos, regras do projeto, testes e o que os registros de execução afirmam. O veredito vai para `reviews/` e para a seção "Revisão final" abaixo.
5. **Se REPROVADO:** o prompt de correção do relatório vira uma rodada de correções; depois, nova revisão final. A feature está pronta quando a revisão final estiver APROVADO (ou APROVADO COM RESSALVAS aceito por você).

## Revisão final
<!-- spec-conformance appends one line per final review, starting with "- ", e.g. "2026-11-24 · review-001 · REPROVADO (2 bloqueantes) · reviews/review-001.md" -->
- 2026-11-22 · review-001 · REPROVADO (0 bloqueantes, 2 importantes, 5 menores) · reviews/review-001.md
- 2026-11-22 · review-002 (parcial, sem a 08.2) · APROVADO COM RESSALVAS (2 menores) · reviews/review-002.md

## Restrições globais
- Regras de `.agents/rules/code-standards.md` em todo código novo:
  - sem comentários;
  - arquivo `.ts` com no máximo 100 linhas;
  - funções com no máximo 30 linhas e até 3 parâmetros;
  - sem linhas em branco dentro de funções;
  - sem números ou textos mágicos.
- Skills obrigatórias:
  - `layered-backend` no backend;
  - `trpc-nextjs` em procedures e routers;
  - `nextjs-folder-structure` no frontend.
- Antes de mexer em `apps/web`, leia `apps/web/AGENTS.md`, `apps/web/DESIGN.md` e o guia de Next em `apps/web/node_modules/next/dist/docs/`. Para `after()`, leia `01-app/03-api-reference/04-functions/after.md`.
- Contratos ficam em `packages/api/src/application/`, implementações em `packages/api/src/infra/`. Leitor do clone, escritor de settings e DAOs ficam atrás de interfaces, para usar fakes nos testes.
- O Flow Dev só observa:
  - nada escreve no clone nem no GitHub (§9);
  - a captura só lê arquivos;
  - o endpoint nunca devolve JSON de decisão.
- A pasta lida é sempre o `checkout_path` gravado na sessão, nunca um valor da requisição (§18).
- O banco guarda só o que a NFR-04 lista:
  - nenhuma saída de comando;
  - nenhum conteúdo de arquivo editado, exceto as versões de artefatos;
  - os logs nunca levam o token nem o conteúdo.
- Textos da UI e mensagens em pt-BR, exatamente como na spec (US-03, US-05, REQ-014, REQ-021, REQ-022, REQ-046, §7.5).
- As inputs tRPC novas levam `projectId` e `taskId`, como as demais procedures `tasks.*` (decisão do usuário na Spec A, 2026-11-22).
- Verificação proporcional (AGENTS.md):
  - durante a mini-tarefa, só os arquivos de teste afetados:
    - `pnpm --dir packages/api exec vitest run <arquivo>` (unidade);
    - `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts <arquivo>` (integração);
    - `pnpm --dir apps/web exec vitest run <arquivo>` (web);
  - o `typecheck` do pacote, uma vez por mini-tarefa;
  - suíte completa do pacote uma vez, no fim da tarefa;
  - `pnpm build` e Playwright só na task_08.
- Testes de integração rodam sem `TEST_DATABASE_URL`, porque o Postgres descartável sobe sozinho. A 0047 entra em `FEATURE_MIGRATIONS` de `packages/api/test/databaseMigrations.ts`.
- Os testes de route handler ficam em `packages/api/test/`, como `terminal-attachment-routes.test.ts`, e importam o `route.ts` de `apps/web` pelo caminho relativo.
- Não alterar `~/.claude` nem o comportamento da Spec A além do que esta spec pede (§9).

## Premissas e bloqueios
- **Nenhuma questão aberta na spec.** As premissas abaixo foram aprovadas com o plano em 2026-11-22. A revisão final deve conferi-las.
- **P-A, nome da skill:** `/flow-dev:spec-writer` (o namespace do plugin da Spec A) e `/spec-writer` gravam a skill como `spec-writer`, sem o prefixo. Vale também para `tool_input.skill`. Dona: 03.2.
- **P-B, prompt com `/skill`:** gera dois eventos, primeiro `prompt` e depois `skill`, para o prompt continuar registrado (REQ-018). Comandos embutidos (`/exit`, `/clear`, `/compact`…) não viram skill; o V-15c registra se eles chegam ao `UserPromptSubmit`. Dona: 03.2.
- **P-C, resumo dos eventos:** `summary` guarda o valor cru: caminho, comando, prompt, aviso ou motivo. A tela acrescenta o verbo ("Editou …", "Rodou: …"). Donas: 03.2 e 06.2.
- **P-D, arquivo fora do clone:** o `file_edit` guarda o caminho absoluto, como veio. A captura o ignora (B-18). Dona: 03.2.
- **P-E, falha na captura:** `last_failure` guarda a mensagem em pt-BR da REQ-046 e é limpo na próxima captura bem-sucedida. Se o arquivo falha antes de existir alguma versão, o artefato é criado com `latest_version = 0` e a falha. Dona: 04.2.
- **P-F, onde ficam os artefatos:** dentro da aba "Execução no terminal", numa seção "Artefatos". Dona: 07.3.
- **P-G, e2e V-19:** se esbarrar na mesma trava de GitHub do V-10a da Spec A, fica `test.fixme` com a mesma anotação `feature-gate`, e o smoke real V-19c cobre o fluxo. Dona: 08.1.
- **P-H, IDs dos testes da migration:** `MIG-a` a `MIG-f`, porque a matriz da spec não tem uma linha V para a migration. Dona: 02.
- **P-I, inputs dos artefatos:** `tasks.artifacts.list({ projectId, taskId })` e `tasks.artifacts.get({ projectId, taskId, artifactId, version? })` levam o escopo, conforme a restrição global. É um desvio consciente da §15. Dona: 05.3; a §15 é atualizada na 08.2.
- **P-J, rótulo para leitores:** quem só lê vê "Aguardando a pessoa operadora" no lugar de "Aguardando você", como já faz `READER_TAB_STATE_LABELS` em `stageTabs.ts`. Dona: 06.2.
- **P-K, "Não confirmada" na leitura:** a transição condicional (sessão `opening` há mais de 60 s) roda no `byId` antes do `snapshot`, porque o snapshot pode ser uma transação só de leitura. Dona: 05.1.

## Matriz de cobertura
| ID da spec | Descrição curta | Tarefa · mini-tarefa |
|---|---|---|
| V-15a, V-15b | Hooks com Bearer chegam; `--plugin-dir` + `--settings` juntos | 01 · 01.1 |
| V-15c–g, P-07 | `/skill` no prompt, ferramenta Skill, Flow Dev fora, 401/413, `SessionEnd` | 01 · 01.2 |
| §24 (v15-spike.md, §15 ajustada) | Registro do spike | 01 · 01.3 |
| §14, §20 (migration e rollback), MIG-a–e | Migration 0047 | 02 · 02.1 |
| §14 (estado `launch_failed`), MIG-f | Schema e `markLaunchFailed` com `status` | 02 · 02.2 |
| REQ-017, §7.2, REQ-021 (regra), B-06 (regra), B-11, V-05a–h | Máquina de estados | 03 · 03.1 |
| REQ-018, REQ-019, REQ-041 (detecção), §7.8 (skill ativa), NFR-04, §7.5 (cortes), V-06a–l | Summarizer | 03 · 03.2 |
| DEC-02, DEC-04, NFR-02 (token), §9 (comando e agentes de planejamento), V-07e, V-07f, V-20e | Token, settings e `--settings` | 03 · 03.3 |
| REQ-041 (ingestão), REQ-026 (controller), B-06, B-17 (ingestão), V-07g–k | Ingestão | 03 · 03.4 |
| DEC-03, REQ-026, NFR-03, B-07 (servidor), B-10, §19 (token e tamanho), V-07a–d, V-07l, V-07m | Route handler de eventos | 03 · 03.5 |
| REQ-048 (fora do clone e link), §7.8 (caminho), REQ-046 (leitura), V-16d, V-16e, V-17c–e, V-17k | `CheckoutFileReader` | 04 · 04.1 |
| REQ-042, REQ-043 (versão só se mudou), DEC-12, DEC-13, P-08 (conteúdo, versões, skill, tarefa, sessão e caminho), REQ-044, REQ-046 (gravação), REQ-047, B-20, B-21, US-05 (3, 4), V-16a–c, V-16f–h, V-17a, V-17f–h | `ArtifactCaptureService` | 04 · 04.2 |
| DEC-14, NFR-07, B-19, §9 (status e clone), §19 (captura), V-17b, V-17i, V-17j, V-17l, V-20f, V-20g | Captura no `Stop` e no `SessionEnd` | 04 · 04.3 |
| REQ-021 (gravação na leitura), REQ-022, REQ-023 (servidor), REQ-034 (servidor), §7.5 (200 eventos), DEC-07, B-05, V-08a–g | Leitura da execução | 05 · 05.1 |
| REQ-024 (servidor), REQ-045 (servidor), V-08h, V-08i | `tasks.byId.execution` | 05 · 05.2 |
| REQ-050, §7.4 (artefatos), V-20b–d | `tasks.artifacts.list/get` | 05 · 05.3 |
| REQ-014 (servidor), V-08j | `allowAdditional` e `session_already_active` | 05 · 05.4 |
| REQ-049, V-20a | Expurgo | 05 · 05.5 |
| REQ-016, REQ-020, DEC-08, V-08k, V-08l | Polling a 3 s, aba e linha do tempo | 06 · 06.1 |
| US-03 (1–4), REQ-022 (UI), B-07 (UI), NFR-08 (estado), V-08m–p | `ExecutionStage` | 06 · 06.2 |
| REQ-023 (UI), REQ-034 (UI), REQ-024 (UI), V-08q, V-08r | Histórico e modo leitura | 06 · 06.3 |
| REQ-014 (UI), V-08s | Confirmação da segunda sessão | 06 · 06.4 |
| REQ-045 (lista), REQ-046 (UI), V-18a, V-18e | `ArtifactList` | 07 · 07.1 |
| US-05 (1, 2), NFR-08 (artefatos), NFR-09, V-18b–d | `ArtifactViewer` | 07 · 07.2 |
| §7.4 (ver artefatos, sem editar), V-18f | Montagem e visão de membro | 07 · 07.3 |
| V-19a, V-19b | E2E com eventos simulados | 08 · 08.1 |
| V-19c, §20 (ordem), §24 | Smoke real, suítes completas, spec atualizada | 08 · 08.2 |

## Foco de revisão
1. Payload de `PostToolUse` com `tool_response` contendo o conteúdo do arquivo ou a saída do comando → nada disso no evento gravado → V-06k em 03.2.
2. `Write` em `docs/specs/x/link.md`, um link simbólico para `/etc/hostname.md`, com skill ativa → nenhum artefato, nada lido fora do clone → V-16e em 04.1.
3. `Stop` e `SessionEnd` chegando quase juntos, com as duas capturas em paralelo → uma versão por conteúdo, sem duplicar nem violar o unique (`artifact_id`, `version`) → V-17b em 04.3.
4. Token de uma sessão `ended` reutilizado → `204` sem gravar, e o `settings.json` já apagado → V-07j em 03.4.
5. Artefato com `<script>alert(1)</script>` e `<img onerror>` → texto escapado, nenhum elemento `script` nem atributo `on*` no DOM → V-18c em 07.2.
