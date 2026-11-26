# Revisão de conformidade 001: Leitura de imagens pelo Issue Author e pelo Planejamento

> **Data:** 2026-11-26 · **Escopo:** feature inteira (task_01 a task_04, todas `completed`, 10/10 mini-tarefas) · **Intervalo:** mudanças não commitadas sobre `fd7ea94` (branch `flow/issue-18`)
> **Spec:** `docs/specs/leitura-de-imagens-pelos-agentes/spec.md`, `_tasks.md`, `task_01.md`…`task_04.md`
> **Regras lidas:** `AGENTS.md`, `CLAUDE.md`, `.agents/rules/code-standards.md`, skills `layered-backend` e `software-testing` (exigidas pelas restrições globais do `_tasks.md`)

## Veredito: APROVADO COM RESSALVAS

Todos os REQ, NFR, casos de borda, DEC e testes V-01 a V-08 estão implementados e passam. Nada do que não devia mudar mudou. As suítes completas, o typecheck e o lint passam. Ficam só achados menores: um helper duplicado com 4 parâmetros, strings mágicas que as restrições globais mandavam extrair, um import no fim de arquivo e duas lacunas pequenas de teste (ordem no gateway e NFR-04).

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
| `scan_diff.py --worktree --max-lines 100` | 51 arquivos; nenhuma dependência nova; nenhum comentário, `skip`, escape de tipo ou mock em código de produção. Uma asserção alterada em `planning-worker.test.ts:30`, que só acrescenta as chaves `images`/`omittedImages` (necessário). `planning-worker.test.ts` tem 174 linhas, mas já passava de 100 antes da feature (1 linha alterada) | — |
| `wc -l` nos `.ts` novos e alterados | maior arquivo de produção: `agentExecution.ts` com 71 linhas | ✅ |

Os números batem com os registros de execução das tarefas (921 unitários; 195 arquivos de integração).

## Conformidade com a spec

