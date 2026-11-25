---
schema_version: "compozy.tasks/v2"
workflow: atribuicao-e-ready-na-publicacao
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
  edges:
    - from: task_01
      to: task_03
    - from: task_02
      to: task_03
    - from: task_03
      to: task_04
    - from: task_04
      to: task_05
---

# Tarefas: Atribuir a mim e colocar em Ready ao criar a Issue

> **Spec:** [spec.md](spec.md) · **Data:** 2026-11-25 · **Total:** 5 tarefas, 14 mini-tarefas

## Objetivo
Na prévia da publicação, a pessoa autora marca "Atribuir a mim e colocar em Ready". A Issue nasce no GitHub com ela como responsável e entra em Ready, ou a publicação é recusada antes de criar quando falta quadro, coluna Ready ou escrita. O resultado aparece na tela sem recarregar.

## Estado
| Tarefa | Tipo | Complexidade | Depende de | Mini-tarefas | Status |
|---|---|---|---|---|---|
| [01 — Regras e gateways do GitHub com status de destino e responsável](task_01.md) | backend | medium | — | 4/4 | completed |
| [02 — Migration 0054, gravação e leitura do resultado](task_02.md) | backend | high | — | 3/3 | completed |
| [03 — Publicação e worker com a opção](task_03.md) | backend | high | 01, 02 | 3/3 | completed |
| [04 — Opção na prévia e resultado na tela](task_04.md) | frontend | medium | 03 | 2/2 | completed |
| [05 — Verificação final e smoke no GitHub real](task_05.md) | test | medium | 04 | 1/2 | in_progress |

**Podem rodar em paralelo:** 01 e 02, desde o início. Os arquivos são disjuntos: a 01 mexe em regras, gateways e serviço do quadro, e a 02 mexe em migration, schema, DAOs e leitura. A 03 junta as duas, a 04 consome os tipos do tRPC da 03, e a 05 fecha a feature.

Estes arquivos foram gerados sem a aprovação prévia do plano de quebra, porque o pedido foi "salve os arquivos e pare para minha revisão". A revisão dos arquivos substitui essa aprovação.

## Como executar (controle)
Veja o progresso e a próxima mini-tarefa liberada a qualquer momento: `python3 -I .claude/skills/spec-to-tasks/scripts/tasks_status.py docs/specs/atribuicao-e-ready-na-publicacao`.

1. **Escolha** a próxima tarefa liberada: `pending`, e todas as de que ela depende estão `completed`.
2. **Implemente** numa sessão nova: "implemente a mini-tarefa 01.1 de `task_01.md`" (ou a tarefa inteira). O implementador:
   - muda o `status` para `in_progress`;
   - marca `[x]` em cada mini-tarefa só depois de rodar o "Pronto quando" dela;
   - anota no "Registro de execução" os comandos e o resultado.
3. **Feche a tarefa:** ela passa a `completed` quando todas as mini-tarefas estão marcadas e os critérios de sucesso foram comprovados por comando. Repita a partir do passo 1 até todas as tarefas estarem `completed`.
4. **Revisão final, uma vez, depois de todas as tarefas:** "revise a feature contra a spec" com **spec-conformance**. Ela revisa tudo de uma vez: requisitos, regras do projeto, testes e o que os registros de execução afirmam. O veredito vai para `reviews/` e para a seção "Revisão final" abaixo.
5. **Se REPROVADO:** o prompt de correção do relatório vira uma rodada de correções; depois, nova revisão final. A feature está pronta quando a revisão final estiver APROVADO (ou APROVADO COM RESSALVAS aceito por você).

## Revisão final
<!-- spec-conformance acrescenta aqui uma linha por revisão final: data · review-NNN · veredito · caminho do relatório. -->

