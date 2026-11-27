---
schema_version: "compozy.tasks/v2"
workflow: leitura-de-imagens-pelos-agentes
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
  edges:
    - from: task_01
      to: task_02
    - from: task_01
      to: task_03
    - from: task_01
      to: task_04
    - from: task_02
      to: task_03
    - from: task_02
      to: task_04
---

# Tarefas: Leitura de imagens pelo Issue Author e pelo Planejamento

> **Spec:** [spec.md](spec.md) · **Data:** 2026-11-26 · **Total:** 4 tarefas, 10 mini-tarefas

## Objetivo
O Issue Author recebe as imagens da conversa e do rascunho, e o Planejamento recebe as imagens da Issue publicada, pelo canal nativo do Claude (`stream-json`) e do Codex (`--image`), com no máximo 10 imagens e 20 MB por execução e as omitidas avisadas no pedido.

## Estado
| Tarefa | Tipo | Complexidade | Depende de | Mini-tarefas | Status |
|---|---|---|---|---|---|
| [01 — Contrato, regra de seleção e leitura das imagens](task_01.md) | backend | medium | — | 3/3 | completed |
| [02 — Runners e execução entregam as imagens](task_02.md) | backend | high | 01 | 3/3 | completed |
| [03 — Issue Author recebe as imagens](task_03.md) | backend | high | 01, 02 | 2/2 | completed |
| [04 — Planejamento recebe as imagens](task_04.md) | backend | medium | 01, 02 | 2/2 | completed |

**Podem rodar em paralelo:** 03 e 04, depois de 02 (arquivos disjuntos: `taskOperationInput.ts`/`infra/issue-author/` contra `planningWorkerInput.ts`/`infra/planning/`). As três mini-tarefas de 01 também não dependem entre si.

> Arquivos gerados sem a pausa de aprovação do plano, a pedido da usuária ("salve os arquivos e pare para minha revisão"). A revisão da quebra acontece sobre estes arquivos.

## Como executar (controle)
Veja o progresso e a próxima mini-tarefa liberada a qualquer momento: `python3 -I .claude/skills/spec-to-tasks/scripts/tasks_status.py docs/specs/leitura-de-imagens-pelos-agentes`.

1. **Escolha** a próxima tarefa liberada: `pending`, e todas as de que ela depende estão `completed`.
2. **Implemente** numa sessão nova: "implemente a mini-tarefa 02.1 de `task_02.md`" (ou a tarefa inteira). O implementador:
   - muda o `status` para `in_progress`;
   - marca `[x]` em cada mini-tarefa só depois de rodar o "Pronto quando" dela;
   - anota no "Registro de execução" os comandos e o resultado.
3. **Feche a tarefa:** ela passa a `completed` quando todas as mini-tarefas estão marcadas e os critérios de sucesso foram comprovados por comando. Repita a partir do passo 1 até todas as tarefas estarem `completed`.
4. **Revisão final, uma vez, depois de todas as tarefas:** "revise a feature contra a spec" com **spec-conformance**. Ela revisa tudo de uma vez: requisitos, regras do projeto, testes e o que os registros de execução afirmam. O veredito vai para `reviews/` e para a seção "Revisão final" abaixo.
5. **Se REPROVADO:** o prompt de correção do relatório vira uma rodada de correções; depois, nova revisão final. A feature está pronta quando a revisão final estiver APROVADO (ou APROVADO COM RESSALVAS aceito por você).

## Revisão final
- 2026-11-26 · review-001 · APROVADO COM RESSALVAS (0 bloqueantes, 0 importantes, 4 menores, 3 spec a discutir) · reviews/review-001.md
- 2026-11-26 · review-002 · APROVADO COM RESSALVAS (0 bloqueantes, 0 importantes, 4 menores, 3 spec a discutir; código sem mudança desde a review-001) · reviews/review-002.md
- 2026-11-26 · review-003 · APROVADO COM RESSALVAS (0 bloqueantes, 0 importantes, 4 menores, 3 spec a discutir; código sem mudança desde a review-001) · reviews/review-003.md