| Item | Status | Evidência |
|---|---|---|
| REQ-001 | ✅ | `generationImages.ts:13-35`: anexos de todas as mensagens da tarefa + `issueImageReferences(renderIssueBody(draft))` · `issue-author-images.test.ts › "V-02a through V-02e and V-02g"` |
| REQ-002 | ✅ | consulta de anexos por todos os `messageIds` (`generationImages.ts:22-27`) · V-02a: imagens das mensagens 1 e 3 no refinamento |
| REQ-003 | ✅ | `agentImages.ts:15-22` · V-01c; V-02g (anexo também no rascunho sai uma vez) |
| REQ-004 | ✅ | `planningImages.ts:7-19`; `planningWorkerInput.ts:27-31` · `planning-images.test.ts` V-03a |
| REQ-005 | ✅ | Claude: `claudeStreamInput.ts`, `claudeArguments.ts:8-10` (V-04a/b); Codex: `codexImageFiles.ts`, `codexArguments.ts:12` (V-05a/b) |
| REQ-006 | ✅ | `agentImagePrompt.ts:5-15` · V-07a, V-07e, V-07f |
| REQ-007 | ✅ | `agentImages.ts:42-51` (pula as que não cabem e continua avaliando) · V-01a, V-01b, V-01f, V-01g, V-02h |
| REQ-008 | ✅ | `reason` em `agentImages.ts:34-38`; selecionada sem conteúdo vira `unavailable` (`generationImages.ts:53`) · V-01d, V-07c, V-02c/d, V-03b |
| REQ-009 | ✅ | frase no pedido (`agentImagePrompt.ts:3`) e nas regras (`issue-author/rules.md:19`, `planning/rules.md:7`) · V-07d, V-08d, V-08e |
| REQ-010 | ✅ | `claudeCodeRunner.ts:49-51` e `codexImageFiles.ts:6` sem imagens; testes antigos sem mudar asserções; V-06a–d |
| NFR-01 | ✅ | `taskImageReads.ts:9,16` e `generationImages.ts:26` filtram por `taskId` · V-02i, V-02c, V-03b |
| NFR-02 | ✅ | imagens dentro do `mkdtemp` apagado no `finally` (`agentDirectory.ts:7`) · V-05c (sucesso e falha). Timeout e cancelamento passam pelo mesmo `finally`, sem teste próprio |
| NFR-03 | ✅ | `agentExecution.ts:41` registra só `length` · V-08c (sucesso e falha, sem ids nem base64) |
| NFR-04 | 🟡 | código lê conteúdo só dos selecionados (`generationImages.ts:48`, `planningImages.ts:22`), mas nenhum teste falharia se lesse todos (ver M-4) |
| US-01 cen. 1–3 | ✅ | V-02a/V-04/V-05/V-06 |
| US-02 cen. 1–3 | ✅ | V-02a, V-02b ("tela atual"), V-02g |
| US-03 cen. 1–2 | ✅ | V-03a, V-03b |
| US-04 cen. 1–2 | ✅ | V-01a, V-01b, V-02h |
| B-01 | ✅ | V-02f |
| B-02 | ✅ | V-02d |
| B-03 | ✅ | seleção refeita a cada `loadGenerationInput`/`readPlanningInput`, sem cache. A segunda reivindicação dos testes de refinamento passa por esse caminho |
| B-04 | ✅ | V-03c (`user-attachments` fora de `images` e de `omittedImages`) |
| B-05 | ✅ | V-04b envia GIF como `image/gif` sem conversão |
| B-06 | ✅ | `agentFailure.ts:22,55` lê o evento `result` · V-04d (`is_error` → `provider_failed`) |
| Não muda: prompt e args sem imagens | ✅ | V-06a–d; `claudeCodeRunner.test.ts` e `codexRunner.test.ts` só ganharam `images: []` |
| Não muda: limite de 100 KB só no texto | ✅ | `issueAuthorPrompt.ts:9` passa só draft, evidência e mensagens a `buildGenerationInput` |
| Não muda: hash, admissão e status do Planejamento | ✅ | imagens fora de `PlanningInput` (`planningContracts.ts:24`); carregadas depois da conferência do hash (`planningWorkerInput.ts:27-30`) · V-03d |
| Não muda: publicação e terminal | ✅ | `issueImageSelection.ts` só trocou o mapa local pelo `AGENT_IMAGE_EXTENSIONS` idêntico; os testes do terminal passam |
| Não muda: fontes citáveis | ✅ | parsers de saída e validação de citações intocados |
| DEC-01 | ✅ | `stream-json` só com imagens; `--tools ""` mantido (V-04a) |
| DEC-02 | ✅ | `--image` logo após `exec`; `--disable view_image` mantido (V-05b) |
| DEC-03 | ✅ | `selectAgentImages` em `application/agents/`, recebe só metadados |
| DEC-04 | ✅ | imagens não entram na evidência retida nem no contrato de saída |
| Fora de escopo | ✅ | sem download por URL, sem mudança de tela, sem redimensionamento, sem migration nem dependência nova |

## Regras do projeto

| Regra (fonte) | Status | Evidência |
|---|---|---|
| Sem comentários (`code-standards.md` › Comments) | ✅ | scanner sem `comment-added` |
| `.ts` ≤ 100 linhas (`code-standards.md` › File Size) | ✅ | maior arquivo novo ou alterado em produção: 71 linhas |
| Funções ≤ 30 linhas | ✅ | maior função nova: `loadGenerationImages`, com 8 linhas |
| ≤ 3 parâmetros (`code-standards.md` › Parameters) | ❌ menor | `generationImages.ts:47` e `planningImages.ts:21` têm 4 (M-1) |
| Sem linhas em branco em funções | ✅ | |
| Números e strings mágicos (`code-standards.md` › Magic Numbers; `_tasks.md`, restrições globais) | ❌ menor | `"limit"`/`"unavailable"` literais (M-2) |
| Camadas (`layered-backend`) | ✅ | regra pura em `application/agents/`, banco em `infra/database/dao/tasks/`, CLI em `infra/agents/` |
| Testes com oráculo da spec, sem `toBeTruthy` (`software-testing`) | ✅ | valores esperados fixos (bytes, ids, linhas literais do prompt) |
| Verificação proporcional (`AGENTS.md` › Verificação) | ✅ | suítes completas rodadas no fechamento, conforme os registros |

