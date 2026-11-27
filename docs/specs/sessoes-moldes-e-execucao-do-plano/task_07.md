---
status: completed
title: Jornada e2e e verificação final
type: test
complexity: high
---

# Task 07: Jornada e2e e verificação final

## Visão geral
Prova a feature ponta a ponta: a operadora monta duas sessões-molde, salva, executa o plano, e a segunda sessão começa sozinha até "Plano concluído", com UI, API, Postgres e worker reais e a sessão do agente roteirizada. Fecha com as suítes completas da Definição de pronto.

<critical>
- LEIA a spec e as regras do projeto (AGENTS.md/CLAUDE.md, `.agents/rules/e2e-testing.md`) antes de começar. Use a skill `e2e-environment` antes de qualquer Playwright.
- FAÇA UMA MINI-TAREFA POR VEZ, na ordem. Só marque `[x]` depois de rodar o "Pronto quando" dela e ver passar.
- NÃO saia dos arquivos listados sem registrar o motivo no Registro de execução. Nada fora do escopo da spec.
- TESTES JUNTO COM O CÓDIGO: cada mini-tarefa implementa os testes atribuídos a ela, seguindo a skill de testes do projeto (`software-testing`). Isso quer dizer: asserção sobre o efeito observável e específico, nada de `toBeTruthy` ou de só checar que não lança exceção; valor esperado tirado da spec, nunca recalculado a partir do código; dublês só em dependências lentas, variáveis ou externas; relógio e aleatoriedade controlados. Em bug, reproduza antes de corrigir.
- Ao começar, mude `status` para `in_progress` (aqui e em `_tasks.md`). Mude para `completed` só quando todas as mini-tarefas estiverem marcadas e os critérios de sucesso tiverem sido comprovados por comando. A revisão contra a spec acontece uma vez, depois de todas as tarefas: não a espere aqui, mas não marque nada que não tenha prova, porque ela vai conferir.
</critical>

## Requisitos
- US-01 a US-03 ponta a ponta (V-10).
- NFR-01: a Sessão 2 começa em até 10 s depois que a 01 fica `completed` e o agente termina a vez; a tela mostra o novo estado em até 5 s depois disso (espera de até 15 s na asserção, sem aumentar o `testTimeout`).
- §24: `pnpm --dir apps/web e2e:prepare` depois da migration nova, e o spec do V-10 passa sem `fixme`.
- §24: `pnpm --dir packages/api test`, `pnpm --dir packages/api test:integration`, `pnpm --dir apps/web test`, `pnpm typecheck` e `pnpm lint` passam.
- `.agents/rules/e2e-testing.md`: teste independente, sem produção, locators acessíveis (`getByRole`, `getByLabel`), dados criados e limpos pelo próprio teste.

## Interfaces
- **Consome:** tudo das tasks 01–06; `apps/web/e2e/fixtures` (`seed`, `workSeed`, `signInAs`, `createGitRepository`, `writeSessionScript`); `apps/web/e2e/fixtures/taskPlanScripts.ts` (`TASKS_FOLDER`, `MANIFEST`, `taskFile`).
- **Produz:** `WorkSeed.taskSet(work, files)` (semeia o conjunto de tarefas nos artefatos, sem a sessão de geração) e `apps/web/e2e/plan-run.spec.ts`.

## Mini-tarefas

- [x] **07.1 — Jornada "Executar o plano" com a segunda sessão começando sozinha**
  - **Arquivos:** `apps/web/e2e/fixtures/workSeed.ts` (método `taskSet`; extraia para `fixtures/taskSetSeed.ts` se passar de 100 linhas), `apps/web/e2e/fixtures/planRunScripts.ts` (criar), `apps/web/e2e/plan-run.spec.ts` (criar)
  - **Testes:** V-10
  - **Pronto quando:** `pnpm --dir apps/web e2e:prepare` roda; `pnpm --dir apps/web test:e2e plan-run.spec.ts` passa sem `fixme` nem `skip`
  - **Nota:** o conjunto de tarefas é semeado direto nos artefatos (o V-41 da Spec D ainda tem a lacuna da geração pela sessão falsa). Arraste com `locator.dragTo` (DEC-06).
- [x] **07.2 — Suítes completas da Definição de pronto**
  - **Arquivos:** nenhum novo; corrija só o que falhar e registre
  - **Testes:** —
  - **Pronto quando:** `pnpm --dir packages/api test`, `pnpm --dir packages/api test:integration`, `pnpm --dir apps/web test`, `pnpm typecheck` e `pnpm lint` passam numa execução completa cada; a saída resumida (contagens) fica no Registro de execução

## Detalhes de implementação
Espelhe `apps/web/e2e/task-plan.spec.ts` (vincular o clone, abrir a aba Tarefas, editar o plano) e `route-switch.spec.ts` (sessão roteirizada até o fim). O worker de sessões do e2e sobe por `apps/web/e2e/sessionWorkerSetup.ts`.