## Restrições globais
- Sem a opção, nada muda: o corpo da criação é idêntico ao de hoje (sem `assignees`), a Issue vai para Backlog e a falha no quadro só vai para o log (spec §9).
- O vínculo do quadro continua exigindo só Backlog (`resolve` e `BacklogStatusMissingError`, `projectsController.ts:50`), e a correção em lote continua colocando em Backlog.
- A conta atribuída sai do servidor: o login vem do `GET /user` da elegibilidade. A tela só envia `assignToSelf: boolean`, nunca login nem id (NFR-01, REQ-004).
- Nada é refeito nem desfeito depois de criar a Issue: sem botão "Tentar de novo", sem reverter, e o resultado gravado não é sobrescrito (REQ-015, DEC-04).
- A prévia (`tasks.preview`) não faz consulta nova ao GitHub. O aceite com a opção reaproveita a leitura do quadro que já faz, e o worker acrescenta só uma leitura do quadro antes de criar (NFR-02).
- Os textos M-1 a M-3 e R-0 a R-4 são copiados literalmente da spec (§7, RN-05 e RN-06), em pt-BR.
- A migration é a **0054**, com `_rollback.sql`. Confira o journal antes: a 0052 e a 0053 estão reservadas pelas specs das Issues #6 e #9. Se elas ainda não existirem quando a 02 rodar, não crie buracos sem registrar a decisão no Registro de execução da task_02.
- Código (`.claude/rules/code-standards.md`): arquivos `.ts`/`.tsx` com até 100 linhas, funções com até 30 linhas e até 3 parâmetros, sem comentários novos, sem linhas em branco dentro de funções, strings e números em constantes. `githubIssueGateway.ts` já tem 100 linhas, `taskPublicationWorkerController.ts` 91, `drizzleTaskReadDao.ts` 90 e `taskPublicationController.ts` 84: extraia antes de acrescentar.
- Os construtores de `TaskPublicationController` e `TaskPublicationWorkerController` já passam de 3 parâmetros. Não acrescente parâmetros: o `ReadyAssignmentService` entra no lugar do atual `backlog?: BacklogPlacementService`.
- Backend: skill `layered-backend`. tRPC: skill `trpc-nextjs`. Frontend: skill `nextjs-folder-structure` e `apps/web/DESIGN.md`. Testes: skill `software-testing`.
- Verificação durante o trabalho: `pnpm --dir <pacote> exec vitest run <arquivo>` e, para testes de `packages/api/test/`, `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts <arquivo>`, sem `TEST_DATABASE_URL`. Typecheck do pacote uma vez por mini-tarefa. As suítes completas, `pnpm typecheck` e `pnpm lint` rodam uma única vez, na task_05.
- Não há Playwright novo (spec §22): a jornada ponta a ponta é o smoke manual V-10, num repositório e num quadro de teste, nunca no repositório do produto.

## Premissas e bloqueios
- **Spec:** sem questões em aberto. P-01 e P-02 da spec são seguidas como escritas (P-02: duas tentativas automáticas também para o Ready).
- **PT-01 (task_03, confirmada por você em 2026-11-25):** um erro ao ler o quadro numa conferência com a opção é traduzido assim: limite de consultas → `provider_rate_limited`; escopo de projetos faltando → `repository_authorization_needed`, como hoje; qualquer outra falha, inclusive quadro fechado ou inacessível (`ProjectBoardNotFoundError`, `RepositoryForbiddenError`), → `provider_unavailable`. A spec só diz "a mensagem atual de GitHub indisponível ou de limite" (REQ-008).
- **PT-02 (task_02):** o limite de 2 minutos é medido a partir de `issue_created_at`: com 1 min 59 s o estado é `pending`; com exatamente 2 min, `unconfirmed`.
- **PT-03 (task_02):** `recordReadyAssignment` só grava quando `ready_assignment` ainda é nulo e devolve `false` quando já havia valor; quem chama não trata isso como erro.