## Achados

### task_01 · 01.1 / task_03 · 03.1 / task_04 · 04.1

#### M-1 (Menor): helper de leitura duplicado e com 4 parâmetros
- **Onde:** `packages/api/src/infra/database/dao/tasks/generationImages.ts:47` (`loadSelectedContents(database, taskId, selected, omitted)`) e `packages/api/src/infra/database/dao/tasks/planningImages.ts:21` (`loadSelected(database, taskId, selected, omitted)`). As duas funções são idênticas, e a montagem da candidata indisponível (`contentType: "", byteSize: 0, createdAt: new Date(0)`) também se repete em `generationImages.ts:43` e `planningImages.ts:14`.
- **Contra:** `code-standards.md` › Parameters ("Avoid using more than 3 parameters"); duplicação de utilitário.
- **Problema:** duas cópias da mesma regra (selecionada sem conteúdo vira `unavailable`) podem divergir numa correção futura.
- **Correção esperada:** uma única função, por exemplo em `taskImageReads.ts`, que recebe `(database, { taskId, selection })` e devolve `{ images, omittedImages }`, usada pelos dois loaders. A candidata indisponível sai de um construtor único.

#### M-2 (Menor): strings mágicas que as restrições globais mandavam extrair
- **Onde:** `agentImages.ts:37` (`"limit" as const : "unavailable" as const`), `generationImages.ts:53` e `planningImages.ts:27` (`reason: "unavailable"`), `codexImageFiles.ts:7,11` (`"images"`, `"bin"`).
- **Contra:** `code-standards.md` › Magic Numbers and Strings; `_tasks.md` › Restrições globais ("constantes nomeadas para … `"limit"`, `"unavailable"`").
- **Correção esperada:** constantes exportadas de `agentImages.ts` (por exemplo `IMAGE_OMITTED_BY_LIMIT` e `IMAGE_UNAVAILABLE`) usadas nos três arquivos, e constantes locais para o nome da pasta e a extensão padrão.

### task_04 · 04.1

#### M-3 (Menor): import no fim do arquivo
- **Onde:** `packages/api/src/application/services/tasks/planningContracts.ts:41`: `import type { AgentImage, OmittedImage } from "../../agents/agentImages";` depois da classe `PlanningDomainError`.
- **Problema:** foge da convenção de todos os outros arquivos do pacote (imports no topo) e confunde a leitura.
- **Correção esperada:** mover o import para o topo do arquivo.

### task_01 · 01.3 / task_03 · 03.2 / task_04 · 04.2 (testes)

#### M-4 (Menor): duas lacunas de teste
- **Onde e evidência:**
  1. `issueAuthorImages.test.ts:43-53` (V-08a) e `planningImages.test.ts:33-42` (V-08b) usam **uma** imagem. A tarefa pedia duas, "com os mesmos 2 ids e bytes na mesma ordem". Escapa um gateway que inverta ou reordene `images`, e a numeração do prompt deixaria de bater com a ordem do canal (REQ-006).
  2. NFR-04 / V-02 ("conteúdo de omitida lido"): `issue-author-images.test.ts:55-66` (V-02h) confere o resultado, não a consulta. Se `readTaskImageContents` recebesse os ids de todas as candidatas, o teste continuaria verde. O código atual está certo (`generationImages.ts:48`); a lacuna é só de prova.