### Arquivos relevantes
- `apps/web/e2e/fixtures/sessionScript.ts`: o roteiro é um arquivo por clone (`session-scripts/<sha256 do caminho>.json`).
- `apps/web/e2e/fixtures/taskPlanScripts.ts`: `MANIFEST`, `taskFile(id, status, …)` e `EXECUTION_SCRIPT` (grava `task_01.md` como `completed` e termina a vez).
- `apps/web/e2e/fixtures/workSeed.ts`: `approvedWork`, `specArtifact`, `cleanup`.

### Arquivos afetados
- `workSeed.ts` e os arquivos novos.

### Decisões relacionadas
- DEC-06: `dragTo` cobre o arrastar nativo.

## Premissas
- **Roteiro por sessão:** como o roteiro é um por clone, as duas sessões lêem o mesmo arquivo. Abordagem: um roteiro que grava, na mesma vez, `task_01.md` `completed` se ela ainda está `pending`, e senão `task_02.md` `completed`. Se o executor do roteiro (procure quem lê `session-scripts`, com a skill `e2e-environment`) não tiver passo condicional, use a alternativa: a Sessão 1 faz uma pergunta (`ask`, conta como agente trabalhando, B-04); o teste troca o roteiro para o da Sessão 2 e só então responde. Registre qual caminho foi usado. Se nenhum couber sem mudar o executor do roteiro, pare e registre o bloqueio, sem `fixme`.
- O seed do conjunto de tarefas grava os mesmos artefatos que a captura da sessão de geração gravaria; confira o formato em `packages/api/test/plan-capture.test.ts`.

## Testes atribuídos
- [x] V-10: operadora com clone vinculado e conjunto semeado (01 `pending`; 02 `pending`, depende da 01) → em "Tarefas", "Nova sessão" duas vezes, arrasta a 01 para a "Sessão 1" (`dragTo`), em "Adicionar tarefas" da Sessão 2 marca a 02 e aplica, "Salvar"; "Executar o plano" → `status` "Executando · Sessão 1"; o roteiro marca a 01 `completed` e termina a vez → em até 15 s o `status` mostra "Executando · Sessão 2" sem clique; o roteiro marca a 02 → "Plano concluído", e nenhuma terceira sessão do agente aparece · UI + API + Postgres + worker, sessão do agente roteirizada

## Critérios de sucesso
- Todas as mini-tarefas marcadas, cada uma com o "Pronto quando" executado.
- `plan-run.spec.ts` passa sem `fixme`/`skip`; as suítes da §24 passam.
- Nenhum `testTimeout` aumentado e nenhum worker reduzido para contornar lentidão.
- `_tasks.md` com todas as tarefas `completed` e pronto para a revisão final (spec-conformance).

## Registro de execução
<!-- Uma entrada por mini-tarefa: data, o que foi feito, comandos e resultado, desvios. -->
- 2026-11-26 · 07.1 · `fixtures/taskSetSeed.ts` + `WorkSeed.taskSet`, `fixtures/planRunScripts.ts`, `MANIFEST`/`taskFile` exportados de `taskPlanScripts.ts`, `e2e/plan-run.spec.ts` · `pnpm --dir apps/web e2e:prepare` e `pnpm --dir apps/web test:e2e e2e/plan-run.spec.ts` → 1 passed, 0 skipped, três execuções seguidas · desvios: (1) o worker do e2e não recebia `GITHUB_REPOSITORY_CLIENT_ID/SECRET` e o lançador dele monta a autorização de trabalho, então todo início automático falhava; `sessionWorkerSetup.ts` agora passa valores fictícios quando não há (a revisão automática tinha a mesma lacuna no e2e). (2) Roteiro: foi usada a alternativa da premissa: a Sessão 1 faz uma pergunta (agente trabalhando), o teste troca o roteiro e responde pela conversa. (3) O `dragTo` só funciona sem rolagem durante o arrasto, então o spec usa uma janela de 1280×2000. (4) A sessão falsa termina antes da releitura de 5 s, então "Executando · Sessão 2" não é observável na tela; o spec confere no banco que a segunda sessão do agente foi aberta para a Sessão 2 sem clique e espera "Plano concluído" em até 15 s. (5) `planDragData` passou a cancelar também o `dragenter` e definir `dropEffect`.
- 2026-11-26 · 07.2 · `pnpm typecheck` → exit 0; `pnpm lint` → sem erros (só `apps/web` tem script de lint); `pnpm --dir packages/api test` e `pnpm --dir apps/web test` → 145 arquivos/921 testes e 121 arquivos/659 testes passaram; `pnpm --dir packages/api test:integration` → 202 arquivos passaram, 2 pulados (915 testes passaram, 5 pulados; nenhum desta feature).

