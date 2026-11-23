---
status: pending
title: Captura nas sessões do plano
type: backend
complexity: medium
---

# Task 06: Captura nas sessões do plano

## Visão geral
Na sessão do plano, o agente marca as mini-tarefas e muda o `status` em `task_NN.md` sem nenhuma skill ativa. Pela REQ-048 isso não viraria artefato, e o plano nunca liberaria a sessão seguinte. Esta tarefa abre uma exceção estreita (DEC-23). Na ingestão, numa sessão ligada a um item do plano e sem skill ativa, as edições de `.md` dentro da pasta do conjunto de tarefas ficam com `skill = "plano-de-execucao"`. Daí em diante, a captura da Spec B cria as versões como já faz.

<critical>
- LEIA a spec (`docs/specs/tarefas-e-plano-de-execucao/spec.md`, §6 REQ-089 e REQ-103, §8 B-37 e B-40, §9, §16 "Captura", DEC-23), a Spec B (`docs/specs/acompanhamento-e-artefatos/spec.md`, REQ-042, REQ-046–048) e as regras do projeto (AGENTS.md/CLAUDE.md, `.agents/rules/code-standards.md`) antes de começar. Use a skill `layered-backend`.
- FAÇA UMA MINI-TAREFA POR VEZ, na ordem. Só marque `[x]` depois de rodar o "Pronto quando" dela e ver passar.
- NÃO saia dos arquivos listados sem registrar o motivo no Registro de execução. Nada fora do escopo da spec.
- TESTES JUNTO COM O CÓDIGO: cada mini-tarefa implementa os testes atribuídos a ela, seguindo a skill de testes do projeto (`software-testing`). Isso quer dizer: asserção sobre o efeito observável e específico, nada de `toBeTruthy` ou de só checar que não lança exceção; valor esperado tirado da spec, nunca recalculado a partir do código; dublês só em dependências lentas, variáveis ou externas; relógio e aleatoriedade controlados. Em bug, reproduza antes de corrigir.
- Ao começar, mude `status` para `in_progress` (aqui e em `_tasks.md`). Mude para `completed` só quando todas as mini-tarefas estiverem marcadas e os critérios de sucesso tiverem sido comprovados por comando. A revisão contra a spec acontece uma vez, depois de todas as tarefas: não a espere aqui, mas não marque nada que não tenha prova, porque ela vai conferir.
</critical>

## Requisitos
- REQ-103: enquanto uma sessão do plano estiver ativa, todo `.md` da pasta do conjunto de tarefas que ela criar ou editar vira artefato, mesmo sem skill ativa, atribuído a "Plano de execução" (o valor gravado é `plano-de-execucao`; o rótulo na tela fica na task_07).
- B-40 / §9: fora da pasta do conjunto, e em qualquer sessão que não seja do plano, a captura continua exigindo skill ativa (REQ-042 e REQ-048).
- Com skill ativa, a skill continua sendo a atribuída. A exceção só vale sem skill.
- B-37: se o arquivo sumiu do clone, a captura mostra "Arquivo não encontrado no clone" (REQ-046), e a tarefa mantém o status da última versão capturada (REQ-089).
- DEC-23: a exceção fica limitada a uma pasta (`task_session_plans.tasks_folder`) e às sessões com `plan_item_id`.

## Interfaces
- **Consome:**
  - da task_03: as colunas `task_terminal_sessions.plan_item_id` e `task_session_plans.tasks_folder`;
  - da task_02: `readTaskSet` ou `tasks.taskSet.get`, para o V-39e;
  - existente: `planIngestion` (`src/application/services/terminal/terminalEventIngestion.ts`), `LockedSession` (`src/application/database/dao/terminalEventDao.ts`), `DrizzleTerminalEventDao.withLockedSession` (`src/infra/database/dao/terminal/drizzleTerminalEventDao.ts`), a captura (`artifactCaptureService.ts`), e os caminhos de `file_edit`, que já são relativos ao clone (`hookToolEvents.ts`).
- **Produz:**
  - `LockedSession.planTasksFolder: string | null`;
  - `PLAN_EXECUTION_SKILL = "plano-de-execucao"`, exportada de `src/application/services/terminal/planCaptureRule.ts`;
  - `isPlanTaskFile(path: string, folder: string): boolean`, no mesmo arquivo.

## Mini-tarefas

- [ ] **06.1 — Regra de atribuição na ingestão**
  - **Arquivos:** `packages/api/src/application/services/terminal/planCaptureRule.ts` e `planCaptureRule.test.ts` (criar), `packages/api/src/application/database/dao/terminalEventDao.ts` (`planTasksFolder` em `LockedSession`), `packages/api/src/application/services/terminal/terminalEventIngestion.ts` (no `advance`, um `file_edit` sem skill ativa em sessão com `planTasksFolder`, cujo caminho passa em `isPlanTaskFile`, fica com `PLAN_EXECUTION_SKILL`)
  - **Testes:** V-39f
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run src/application/services/terminal/planCaptureRule.test.ts` passa; `pnpm --dir packages/api typecheck` sem erros
- [ ] **06.2 — Pasta do plano no lock da sessão e a captura de ponta a ponta**
  - **Arquivos:** `packages/api/src/infra/database/dao/terminal/drizzleTerminalEventDao.ts` (`withLockedSession` traz `tasks_folder` pelo `plan_item_id` → item → plano, com `left join`), `packages/api/test/plan-capture.test.ts` (criar)
  - **Testes:** V-39a, V-39b, V-39c, V-39d, V-39e
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/plan-capture.test.ts test/artifact-capture.test.ts test/terminal-event-ingestion.test.ts` passa; `pnpm --dir packages/api typecheck` sem erros