- **Consequência:** uma regressão nesses dois pontos passaria sem teste vermelho.
- **Correção mínima:** usar duas imagens distintas em V-08a e V-08b e conferir `runs[0].images` em ordem. Para NFR-04, um teste unitário de `loadGenerationImages`/`loadPlanningImages` com 12 candidatas que confira os ids repassados a `readTaskImageContents` (espião na função exportada ou consulta registrada).

Achados inferidos pela leitura do código. Os testes atuais passam, e nenhum desses pontos falha hoje.

## Atualizações de spec a discutir

- **S-1 (spec §7, imagens do rascunho):** a regra diz "só as referenciadas por `flow-image:<id>`". O código usa `issueImageReferences`, como §13 sugere, e por isso também aceita no rascunho o link publicado do Flow Dev. É inofensivo, porque continua filtrado pela tarefa, mas §7 e §13 discordam. Sugiro que §7 diga "por `flow-image:<id>` ou pelo link publicado do Flow Dev".
- **S-2 (spec §15, "anexo da mensagem N"):** P-04 fixou N = `task_messages.sequence`, que conta também as mensagens do assistente, e o texto do prompt diz `attachment of user message 3`. O modelo pode ler isso como "terceira mensagem da operadora". Vale registrar P-04 na spec e talvez trocar o texto para `attachment of conversation message 3`, uma mudança de formato que mexe em V-07.
- **S-3 (Definição de pronto: "Spec atualizada com o que mudar na implementação"):** a spec continua "Em revisão" e não registra as premissas P-01 a P-05 do `_tasks.md` nem a mudança do mapa de extensões para `application/agents/agentImages.ts` (`AGENT_IMAGE_EXTENSIONS`), que o `issueImageSelection.ts` do terminal passou a importar.

## Divergências entre o relatório do implementador e a evidência

- Nenhuma relevante. Contagens de testes, typecheck e lint conferem com os registros. A única ressalva: V-08a e V-08b estão marcados `[x]` com 1 imagem, quando a tarefa descrevia 2 (M-4).

## Prompt de correção

> Corrija, nesta ordem, sem alterar nada fora do listado:
> 1. **M-1**: `packages/api/src/infra/database/dao/tasks/generationImages.ts` e `planningImages.ts`: extraia uma única função de leitura das selecionadas (por exemplo em `taskImageReads.ts`) com no máximo 3 parâmetros (`database, { taskId, selection }`) e um único construtor de candidata indisponível. Os dois loaders passam a usá-los. Comportamento idêntico.
> 2. **M-2**: crie em `packages/api/src/application/agents/agentImages.ts` constantes nomeadas para os motivos `"limit"` e `"unavailable"` e use-as em `agentImages.ts`, `generationImages.ts` e `planningImages.ts`. Em `codexImageFiles.ts`, extraia `"images"` e `"bin"` para constantes.
> 3. **M-3**: `packages/api/src/application/services/tasks/planningContracts.ts`: mova o `import type { AgentImage, OmittedImage }` da linha 41 para o topo.
> 4. **M-4**: em `src/infra/issue-author/issueAuthorImages.test.ts` (V-08a) e `src/infra/planning/planningImages.test.ts` (V-08b), use duas imagens distintas e confira `runs[0].images` com os dois ids e bytes na ordem. Acrescente um teste que prove NFR-04: com 12 candidatas, só os 10 ids selecionados chegam a `readTaskImageContents`.
>
> Restrições: sem comentários; `.ts` ≤ 100 linhas; funções ≤ 30 linhas; ≤ 3 parâmetros; sem novas dependências; não mude as asserções existentes além das de V-08a/V-08b.
> Ao terminar, rode e mostre a saída de: `pnpm --dir packages/api exec vitest run src/infra/issue-author src/infra/planning src/application/agents`, `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/issue-author-images.test.ts test/planning-images.test.ts test/agent-image-reads.test.ts`, `pnpm --dir packages/api typecheck` e `pnpm lint`. Não marque como concluído sem essa saída.
