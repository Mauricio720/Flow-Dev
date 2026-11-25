---
status: in_progress
title: Verificação final e smoke no GitHub real
type: test
complexity: medium
---

# Task 05: Verificação final e smoke no GitHub real

## Visão geral
Fecha a feature com a definição de pronto da spec (§24): as suítes completas uma vez, typecheck e lint do monorepo, e o smoke manual V-10 num repositório e num quadro de teste, que é a única prova contra o GitHub real (responsável mantido, Ready no ProjectV2 e automações).

<critical>
- LEIA a spec (`spec.md`, §22 a §24) e as regras do projeto (AGENTS.md, `.claude/rules/e2e-testing.md`) antes de começar.
- FAÇA UMA MINI-TAREFA POR VEZ, na ordem. Só marque `[x]` depois de rodar o "Pronto quando" dela e ver passar.
- NÃO corrija código de produto nesta tarefa sem registrar: uma falha aqui volta para a mini-tarefa dona (task_01 a task_04), que é reaberta e corrigida lá.
- NUNCA use o repositório nem o quadro do produto no smoke. Credenciais só por variáveis de ambiente, nunca nos arquivos.
- Ao começar, mude `status` para `in_progress` (aqui e em `_tasks.md`). Mude para `completed` só quando as duas mini-tarefas estiverem marcadas com evidência.
</critical>

## Requisitos
- §24: `pnpm --dir packages/api test`, `pnpm --dir packages/api test:integration` (sem `TEST_DATABASE_URL`), `pnpm --dir apps/web test`, `pnpm typecheck` e `pnpm lint` passam, uma vez cada; migration 0054 aplicada no banco de desenvolvimento; arquivos com até 100 linhas, funções com até 30, sem comentários novos.
- V-10 (US-01 ponta a ponta, US-02 cenário 1, B-05): smoke manual registrado.
- §24 "Spec": a spec é atualizada com o que mudou durante a implementação (desvios dos Registros de execução), e o Histórico ganha uma linha.

## Interfaces
- **Consome:** tudo o que as tasks 01 a 04 entregaram.
- **Produz:** evidência no Registro de execução; nenhuma interface nova.

## Mini-tarefas

- [x] **05.1 — Suítes completas, typecheck, lint e limites de código**
  - **Arquivos:** nenhum de produto; `spec.md` (Histórico e ajustes de desvios registrados)
  - **Testes:** —
  - **Pronto quando:** os cinco comandos de §24 passam, com contagem de testes anotada; `rtk proxy git diff --stat main` revisado; nenhum `.ts`/`.tsx` alterado acima de 100 linhas (`wc -l` dos arquivos do diff); `select count(*) from drizzle.__drizzle_migrations` no banco dev igual ao número de entradas do journal
  - **Nota:** se algo falhar, repita só o que falhou depois da correção na tarefa dona e confirme com uma execução completa daquele pacote.
- [ ] **05.2 — Smoke manual V-10 num quadro de teste**
  - **Arquivos:** nenhum; o roteiro e o resultado vão para o Registro de execução
  - **Testes:** V-10a, V-10b
  - **Pronto quando:** os dois casos executados com Flow Dev local (`pnpm dev`, worker de tarefas rodando), com número da Issue, responsável e status vistos no GitHub anotados no Registro, e as Issues de teste fechadas depois

## Detalhes de implementação
Prepare um repositório de teste em que a conta autorizada tenha escrita, e um quadro ProjectV2 vinculado ao projeto do Flow Dev com Status Backlog, Ready e In Progress. Para o V-10b, use um segundo quadro (ou remova Ready temporariamente) sem a coluna Ready. Veja na memória do projeto as armadilhas do ambiente local (worker sem hot reload, limite de 60 consultas/hora sem token).

### Arquivos relevantes
- `packages/api/package.json`: scripts `test`, `test:integration`, `db:migrate`, `dev`.
- `apps/web/.env.local`: `DATABASE_URL` do banco de desenvolvimento.

### Arquivos afetados
- `docs/specs/atribuicao-e-ready-na-publicacao/spec.md`: Histórico.

### Decisões relacionadas
- Spec §22: sem Playwright novo, porque os gateways do GitHub não são configuráveis por env.

## Premissas
- Há um repositório e um quadro de teste disponíveis para a conta autorizada. Se não houver, a tarefa para em 05.2 com o motivo registrado e a feature segue para a revisão final com essa ressalva.

## Testes atribuídos
- [ ] V-10a: no quadro de teste com Backlog, Ready e In Progress e conta com escrita, publicar com a opção → no GitHub, a Issue tem a conta como única responsável e está em Ready com os pontos do draft; a tela mostra R-1 em até 15 s; em Trabalho atribuído, a Issue aparece em "Atribuídas a você em Ready" pedindo a reivindicação. Anotar se alguma automação do quadro mudou o status (B-05) · manual, GitHub real
- [ ] V-10b: no quadro sem Ready, publicar com a opção → a tela mostra M-2 e nenhuma Issue nova aparece no repositório; refazer a prévia e publicar sem a opção → a Issue vai para Backlog · manual, GitHub real

## Critérios de sucesso
- As duas mini-tarefas marcadas, com os comandos e as observações no Registro.
- Os cinco comandos de §24 passando na mesma árvore.
- V-10a e V-10b registrados, ou a ausência de quadro de teste registrada como ressalva.

## Registro de execução
<!-- Uma entrada por mini-tarefa: data · mini-tarefa · o que foi feito · comandos e resultado · desvios. -->
- 2026-11-25 · 05.1 · Suítes completas na mesma árvore, sem `TEST_DATABASE_URL`: `pnpm --dir packages/api test` → 133 arquivos, 824 testes passam; `pnpm --dir packages/api test:integration` → 162 arquivos passam (2 ignorados), 792 testes passam (5 ignorados); `pnpm --dir apps/web test` → 107 arquivos, 566 testes passam; `pnpm typecheck` (api e web) sem erros; `pnpm lint` sem erros. Nenhum `.ts`/`.tsx` alterado ou novo tem mais de 100 linhas (verificado com `wc -l` sobre `git diff --name-only` e arquivos não rastreados). Banco dev: `drizzle.__drizzle_migrations` = 53 e journal = 53 entradas; colunas `assign_to_self` e `ready_assignment` presentes. `spec.md` ganhou linha no Histórico com os desvios. Observação: `packages/api/.preflight.tmp.ts` é anterior a esta feature (24/11) e não foi tocado.