## Detalhes de implementação
- `isPlanTaskFile(path, folder)` é verdadeiro quando `path` termina em `.md` e começa com `folder + "/"`. Normalize os dois com `path.posix.normalize`, e recuse caminho absoluto ou com `..`. Assim `docs/specs/login-old/x.md` não casa com `docs/specs/login` (Foco de revisão 2). Subpastas da pasta (`docs/specs/login/reviews/x.md`) casam, porque estão dentro da pasta do conjunto.
- O `advance` de `terminalEventIngestion.ts` hoje grava `skill: progress.activeSkill` no `file_edit`. A regra entra só quando `activeSkill` é `null`, e não muda `activeSkill` da sessão.
- O `select … for update` de `withLockedSession` passa a fazer `left join` com `task_session_plan_items` e `task_session_plans`. Mantenha o `for update` só na linha da sessão (`for update of task_terminal_sessions`).
- Nos testes de integração, use o mundo da Spec B (`test/artifact-capture-support.ts`, `test/terminal-event-support.ts` e `test/terminal-hook-payloads.ts`) e semeie o plano e o item direto no banco, com `test/plan-support.ts` da task_04 se já existir, ou com inserts. Assim esta tarefa não espera a task_04.

### Arquivos relevantes
- `packages/api/test/artifact-capture.test.ts`: V-16a e V-16b da Spec B, o padrão a espelhar (edição sob skill → versão; sem skill → só o evento).
- `packages/api/src/application/services/terminal/artifactCaptureService.ts`: o que a captura faz com os eventos que têm skill.

### Arquivos afetados
- Os listados nas mini-tarefas.

### Decisões relacionadas
- DEC-23 (spec §17): captura nas sessões do plano sem skill ativa, só na pasta.

## Premissas
- A edição do `_tasks.md` pela sessão do plano também é capturada (está na pasta) e gera uma versão nova do manifesto. Isso não deixa o plano `stale`: a reconciliação da task_04 compara o grafo, não o número da versão (`_tasks.md`, "Premissas e bloqueios").

## Testes atribuídos
- [ ] V-39f: `isPlanTaskFile("docs/specs/login/task_01.md", "docs/specs/login")` → verdadeiro; `"docs/specs/login-old/task_01.md"` → falso; `"docs/specs/login/notas.txt"` → falso; `"docs/specs/login/../x.md"` → falso; `"/abs/docs/specs/login/task_01.md"` → falso · função pura
- [ ] V-39a: sessão com `plan_item_id` de um plano em `docs/specs/login`, sem skill ativa, edita `docs/specs/login/task_01.md` no clone temporário e termina a vez (`Stop`) → o evento `file_edit` tem `skill = 'plano-de-execucao'`, e `task_artifact_versions` ganha uma versão desse arquivo com `skill = 'plano-de-execucao'` e o conteúdo do disco (REQ-103) · ingestão + captura + Postgres + clone temporário
- [ ] V-39b: a mesma sessão edita `README.md` e `docs/specs/outra/spec.md` → nenhum artefato desses caminhos, e os eventos ficam com `skill` nula (B-40) · ingestão + captura + Postgres + clone temporário
- [ ] V-39c: sessão de rota (`plan_item_id` nulo), sem skill, edita `docs/specs/login/task_01.md` → nenhum artefato (§9, REQ-048) · ingestão + captura + Postgres + clone temporário
- [ ] V-39d: sessão do plano com `spec-to-tasks` ativa edita `docs/specs/login/task_02.md` → versão com `skill = 'spec-to-tasks'` · ingestão + captura + Postgres + clone temporário
- [ ] V-39e: `task_01.md` capturado com `status: in_progress`; o arquivo é apagado do clone e a sessão do plano registra outra edição dele e termina a vez → `task_artifacts.last_failure` com "Arquivo não encontrado no clone", nenhuma versão nova, e `readTaskSet` sobre as versões guardadas continua devolvendo a 01 `in_progress` (B-37) · ingestão + captura + Postgres + clone temporário

## Critérios de sucesso
- Todas as mini-tarefas marcadas, cada uma com o "Pronto quando" executado.
- Todos os testes atribuídos implementados e passando.
- `pnpm --dir packages/api test` e `pnpm --dir packages/api test:integration` passando ao fim da tarefa, incluindo `artifact-capture*` e `terminal-event-route*` da Spec B.
- `pnpm --dir packages/api typecheck` sem erros.

## Registro de execução
<!-- Uma entrada por mini-tarefa: data, o que foi feito, comandos e resultado, desvios. -->
