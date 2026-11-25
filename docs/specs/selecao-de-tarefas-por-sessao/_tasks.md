---
schema_version: "compozy.tasks/v2"
workflow: selecao-de-tarefas-por-sessao
graph:
  nodes:
    - id: task_01
      file: task_01.md
    - id: task_02
      file: task_02.md
  edges:
    - from: task_01
      to: task_02
---

# Tarefas: Escolher várias tarefas para uma sessão do plano

> **Spec:** [spec.md](spec.md) · **Data:** 2026-11-24 · **Total:** 2 tarefas, 6 mini-tarefas

## Objetivo
Na aba "Tarefas" do plano de execução, quem opera escolhe numa lista várias tarefas para uma sessão existente ou para uma sessão nova. A escolha muda só o rascunho, e o plano continua sendo salvo por "Salvar".

## Estado
| Tarefa | Tipo | Complexidade | Depende de | Mini-tarefas | Status |
|---|---|---|---|---|---|
| [01 — Regra pura de escolher tarefas da sessão](task_01.md) | frontend | medium | — | 2/2 | completed |
| [02 — Diálogo de tarefas da sessão no plano](task_02.md) | frontend | medium | 01 | 4/4 | completed |

**Podem rodar em paralelo:** nenhuma. A 02 consome as funções da 01. A feature é pequena (só tela, DEC-01), e as duas tarefas cabem em uma ou duas sessões de implementação.

Estes arquivos foram gerados sem a aprovação prévia do plano de quebra, porque o pedido foi "salve os arquivos e pare para minha revisão". A revisão dos arquivos substitui essa aprovação.

## Como executar (controle)
Veja o progresso e a próxima mini-tarefa liberada a qualquer momento: `python3 -I .claude/skills/spec-to-tasks/scripts/tasks_status.py docs/specs/selecao-de-tarefas-por-sessao`.

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
- Só `apps/web` muda. Nada em `packages/api`: nem procedure, nem contrato, nem validação, nem migration (DEC-01).
- O plano só vai ao servidor por "Salvar" (D-DEC-25, REQ-008). O diálogo nunca chama o tRPC.
- O texto da interface fica em pt-BR, com os rótulos exatos da spec: "Escolher tarefas", "Nova sessão", "Tarefas da Sessão N", "Tarefas da nova sessão", "Aplicar", "Criar sessão", "Cancelar", "Sem sessão", "Está na Sessão N", "Sessão N · iniciada" e "NN — Título".
- Arquivos `.ts` e `.tsx` têm menos de 100 linhas, funções têm no máximo 30 linhas e no máximo 3 parâmetros, não há comentários, e strings e números ficam em constantes (`.claude/rules/code-standards.md`).
- Os testes atuais de `planEditorModel`, `ExecutionPlanEditor`, `ExecutionPlanEditorReadOnly` e `PlanSessionCard` não mudam de asserção (V-03).
- A verificação acontece por arquivo de teste durante o trabalho (`pnpm --dir apps/web exec vitest run <arquivo>`). A suíte completa, o typecheck e o lint rodam uma vez, no fim (02.4). Não há e2e novo nem integração nova, e não se usa `pnpm build`, porque nenhuma rota muda.
- Frontend: siga a skill `nextjs-folder-structure` (componentes em `components/`, hook em `hooks/`, regra pura na raiz da feature) e `apps/web/DESIGN.md` para os tokens visuais.

## Premissas e bloqueios
- **DEC-02 (diálogo modal):** confirmada por você em 2026-11-24.
- **"Chave repetida" (V-01):** foi lida como as duas coisas, chave nova sem colisão e tarefa repetida na entrada, e as duas ganham teste (task_01).
- **Lugar de "Nova sessão":** fica abaixo da lista de sessões, acima de "Sem sessão" (task_02).
- **V-04b:** pode exigir um conjunto temporário de 30 tarefas num repositório de teste (task_02, "Premissas").

