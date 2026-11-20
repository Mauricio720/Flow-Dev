# Execução no CompozyOS: pendências

Estado em 2026-11-20, depois do merge do PR #1 (`de0feb9`). Este documento lista o que **falta** para fechar a feature "execução da tarefa roteada no CompozyOS".

A spec completa (`_spec.md`, `_dx.md`, `_uiux.md`, `_user_stories.md`, `_tests.md`, `_slices.md`, `adrs/`) está em `.compozy/tasks/flow-dev-compozy-execution/` na máquina de quem conduziu a feature. Essa pasta **não foi versionada**. Se for retomar em outra máquina ou checkout, copie-a antes.

## O que já está na `main`

| Fatia | Conteúdo |
| --- | --- |
| S1 | Migração `0045`, porta `CompozyGateway`, adaptador com `@compozy/client@0.7.3`, inspeção do clone git, router `projectCompozy` |
| S2 | Seção "Execução no CompozyOS" nas Configurações do projeto |
| S3 | `taskExecution.start`, `status` e `cancel`; plano da rota Execução direta; projeção de estado; reconciliação na leitura |
| S4 | Aba Execução na tela da tarefa e estado na lista de trabalho ativo |
| S5 | Rotas Tech Spec e PRD, com `specFiles` e `reviewSpec` |
| R1 | Instrução ao revisor da Task para registrar o veredito |

## Pendências

### 1. S6: painel de revisão da spec (frontend)

Sem ele, o estado "Spec pronta para revisão" não tem tela: não dá para ler os arquivos da spec nem aprovar, pedir mudanças ou rejeitar pela interface. O backend (S5) já está pronto.

- Escopo: `_uiux.md` S3 e US-008 e US-009.
- Havia uma sessão (Sonnet) trabalhando nela, com cerca de 41 arquivos alterados e **nenhum commit**, na worktree `flow-dev-compozy-execution-s6` (branch `feat/flow-dev-compozy-execution-s6`, base `61b0e79`). Esse trabalho não está na `main`. Confira se a worktree ainda existe antes de reaproveitá-la.

### 2. S7: documentação e testes de ponta a ponta

- Atualizar `apps/web/PRODUCT.md` (linhas sobre a execução removida e sobre a aprovação do planejamento) e `apps/web/DESIGN.md`, se houver padrão novo.
- Documentar as variáveis de ambiente: `COMPOZY_URL`, `COMPOZY_EXECUTION_PROVIDER`, `COMPOZY_EXECUTION_MODEL` e `COMPOZY_EXECUTION_REASONING` (padrões `claude`, `claude-opus-5-5` e `high`). O repositório não tem `.env.example`; hoje valem só `apps/web/.env.local`.
- Rodar E2E-001 a E2E-005 como portão da feature.

### 3. Revisão automática sem veredito (bloqueia o fluxo completo)

No CompozyOS real, o pedido de revisão chega a `in_review`, mas a sessão do agente `reviewer` fica ativa **sem nenhuma mensagem** e nenhum veredito é registrado. O R1 só adiciona a instrução ao revisor; **não resolveu**.

- Com `code_implementer` no perfil de revisão, o roteador responde `blocked` ("no eligible reviewer").
- O provider padrão dos agentes do CompozyOS (`pi`) falha ao abrir sessão. O worker de execução funciona porque o Flow Dev grava provider, modelo e raciocínio no perfil da Task, mas esse runtime **não parece chegar** à sessão do revisor.
- Provável correção fora do Flow Dev: definir provider explícito na definição do agente `reviewer` ou corrigir o provider padrão do daemon.
- Consequência hoje: uma execução concluída fica sem veredito, e a rejeição automática com nova rodada nunca dispara.

### 4. Verificação contra o CompozyOS real ainda incompleta

- `spec_conductor` como worker de Task criando sessões filhas: **não verificado**. A documentação indica que uma sessão criada por spawn não cria filhas. A rota com spec (Tech Spec e PRD) depende disso na Task de entrega. A alternativa prevista na spec é o Flow Dev abrir a sessão `spec_conductor` e ligá-la ao run.
- Fluxo completo das rotas com spec (spec, aprovação, entrega, PR): **nunca rodado de ponta a ponta**.
- Rodar a sonda opt-in (`COMPOZY_SMOKE=1`, `test/compozy-execution-smoke.test.ts`) com a correção do item 3.

### 5. Testes que existem mas não rodaram

- **E2E-002, E2E-004 e E2E-005 (S4)** estão escritos, mas não rodaram localmente: a leitura do projeto pede credencial do GitHub que não existe no ambiente de teste.
- **E2E-001 (S2)** só roda com `COMPOZY_URL` apontando para o daemon falso do teste.
- **E2E-003 de `apps/web/e2e/project-admin.spec.ts`** falha por escopo OAuth (`repo project offline_access` recebido, `repo offline_access` esperado). Anterior a esta feature.

### 6. Sem revisão independente

Nenhuma das fatias passou por revisão de um `reviewer` independente. Fazer uma revisão antes de considerar a feature pronta, principalmente de S3 e S5 (orquestração, idempotência e concorrência).

### 7. Detalhes conhecidos

- Cancelar uma execução cujo run está em `needs_attention` com tentativas esgotadas volta `compozy_rejected` (o daemon recusa). A interface deve mostrar o estado real.
- `addDependency` repetido depois de uma queda pode voltar `compozy_rejected` (409); a rota de spec decide se trata como sucesso.
- O resumo da revisão usa `reason ?? review_text`; não ficou confirmado qual campo o daemon preenche.
- `pnpm-lock.yaml` recebeu ruído de re-resolução de peers na S1.
- Fora do escopo desta feature: remover o código e as tabelas da execução antiga (`task_execution_*`, `task_spec_*`, `local_*`, `software_*`, `packages/api/runtime/`) e as variáveis antigas de `apps/web/.env.local`.

## Para colocar no ar

1. Registrar no CompozyOS o workspace do repositório do projeto e subir o daemon (`127.0.0.1:2123`).
2. Definir `COMPOZY_URL` e, se quiser outro runtime, `COMPOZY_EXECUTION_*` em `apps/web/.env.local`.
3. No clone do projeto, garantir `origin/HEAD` (`git remote set-head origin --auto`); sem isso o vínculo fica inválido.
4. Em Projeto, Configurações, "Execução no CompozyOS": informar a pasta do clone e verificar.
