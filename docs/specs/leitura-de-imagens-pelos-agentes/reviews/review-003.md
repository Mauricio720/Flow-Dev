# Revisão de conformidade 003: Leitura de imagens pelo Issue Author e pelo Planejamento

> **Data:** 2026-11-26 · **Escopo:** feature inteira (task_01 a task_04, todas `completed`, 10/10 mini-tarefas) · **Intervalo:** mudanças não commitadas sobre `fd7ea94` (branch `flow/issue-18`)
> **Spec:** `docs/specs/leitura-de-imagens-pelos-agentes/spec.md`, `_tasks.md`, `task_01.md`…`task_04.md`
> **Regras lidas:** `AGENTS.md`, `CLAUDE.md`, `.agents/rules/code-standards.md`, skills `layered-backend` e `software-testing`
> **Anteriores:** [review-001](review-001.md) e [review-002](review-002.md), ambas APROVADO COM RESSALVAS

## Veredito: APROVADO COM RESSALVAS

Pela segunda vez seguida, nada mudou no código. Nenhum arquivo de código, teste, spec ou tarefa mudou desde a review-002; só mudaram `_tasks.md` (a linha da revisão) e `reviews/etapa.md`. O diff segue com 26 arquivos rastreados (+90 −40) e os mesmos arquivos novos. Os quatro achados menores e os três pontos de spec continuam no código e na spec, e a verificação completa passa de novo.

**Atenção à operadora:** esta é a terceira revisão sobre o mesmo código. Sem aplicar o prompt de correção, ou sem aceitar as ressalvas, novas revisões vão repetir este veredito. A decisão é sua: aceitar o APROVADO COM RESSALVAS e encerrar a etapa, ou mandar o prompt abaixo ao implementador e então revisar de novo.

| Bloqueante | Importante | Menor | Spec a discutir |
|---|---|---|---|
| 0 | 0 | 4 | 3 |

## Verificação executada

| Comando | Saída | Resultado |
|---|---|---|
| `pnpm --dir packages/api test` | exit 0 · 148 arquivos, 921 testes passaram | ✅ |
| `pnpm --dir packages/api test:integration` (sem `TEST_DATABASE_URL`) | exit 0 · 195 arquivos passaram, 2 pulados · 888 testes passaram, 5 pulados (já pulados antes da feature) | ✅ |
| `pnpm --dir packages/api typecheck` | exit 0 | ✅ |
| `pnpm lint` | exit 0 | ✅ |
| Conferência de mudanças desde a review-002 (`find -newer review-002.md`, `git diff --stat HEAD`) | nenhum arquivo de código alterado | — |

## Conformidade com a spec

Igual à review-001; a tabela completa, com a evidência de cada item, está em [review-001 › Conformidade com a spec](review-001.md#conformidade-com-a-spec).

| Item | Status | Observação |
|---|---|---|
| REQ-001 a REQ-010 | ✅ | |
| NFR-01, NFR-02, NFR-03 | ✅ | |
| NFR-04 | 🟡 | implementado, sem teste que o prove (M-4) |
| US-01 a US-04, B-01 a B-06, §9, DEC-01 a DEC-04 | ✅ | |
| Fora de escopo | ✅ | |

## Regras do projeto

| Regra (fonte) | Status | Evidência |
|---|---|---|
| Sem comentários; `.ts` ≤ 100 linhas; funções ≤ 30 linhas; camadas | ✅ | |
| ≤ 3 parâmetros (`code-standards.md` › Parameters) | ❌ menor | M-1 |
| Strings mágicas (`code-standards.md` › Magic Numbers; `_tasks.md`, restrições globais) | ❌ menor | M-2 |

## Achados

Os mesmos das reviews 001 e 002, reconfirmados no código atual. Os detalhes estão em [review-001 › Achados](review-001.md#achados).

- **M-1 (Menor) · task_03 03.1 / task_04 04.1:** `loadSelectedContents` (`generationImages.ts:47`) e `loadSelected` (`planningImages.ts:21`) são idênticas e têm 4 parâmetros; a candidata indisponível também se repete (`generationImages.ts:43`, `planningImages.ts:14`).
- **M-2 (Menor) · task_01 01.1 / 03.1 / 04.1 / task_02 02.3:** `"limit"`/`"unavailable"` literais em `agentImages.ts:37`, `generationImages.ts:53` e `planningImages.ts:27`; `"images"`/`"bin"` em `codexImageFiles.ts:7,11`.
- **M-3 (Menor) · task_04 04.1:** `planningContracts.ts:41`, "import type { AgentImage, OmittedImage } …", fica no fim do arquivo.
- **M-4 (Menor) · task_03 03.2 / task_04 04.2 / task_01 01.3:** V-08a (`issueAuthorImages.test.ts:45`) e V-08b (`planningImages.test.ts:34`) usam uma imagem e não provam a ordem; nenhum teste prova NFR-04.

## Atualizações de spec a discutir

Continuam abertas, sem mudança:
- **S-1:** §7 (só `flow-image:` no rascunho) contra §13 e o código, que aceitam também o link publicado do Flow Dev.
- **S-2:** "attachment of user message N" usa `sequence`, que conta também as mensagens do assistente (P-04).
- **S-3:** a spec continua "Em revisão" (`spec.md:3`), sem P-01 a P-05 e sem a mudança de `AGENT_IMAGE_EXTENSIONS`.

## Divergências entre o relatório do implementador e a evidência

- Nenhuma nova. Não houve rodada de correção desde a review-001.

## Prompt de correção

> Corrija, nesta ordem, sem alterar nada fora do listado:
> 1. **M-1**: `packages/api/src/infra/database/dao/tasks/generationImages.ts` e `planningImages.ts`: extraia uma única função de leitura das selecionadas (por exemplo em `taskImageReads.ts`) com no máximo 3 parâmetros (`database, { taskId, selection }`) e um único construtor de candidata indisponível. Os dois loaders passam a usá-los. Comportamento idêntico.
> 2. **M-2**: crie em `packages/api/src/application/agents/agentImages.ts` constantes nomeadas para os motivos `"limit"` e `"unavailable"` e use-as em `agentImages.ts`, `generationImages.ts` e `planningImages.ts`. Em `codexImageFiles.ts`, extraia `"images"` e `"bin"` para constantes.
> 3. **M-3**: `packages/api/src/application/services/tasks/planningContracts.ts`: mova o `import type { AgentImage, OmittedImage }` da linha 41 para o topo.
> 4. **M-4**: em `src/infra/issue-author/issueAuthorImages.test.ts` (V-08a) e `src/infra/planning/planningImages.test.ts` (V-08b), use duas imagens distintas e confira `runs[0].images` com os dois ids e bytes na ordem. Acrescente um teste que prove NFR-04: com 12 candidatas, só os 10 ids selecionados chegam a `readTaskImageContents`.
> 5. **S-3** (se a operadora aprovar): atualize `spec.md` com P-01 a P-05, a mudança de `AGENT_IMAGE_EXTENSIONS` e a decisão sobre S-1 e S-2.
>
> Restrições: sem comentários; `.ts` ≤ 100 linhas; funções ≤ 30 linhas; ≤ 3 parâmetros; sem novas dependências; não mude as asserções existentes além das de V-08a/V-08b.
> Ao terminar, rode e mostre a saída de: `pnpm --dir packages/api exec vitest run src/infra/issue-author src/infra/planning src/application/agents`, `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/issue-author-images.test.ts test/planning-images.test.ts test/agent-image-reads.test.ts`, `pnpm --dir packages/api typecheck` e `pnpm lint`. Não marque como concluído sem essa saída.
