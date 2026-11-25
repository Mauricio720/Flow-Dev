---
status: pending
title: Ponta a ponta, smoke e entrega
type: test
complexity: medium
---

# Task 08: Ponta a ponta, smoke e entrega

## Visão geral
Liga as partes e prova a jornada: um spec Playwright em que a operadora inicia e vê Reprovada, Executando e Aprovada sem recarregar; um smoke opcional com o Claude real e a skill spec-conformance; e o portão de entrega de §24, com as suítes completas, o build e a spec e o `_tasks.md` atualizados.

<critical>
- LEIA a spec (§22, §23 V-14 e V-15, §24) e as regras do projeto (AGENTS.md/CLAUDE.md, `.agents/rules/e2e-testing.md`, `.agents/rules/code-standards.md`) antes de começar.
- FAÇA UMA MINI-TAREFA POR VEZ, na ordem. Só marque `[x]` depois de rodar o "Pronto quando" dela e ver passar.
- NÃO saia dos arquivos listados sem registrar o motivo no Registro de execução. Nada fora do escopo da spec.
- TESTES JUNTO COM O CÓDIGO: cada mini-tarefa implementa os testes atribuídos a ela, seguindo a skill de testes do projeto (`.claude/skills/software-testing/SKILL.md`). Isso quer dizer: asserção sobre o efeito observável e específico, nada de `toBeTruthy` ou de só checar que não lança exceção; valor esperado tirado da spec, nunca recalculado a partir do código; dublês só em dependências lentas, variáveis ou externas; relógio e aleatoriedade controlados. Em bug, reproduza antes de corrigir.
- Ao começar, mude `status` para `in_progress` (aqui e em `_tasks.md`). Mude para `completed` só quando todas as mini-tarefas estiverem marcadas e os critérios de sucesso tiverem sido comprovados por comando. A revisão contra a spec acontece uma vez, depois de todas as tarefas: não a espere aqui, mas não marque nada que não tenha prova, porque ela vai conferir.
</critical>

## Requisitos
- US-01–US-03 ponta a ponta (V-14): as partes ligadas na tela, com o app, o serviço de sessões, o runtime roteirizado e o banco de teste.
- DEC-02 e DEC-08 com a skill real (V-15): a primeira revisão grava `reviews/etapa.md` válido; a continuação na mesma sessão grava relatório novo e atualiza o documento.
- §24: `pnpm typecheck`, `pnpm lint`, `pnpm --dir packages/api test`, `pnpm --dir packages/api test:integration` (sem `TEST_DATABASE_URL`), `pnpm --dir apps/web test` e `pnpm build` passando; e2e passando ou `test.fixme` com motivo e o V-05a verde como substituto; smoke feito ou registrado como não feito; spec sem `[PRECISA ESCLARECER]` e atualizada com o que mudou.

## Interfaces
- **Consome:** tudo das tarefas 01–07; `apps/web/e2e/task-plan.spec.ts`, `apps/web/e2e/sessionWorkerSetup.ts` e `apps/web/e2e/fixtures/` (sementes, `signInAs`, roteiros); a variável `FLOW_DEV_REAL_CLAUDE=1` já usada pelos smokes opcionais.
- **Produz:** `apps/web/e2e/review-cycle.spec.ts`; `packages/api/test/review-cycle-real-claude.test.ts` (opcional, pulado sem a variável); atualizações em `spec.md` (status e o que mudou) e em `_tasks.md` (estado, premissas resolvidas).

## Mini-tarefas

- [ ] **08.1 — Jornada e2e da revisão**
  - **Arquivos:** `apps/web/e2e/review-cycle.spec.ts` (criar), `apps/web/e2e/fixtures/` (alterar: semente com conjunto concluído e roteiros por finalidade)
  - **Testes:** V-14
  - **Pronto quando:** `pnpm --dir apps/web test:e2e review-cycle.spec.ts` passa; ou o spec está `test.fixme` com o motivo do bloqueio da verificação do GitHub (o mesmo de `task-plan.spec.ts`), e `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/review-cycle-rounds.test.ts` (V-05a, substituto) passa. Registre qual dos dois.
- [ ] **08.2 — Smoke opcional com o Claude real**
  - **Arquivos:** `packages/api/test/review-cycle-real-claude.test.ts` (criar), uma fixture pequena com spec, `_tasks.md` e uma tarefa concluída em `packages/api/test/fixtures/` (criar)
  - **Testes:** V-15
  - **Pronto quando:** sem `FLOW_DEV_REAL_CLAUDE`, `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/review-cycle-real-claude.test.ts` informa o teste como pulado; o resultado com a variável, se a operadora rodar, fica no Registro (feito ou "não feito").