## Matriz de cobertura
| ID da spec | Descrição curta | Tarefa · mini-tarefa |
|---|---|---|
| REQ-001 | "Escolher tarefas" por sessão não iniciada, e "Nova sessão" | 02 · 02.1 e 02.2 |
| REQ-002 | Diálogo com título, todas as tarefas em ordem e o lugar de cada uma | 02 · 02.1 (`placeOf` em 01 · 01.1) |
| REQ-003 | Abre com as tarefas da sessão marcadas e as iniciadas desabilitadas | 02 · 02.1 |
| REQ-004 | "Aplicar": exatamente as marcadas, saídas, sessão vazia sai, iniciada não muda | 01 · 01.1 (regra), 02 · 02.1 (ligação) |
| REQ-005 | "Criar sessão": no fim, em Opus · Máximo, as tarefas saem de onde estavam | 01 · 01.2 (regra), 02 · 02.2 (ligação) |
| REQ-006 | "Criar sessão" desabilitado sem marcas | 02 · 02.2 (proteção na regra em 01 · 01.2) |
| REQ-007 | Cancelar e Esc sem mudança, e o foco volta à origem | 02 · 02.3 |
| REQ-008 | Só o rascunho muda, e "Salvar" envia | 02 · 02.1 e 02.3 |
| DEC-01 | Só a tela muda | 01 e 02 (restrição global) |
| DEC-02 | Diálogo modal com `useDialogFocus` | 02 · 02.1 e 02.3 |
| Não muda: seletor, atalhos, escolha por sessão, "Sem sessão", modo leitura | Testes atuais sem mudança | 02 · 02.3 (V-03) |
| Não muda: teclado (D-NFR-17) | Plano e diálogo usáveis pelo teclado | 02 · 02.3 (V-02h, V-02m) |
| Não muda: recusas do servidor ao salvar | `plan_invalid_order` depois de "Aplicar" | 02 · 02.3 (V-02j) |
| Não muda: as concluídas continuam escolhíveis | Caixa habilitada para tarefa concluída | 02 · 02.3 (V-02l) |
| Cenários 1, 2 e 4 | Abrir, aplicar e sessão iniciada | 02 · 02.1 |
| Cenário 3 | Nova sessão | 02 · 02.2 |
| Cenários 5 e 6 | Teclado e quem só lê | 02 · 02.3 |
| V-01a–V-01g | `setSessionTasks` e `placeOf` | 01 · 01.1 |
| V-01h–V-01k | `createSessionWith` | 01 · 01.2 |
| V-02a–V-02e | Diálogo de sessão existente | 02 · 02.1 |
| V-02f–V-02g | Diálogo de nova sessão | 02 · 02.2 |
| V-02h–V-02m | Cancelar, teclado, erro do servidor, leitura, concluídas e modal | 02 · 02.3 |
| V-03a–V-03d | Testes atuais sem mudar asserções | 02 · 02.3 |
| V-04a–V-04c | Navegador: sessão de duas tarefas, 30 tarefas e foco visível | 02 · 02.4 |
| Pronto quando da spec | test, typecheck e lint, mais o V-04 | 02 · 02.4 |

## Foco de revisão
1. O plano é relido (5 s) entre abrir o diálogo e aplicar, e a sessão alvo some → o plano não muda e nada quebra → V-01g (01.1).
2. A pessoa marca uma tarefa que está noutra sessão e esvazia essa sessão → a outra sessão sai do plano, e o contador e os títulos "Sessão N" são renumerados → V-01b (01.1) e V-02g (02.2).
3. O botão "Aplicar" aparece duas vezes (atalho "Mesmo modelo para todas" e diálogo), e "Nova sessão" é botão e também opção do seletor → os testes consultam dentro do `dialog` e por papel → V-02b e V-02f.
4. O foco precisa voltar ao botão certo entre vários "Escolher tarefas" → V-02h (02.3) e V-02i (para "Nova sessão").
5. Uma tarefa concluída e uma tarefa de sessão iniciada podem parecer o mesmo caso → a concluída fica habilitada, e só a de sessão iniciada fica desabilitada → V-02l e V-02d.
