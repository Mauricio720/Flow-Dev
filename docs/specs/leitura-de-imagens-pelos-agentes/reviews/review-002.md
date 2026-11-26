# Revisão de conformidade 002: Leitura de imagens pelo Issue Author e pelo Planejamento

> **Data:** 2026-11-26 · **Escopo:** feature inteira (task_01 a task_04, todas `completed`, 10/10 mini-tarefas) · **Intervalo:** mudanças não commitadas sobre `fd7ea94` (branch `flow/issue-18`)
> **Spec:** `docs/specs/leitura-de-imagens-pelos-agentes/spec.md`, `_tasks.md`, `task_01.md`…`task_04.md`
> **Regras lidas:** `AGENTS.md`, `CLAUDE.md`, `.agents/rules/code-standards.md`, skills `layered-backend` e `software-testing`
> **Anterior:** [review-001](review-001.md), APROVADO COM RESSALVAS

## Veredito: APROVADO COM RESSALVAS

Nenhum arquivo de código, teste, spec ou tarefa mudou desde a review-001. Só mudaram `_tasks.md` (a linha da revisão anterior) e `reviews/etapa.md`; `find -newer review-001.md` não lista nada em `packages/`. O diff segue com 26 arquivos rastreados (+90 −40) e os mesmos arquivos novos. Reconfirmei no código os quatro achados menores e rodei de novo toda a verificação, que passa. A conformidade com a spec é a mesma da review-001: todos os REQ, NFR, casos de borda, DEC e testes V-01 a V-08 implementados; só NFR-04 continua 🟡 por falta de prova em teste.

| Bloqueante | Importante | Menor | Spec a discutir |
|---|---|---|---|
| 0 | 0 | 4 | 3 |

## Verificação executada

| Comando | Saída | Resultado |
|---|---|---|
| `pnpm --dir packages/api test` | exit 0 · 148 arquivos, 921 testes passaram | ✅ |
| `pnpm --dir packages/api test:integration` (sem `TEST_DATABASE_URL`) | exit 0 · 195 arquivos passaram, 2 pulados · 888 testes passaram, 5 pulados (já pulados antes da feature; nenhum `skip` nos testes novos) | ✅ |
| `pnpm --dir packages/api typecheck` | exit 0 | ✅ |
| `pnpm lint` | exit 0 | ✅ |
| Conferência de mudanças desde a review-001 (`find -newer`, `git diff --stat HEAD`) | nenhum arquivo de código alterado | — |

## Conformidade com a spec

Sem mudança desde a review-001; a tabela completa, com a evidência de cada item, está em [review-001 › Conformidade com a spec](review-001.md#conformidade-com-a-spec).

| Item | Status | Observação |
|---|---|---|
| REQ-001 a REQ-010 | ✅ | código e testes iguais aos da review-001 |
| NFR-01, NFR-02, NFR-03 | ✅ | |
| NFR-04 | 🟡 | implementado (`generationImages.ts:48`, `planningImages.ts:22`), sem teste que falhe se o conteúdo de todas as candidatas fosse lido (M-4) |
| US-01 a US-04, B-01 a B-06 | ✅ | |
| Comportamento que não muda (§9) | ✅ | testes existentes passam sem mudança de asserção |
| DEC-01 a DEC-04 | ✅ | |
| Fora de escopo | ✅ | nada do §4 presente; nenhuma dependência nova |

## Regras do projeto

| Regra (fonte) | Status | Evidência |
|---|---|---|
| Sem comentários (`code-standards.md` › Comments) | ✅ | |
| `.ts` ≤ 100 linhas; funções ≤ 30 linhas | ✅ | maior arquivo de produção: `agentExecution.ts`, com 71 linhas |
| ≤ 3 parâmetros (`code-standards.md` › Parameters) | ❌ menor | M-1, sem correção |
| Números e strings mágicos (`code-standards.md` › Magic Numbers; `_tasks.md`, restrições globais) | ❌ menor | M-2, sem correção |
| Camadas (`layered-backend`) | ✅ | |
| Testes com oráculo da spec (`software-testing`) | ✅ | com as lacunas de M-4 |

## Achados

Todos repetidos da review-001, reconfirmados no código atual.

### task_01 · 01.1 / task_03 · 03.1 / task_04 · 04.1

#### M-1 (Menor): helper de leitura duplicado e com 4 parâmetros
- **Onde:** `packages/api/src/infra/database/dao/tasks/generationImages.ts:47`, "async function loadSelectedContents(database: Database, taskId: string, selected: ImageCandidate[], omitted: OmittedImage[])", e `planningImages.ts:21` (`loadSelected`, com o mesmo corpo). A candidata indisponível se repete em `generationImages.ts:43` e `planningImages.ts:14`.
- **Contra:** `code-standards.md` › Parameters; duplicação de utilitário.
- **Correção esperada:** uma função única, com no máximo 3 parâmetros, usada pelos dois loaders, e um construtor único da candidata indisponível.

#### M-2 (Menor): strings mágicas que as restrições globais mandavam extrair
- **Onde:** `agentImages.ts:37` ("limit" as const : "unavailable" as const), `generationImages.ts:53` e `planningImages.ts:27` (reason: "unavailable"), `codexImageFiles.ts:7,11` (`"images"`, `"bin"`).
- **Contra:** `code-standards.md` › Magic Numbers and Strings; `_tasks.md` › Restrições globais.
- **Correção esperada:** constantes nomeadas e reutilizadas.

### task_04 · 04.1

#### M-3 (Menor): import no fim do arquivo
- **Onde:** `packages/api/src/application/services/tasks/planningContracts.ts:41`, "import type { AgentImage, OmittedImage } from "../../agents/agentImages";".
- **Correção esperada:** mover o import para o topo.

### task_03 · 03.2 / task_04 · 04.2 / task_01 · 01.3 (testes)

#### M-4 (Menor): duas lacunas de teste
- **Onde e evidência:**
  1. `issueAuthorImages.test.ts:45` (`input([image], [omitted])`) e `planningImages.test.ts:34` (`gateway([image])`): V-08a e V-08b usam uma imagem, e a tarefa pedia duas na mesma ordem. Escapa um gateway que reordene `images`, e a numeração do prompt deixaria de bater com o canal (REQ-006).
  2. NFR-04: `issue-author-images.test.ts:55-66` (V-02h) só confere o resultado. Ler o conteúdo de todas as candidatas continuaria verde.
- **Correção mínima:** duas imagens distintas em V-08a e V-08b, conferidas em ordem, e um teste que mostre que só os ids selecionados chegam a `readTaskImageContents`.

Achados inferidos pela leitura do código. Nenhum deles faz um teste falhar hoje.

## Atualizações de spec a discutir

Sem mudança desde a review-001; continuam abertas:
- **S-1:** §7 aceita só `flow-image:` no rascunho, mas o código (seguindo §13) também aceita o link publicado do Flow Dev.
- **S-2:** "attachment of user message N" usa `task_messages.sequence`, que conta também as mensagens do assistente (P-04). Registrar na spec e considerar `conversation message N`.
- **S-3:** a spec continua "Em revisão" (`spec.md:3`) e não registra P-01 a P-05 nem a mudança de `AGENT_IMAGE_EXTENSIONS` para `application/agents/agentImages.ts`, como pede a Definição de pronto.

## Divergências entre o relatório do implementador e a evidência

- Nenhuma nova. Desde a review-001 não houve rodada de correção nem registro novo nas tarefas.

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