## Restrições globais
- Seguir `.agents/rules/code-standards.md`: sem comentários, arquivos `.ts` com no máximo 100 linhas, funções com no máximo 30 linhas, no máximo 3 parâmetros (use objeto), sem linhas em branco dentro de funções, constantes nomeadas para números e strings mágicos (10, 20 × 1024 × 1024, `"limit"`, `"unavailable"`).
- Skill `layered-backend` para tudo em `packages/api`: tipos e regra pura em `application/agents/`, leitura no banco em `infra/database/dao/tasks/`, CLIs em `infra/agents/`.
- Skill `software-testing` para todo teste: oráculo tirado da spec (§7, REQ-007/008), asserção sobre o valor exato, nada de `toBeTruthy`.
- Sem migration, sem flag, sem mudança de tela, sem e2e (spec §14, §20, §22).
- Execuções sem imagens ficam idênticas às de hoje: mesmos argumentos de CLI, mesmo stdin, mesmo prompt (REQ-010). Os testes atuais de `claudeCodeRunner.test.ts`, `codexRunner.test.ts` e dos gateways continuam passando sem mudar as asserções existentes; só os construtores de pedido ganham `images: []`.
- Conteúdo e ids de imagem nunca vão para log (NFR-03).
- Testes unitários: `pnpm --dir packages/api exec vitest run <arquivo>`. Integração com Postgres: `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts <arquivo>`, sem `TEST_DATABASE_URL`. Typecheck: `pnpm --dir packages/api typecheck`. Suítes completas (`test`, `test:integration`) e `pnpm lint` só no fechamento de cada tarefa.
- Nenhum teste manual nas tarefas: a operadora faz o teste manual depois de todas as etapas (spec §22, "Sem prova automática").

## Premissas e bloqueios
A spec não tem questões em aberto. Pontos que ela deixa implícitos e que as tarefas seguem até você dizer o contrário:
- **P-01 (task_01):** `selectAgentImages` recebe as candidatas já na ordem de apresentação (§7) e devolve `selected` nessa mesma ordem; a prioridade por data só decide quem entra.
- **P-02 (task_01):** com a mesma imagem em duas origens, vale a primeira na ordem de apresentação (anexo da mensagem antes do rascunho).
- **P-03 (task_01):** empate de `createdAt` decide pelo id em ordem crescente; o total de 20 MB é inclusivo (exatamente 20 × 1024 × 1024 cabe).
- **P-04 (task_03):** "mensagem N" é o `task_messages.sequence` da mensagem.
- **P-05 (task_02):** com imagens, o Claude mantém `-p` e as demais opções; só `--output-format json` é trocado por `--input-format stream-json --output-format stream-json --verbose`, na mesma posição.