## Matriz de cobertura
| ID da spec | Descrição curta | Tarefa · mini-tarefa |
|---|---|---|
| US-01 | Publicar já atribuída e em Ready | 03 · 03.3; 04 · 04.1; 05 · 05.2 |
| US-02 | Erro claro quando falta estrutura | 03 · 03.2; 04 · 04.1 |
| US-03 | Saber o que faltou depois de criar | 03 · 03.3; 04 · 04.2 |
| REQ-001 | Opção na prévia, desmarcada | 04 · 04.1 |
| REQ-002 | Criar com a conta de RN-02 como única responsável | 03 · 03.3 |
| REQ-003 | Ready com os pontos quando a atribuição é confirmada | 01 · 01.2; 03 · 03.1 |
| REQ-004 | Só a conta de RN-02, nunca a da tela | 03 · 03.3 |
| REQ-005 | Recusa antes de criar, primeiro motivo de RN-05 | 01 · 01.1; 03 · 03.2 |
| REQ-006 | Conferir no aceite e antes de criar | 03 · 03.2, 03.3 |
| REQ-007 | Recusa no worker devolve para revisão | 03 · 03.3 |
| REQ-008 | Quadro ilegível recusa sem criar | 03 · 03.2 |
| REQ-009 | Draft intacto e publicar sem a opção | 03 · 03.2; 04 · 04.1 |
| REQ-010 | Sem a conta → Backlog e `not_assigned` | 03 · 03.1, 03.3 |
| REQ-011 | Ready falha 2 vezes → `ready_failed` | 03 · 03.1, 03.3 |
| REQ-012 | Mostrar o resultado com a mensagem de RN-06 | 02 · 02.2; 04 · 04.2 |
| REQ-013 | R-0 por até 2 minutos, troca sem recarregar | 02 · 02.2; 04 · 04.2 |
| REQ-014 | R-4 depois de 2 minutos | 02 · 02.2; 04 · 04.2 |
| REQ-015 | Nada refeito nem desfeito depois | 02 · 02.3; 03 · 03.3; 04 · 04.2 |
| RN-01 | Opção desmarcada a cada prévia | 04 · 04.1 |
| RN-02 | Conta de "Criada por" | 03 · 03.3 |
| RN-03 | Nome Ready sem espaços e sem caixa | 01 · 01.1 |
| RN-04 | Exige escrita | 01 · 01.1 |
| RN-05 | Ordem e mensagens M-1 a M-3 | 01 · 01.1; 03 · 03.1; 04 · 04.1 |
| RN-06 | Estados e mensagens R-0 a R-4 | 02 · 02.2; 04 · 04.2 |
| B-01 | Repetição do pedido | 02 · 02.3; 03 · 03.2 |
| B-02 | Ready ou quadro somem entre aceitar e criar | 03 · 03.3 |
| B-03 | Escrita retirada entre aceitar e criar | 03 · 03.3 |
| B-04 | Publicação incerta | 03 · 03.3 |
| B-05 | Automação do quadro | 05 · 05.2 |
| B-06 | Ready sem In Progress | 01 · 01.1 |
| §9 | Comportamento que não muda | 01 · 01.2, 01.3, 01.4; 03 · 03.3; 04 · 04.2 |
| NFR-01 | Conta definida no servidor | 03 · 03.2, 03.3 |
| NFR-02 | Cota do GitHub | 03 · 03.2 |
| NFR-03 | Resultado em até 15 s sem recarregar | 04 · 04.2 |
| NFR-04 | Acessibilidade | 04 · 04.1, 04.2 |
| DEC-01 | Responsável no pedido de criação | 01 · 01.4 |
| DEC-02 | Conferir antes de criar e recusar | 03 · 03.2, 03.3 |
| DEC-03 | Contrato do quadro com status de destino | 01 · 01.2, 01.3 |
| DEC-04 | Resultado na tentativa, sem refazer | 02 · 02.1, 02.3 |
| §14 | Colunas, CHECKs e rollback da 0054 | 02 · 02.1 |
| §19 | Log `[tasks-worker]` de `not_assigned`/`ready_failed` | 03 · 03.3 |
| §20 | Ordem de implantação; migration no banco dev | 02 · 02.1 |
| §24 | Definição de pronto | 05 · 05.1 |
| V-01a–V-01g | Regra da opção e nome Ready | 01 · 01.1 |
| V-02a–V-02d | Gateway do quadro | 01 · 01.2 |
| V-03a–V-03d | Gateway de Issues | 01 · 01.4 |
| V-04a–V-04e | Serviço de atribuição | 03 · 03.1 |
| V-05a–V-05g | Aceite da publicação | 03 · 03.2 |
| V-06a–V-06h | Worker | 03 · 03.3 |
| V-07a–V-07d | Leitura do resultado | 02 · 02.2 |
| V-07e–V-07g | Migration, CHECKs e rollback | 02 · 02.1 |
| V-07h–V-07i | Gravação: escolha no hash, resultado não sobrescrito | 02 · 02.3 |
| V-08a–V-08d | Opção na prévia | 04 · 04.1 |
| V-09a–V-09d | Resultado na tela | 04 · 04.2 |
| V-10a–V-10b | Smoke manual | 05 · 05.2 |
| V-11a | Regressão do quadro e da fila | 01 · 01.3 |
| V-11b | Regressão da publicação | 03 · 03.3 |
| V-11c | Regressão do rodapé do draft | 04 · 04.2 |

## Foco de revisão
1. Pedido repetido com a mesma chave e `assignToSelf: false` depois de uma versão anterior sem o campo → o hash é o mesmo de hoje e devolve a tentativa original → V-07h em 02.3.
2. A conferência no aceite sem a opção e o quadro ilegível → continua ignorada, como hoje; com a opção, recusa → V-05b e V-05g em 03.2.
3. Ready presente com nome " ready " no quadro → a publicação aceita e a fila vê a Issue, porque as duas usam a mesma função → V-01d em 01.1 e V-11a em 01.3.
4. Resultado já gravado e o worker repete `settle` (lease expirado e retomado) → o valor gravado fica → V-07i em 02.3 e V-06g em 03.3.
5. A recusa no worker com a opção → a tarefa volta a `draft_ready` com o mesmo motivo M e nenhuma chamada a `create` → V-06a em 03.3.