- [ ] **08.3 — Portão de entrega e atualização da spec**
  - **Arquivos:** `docs/specs/revisao-automatica-da-feature/spec.md` (alterar: status, histórico e o que mudou na implementação, como o número da migration e a coluna do papel da vez), `docs/specs/revisao-automatica-da-feature/_tasks.md` (alterar)
  - **Testes:** §24 (portão)
  - **Pronto quando:** `pnpm typecheck`, `pnpm lint`, `pnpm --dir packages/api test`, `pnpm --dir packages/api test:integration`, `pnpm --dir apps/web test` e `pnpm build` passam, cada um rodado uma vez e com a saída resumida no Registro; `grep -n "PRECISA ESCLARECER" docs/specs/revisao-automatica-da-feature/spec.md` sem resultado.

## Detalhes de implementação
- Espelhe `apps/web/e2e/task-plan.spec.ts`: semente pelo fixture, serviço de sessões de teste por `sessionWorkerSetup.ts`, roteiros pelo `FAKE_SCRIPT_VARIABLE`. Com o roteiro por finalidade (03.1), grave um roteiro `review` com duas vezes (REPROVADO e depois APROVADO, com `wait_message` entre elas) e um roteiro `review_execute` que grava `etapa: review`.
- Locators acessíveis (`getByRole`, `getByLabel`, `getByText`), sem esperas fixas: espere pelo texto "Rodada 2 · Revisando com …" e por "Aprovada na rodada 2". Sem recarregar a página em nenhum passo.
- O smoke segue o padrão dos smokes opcionais da Spec C/D (`FLOW_DEV_REAL_CLAUDE=1`), com `describe.skipIf`; ele usa a skill real do pacote `flow-dev` e confere só o documento de etapa e a existência de um relatório novo a cada vez.
- O e2e completo pertence ao portão; rode só o spec afetado.

### Arquivos relevantes
- `apps/web/e2e/task-plan.spec.ts`, `sessionWorkerSetup.ts`, `fixtures/`.
- `packages/api/test/task-plan-journey.test.ts`: substituto automático da Spec D.
- Smokes opcionais existentes (procure `FLOW_DEV_REAL_CLAUDE` em `packages/api/test/`).

### Arquivos afetados
- `spec.md` e `_tasks.md` desta pasta.

### Decisões relacionadas
- DEC-02, DEC-08 (spec §17).

## Premissas
- Os e2e da tela do trabalho estão `test.fixme` por causa da verificação do GitHub (§22). Se o bloqueio ainda valer, o V-14 fica `test.fixme` com o motivo, e o V-05a é o substituto.

## Testes atribuídos
- [ ] V-14 (US-01–03): a operadora entra no trabalho com 2 de 2 tarefas concluídas, abre "Revisão", vê Claude Code · Opus · Máximo nos dois campos, clica "Iniciar revisão" → vê "Rodada 1 · Revisando com Claude Code · Opus · Máximo", depois a rodada 1 com "Reprovada" e "Rodada 1 · Executando com …", depois "Rodada 2 · Revisando com …" e por fim "Aprovada na rodada 2", sem recarregar; a aba Execução lista exatamente duas sessões do ciclo · Playwright + app + serviço de sessões + runtime roteirizado + banco de teste.
- [ ] V-15 (DEC-02, DEC-08): Claude real numa fixture pequena → a primeira vez grava `reviews/etapa.md` com `etapa` válida e `relatorio` apontando um `review-NNN.md` novo; depois de uma mensagem de continuação na mesma sessão, um `review-MMM.md` com MMM > NNN e o documento atualizado · Claude real, opcional.
- [ ] §24: portão de entrega (comandos acima), sem `[PRECISA ESCLARECER]` e com a spec atualizada.

## Critérios de sucesso
- Todas as mini-tarefas marcadas, cada uma com o "Pronto quando" executado.
- Todos os testes atribuídos implementados e passando, ou o V-14 `test.fixme` com motivo e o V-05a verde; o V-15 feito ou registrado como não feito.
- As suítes completas de §24 passam numa execução final.
- Nenhuma regra do AGENTS.md violada.

## Registro de execução
<!-- The implementer appends one entry per mini-task: date, what was done, commands run with their result, deviations. -->