## Matriz de cobertura
| ID da spec | Descrição curta | Tarefa · mini-tarefa |
|---|---|---|
| REQ-001 | candidatas do Issue Author: anexos + rascunho da tarefa | 03 · 03.1 |
| REQ-002 | reenviar imagens de toda a conversa | 03 · 03.1 |
| REQ-003 | deduplicar | 01 · 01.1 |
| REQ-004 | candidatas do Planejamento pelo corpo publicado | 04 · 04.1 |
| REQ-005 | entregar como conteúdo de imagem nos dois provedores | 02 · 02.2, 02.3 |
| REQ-006 | lista numerada com origem no pedido | 01 · 01.2 |
| REQ-007 | 10 imagens / 20 MB, mais recentes primeiro, pula as que não cabem | 01 · 01.1 |
| REQ-008 | omitidas listadas com motivo, execução segue | 01 · 01.1, 01.2 |
| REQ-009 | imagem é dado não confiável, no pedido e nas regras | 01 · 01.2 (pedido); 03 · 03.2 e 04 · 04.2 (regras) |
| REQ-010 | sem imagens, execução idêntica | 02 · 02.2, 02.3; 03 · 03.2; 04 · 04.2 |
| NFR-01 | leitura filtra pela tarefa | 01 · 01.3 |
| NFR-02 | arquivos temporários do Codex apagados | 02 · 02.3 |
| NFR-03 | log só com contagens | 02 · 02.1 |
| NFR-04 | só o conteúdo das selecionadas é lido | 01 · 01.3; 03 · 03.1 |
| B-01 | primeira execução sem rascunho | 03 · 03.1 |
| B-02 | imagem removida → indisponível | 03 · 03.1 |
| B-03 | reenfileirada refaz a seleção | 03 · 03.1 |
| B-04 | URL externa não é candidata | 04 · 04.1 |
| B-05 | GIF enviado como está | 02 · 02.2 |
| B-06 | recusa do provedor usa o erro existente | 02 · 02.2 |
| N-01 (§9) | limite de 100 KB do histórico só para texto | 03 · 03.2 |
| N-02 (§9) | hash, admissão, reenfileiramento e status do Planejamento iguais | 04 · 04.1 |
| N-03 (§9) | publicação, "Imagens anexadas" e anexos do terminal iguais | 04 · 04.1 |
| N-04 (§9) | fontes aceitas só das ferramentas de contexto | 03 · 03.2; 04 · 04.2 |
| DEC-01 | Claude por `stream-json` só com imagens | 02 · 02.2 |
| DEC-02 | Codex por `--image`, `view_image` desligado | 02 · 02.3 |
| DEC-03 | regra única na aplicação, só metadados | 01 · 01.1 |
| DEC-04 | imagem não é evidência | 03 · 03.2; 04 · 04.2 |
| V-01a | 12 imagens → 10 + 2 `limit` | 01 · 01.1 |
| V-01b | 5×4,5 MB + 200 KB → 4 + 200 KB, quinta `limit` | 01 · 01.1 |
| V-01c | duplicada enviada uma vez | 01 · 01.1 |
| V-01d | `available:false` → `unavailable` | 01 · 01.1 |
| V-01e | vazio → vazio | 01 · 01.1 |
| V-01f | ordem de apresentação preservada; empate pelo id | 01 · 01.1 |
| V-01g | exatamente 20 MB cabe | 01 · 01.1 |
| V-02a | anexos de várias mensagens com origem | 03 · 03.1 |
| V-02b | imagem do rascunho com legenda | 03 · 03.1 |
| V-02c | id de outra tarefa → `unavailable` | 03 · 03.1 |
| V-02d | id removido → `unavailable` | 03 · 03.1 |
| V-02e | imagem órfã do editor não entra | 03 · 03.1 |
| V-02f | sem rascunho → só anexos | 03 · 03.1 |
| V-02g | anexo também no rascunho → uma vez | 03 · 03.1 |
| V-02h | 12 imagens → 10 com conteúdo + 2 omitidas | 03 · 03.1 |
| V-02i | leitor devolve só ids pedidos da própria tarefa | 01 · 01.3 |
| V-03a | duas imagens na ordem do corpo | 04 · 04.1 |
| V-03b | link de outra tarefa → `unavailable` | 04 · 04.1 |
| V-03c | `user-attachments` ignorado | 04 · 04.1 |
| V-03d | caminho do snapshot também entrega imagens, hash igual | 04 · 04.1 |
| V-04a | args `stream-json` com imagens | 02 · 02.2 |
| V-04b | stdin: uma linha com texto + blocos base64 | 02 · 02.2 |
| V-04c | lê `structured_output` do último `result` | 02 · 02.2 |
| V-04d | saída `stream-json` sem `result` → `invalid_output` | 02 · 02.2 |
| V-05a | arquivos com os bytes originais | 02 · 02.3 |
| V-05b | `--image` logo após `exec`, `-` no fim | 02 · 02.3 |
| V-05c | diretório apagado após sucesso e falha | 02 · 02.3 |
| V-06a | Claude sem imagens igual a hoje | 02 · 02.2 |
| V-06b | Codex sem imagens igual a hoje | 02 · 02.3 |
| V-06c | prompt do Issue Author sem imagens igual | 03 · 03.2 |
| V-06d | prompt do Planejamento sem imagens igual | 04 · 04.2 |
| V-07a | numeração e origem na ordem do canal | 01 · 01.2 |
| V-07b | legenda em JSON, dentro da moldura | 01 · 01.2 |
| V-07c | omitidas com motivo | 01 · 01.2 |
| V-07d | frase de dado não confiável | 01 · 01.2 |
| V-07e | prompt do Issue Author com a seção | 03 · 03.2 |
| V-07f | prompt do Planejamento com a seção | 04 · 04.2 |
| V-08a | gateway do Issue Author repassa imagens | 03 · 03.2 |
| V-08b | gateway do Planejamento repassa imagens | 04 · 04.2 |
| V-08c | log com contagens, sem ids | 02 · 02.1 |
| V-08d | regra de imagem nas instruções do Issue Author | 03 · 03.2 |
| V-08e | regra de imagem nas instruções do Planejamento | 04 · 04.2 |

Fora das tarefas, por regra da usuária: a seção "Sem prova automática" (§22) é coberta pelo teste manual final dela.

## Foco de revisão
1. Candidata grande que não cabe seguida de uma pequena que cabe → a pequena entra (a seleção não para) → V-01b em 01.1.
2. stdin do Claude com o marcador de cenário do CLI falso dentro do bloco de texto `stream-json` → o CLI falso precisa achar o cenário no texto, não numa linha solta → 02.2.
3. `--image` com vários valores consumindo o `-` final → ordem dos argumentos conferida → V-05b em 02.3.
4. Id de imagem de outra tarefa plantado no rascunho ou no corpo → nunca devolve conteúdo → V-02c em 03.1, V-03b em 04.1, V-02i em 01.3.
5. `inputHash` do Planejamento muda porque as imagens entraram no `PlanningInput` → as imagens ficam fora de `buildPlanningInput`/`buildSourcePlanningInput` → V-03d em 04.1.
