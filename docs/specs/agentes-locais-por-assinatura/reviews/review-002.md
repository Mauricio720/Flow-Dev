# Revisão de conformidade 002: Issue Author e Planejamento com a assinatura da máquina

> **Data:** 2026-11-22 · **Escopo:** feature inteira, segunda rodada (reconfere as correções da review-001 e tudo que elas tocaram) · **Intervalo:** mudanças não commitadas sobre `c78d44d` (`git diff HEAD` + arquivos novos)
> **Spec:** `spec.md`, `v00-spike.md`, `_tasks.md`, `task_01.md`–`task_07.md`, `reviews/review-001.md`
> **Regras lidas:** `CLAUDE.md` → `AGENTS.md`, `apps/web/AGENTS.md`, `.agents/rules/code-standards.md`, `.agents/rules/e2e-testing.md`, skill `layered-backend` (regras centrais)
> **Prontidão:** 26 das 27 mini-tarefas marcadas (a 06.5 voltou a `[ ]` com a nota "Pendente"); as 7 tarefas seguem `in_progress`. Revisão feita como gate final, a pedido do usuário, como na review-001.

## Veredito: REPROVADO

As correções da review-001 foram todas aplicadas e conferidas (I-2, I-3, M-1, M-2, M-3, M-4), e o usuário informou que fez a passada manual do V-11 (I-1) e que funcionou. O que sobra é **1 achado importante novo**: `composition.test.ts` estoura os 5 s do vitest quando a máquina está sob carga, e a suíte unitária da API falhou na minha primeira execução. A correção é pequena. Os outros dois itens são de registro (a spec e a 06.5 ainda não anotam a passada manual) e não mudam o código.

| Bloqueante | Importante | Menor | Spec a discutir |
|---|---|---|---|
| 0 | 1 | 1 | 4 (as mesmas da review-001, ainda abertas) |

## Verificação executada

| Comando | Saída | Resultado |
|---|---|---|
| `pnpm typecheck` | exit 0 (api e web) | ✅ |
| `pnpm lint` | exit 0 | ✅ |
| `pnpm --dir packages/api test` (1ª execução, com o scanner rodando em paralelo) | exit 1 · 485 passed, **1 failed** (o nome do teste não foi capturado) | ❌ |
| `pnpm --dir packages/api test` (repetida 7 vezes em seguida, máquina ociosa) | exit 0 nas 7 · 79 arquivos, 486 testes | ✅ |
| `pnpm --dir packages/api test` com 3 `pnpm --dir apps/web test` em paralelo (3 execuções) | exit 1 nas 3 · `src/infra/composition.test.ts` › UT-045, UT-036 e V-10a: `Test timed out in 5000ms` | ❌ (F-1) |
| `pnpm --dir packages/api test:integration` (sem `TEST_DATABASE_URL`) | exit 0 · 62 arquivos, 384 testes | ✅ |
| `pnpm --dir apps/web test` | exit 0 · 58 arquivos, 281 testes | ✅ |
| `POST http://127.0.0.1:3000/api/internal/issue-context` (servidor `next dev` do usuário, PID 78766) | HTTP 404 | ✅ (M-3 em tempo de execução) |
| `scan_diff.py --worktree --max-lines 100` | 187 arquivos; dicas descartadas: `scan_diff.py`/`tasks_status.py` e as skills copiadas (ferramentas, não código do produto), `print` nesses scripts, asserções removidas já explicadas na review-001 | — |
| Varredura própria nos 123 `.ts/.tsx` de código alterados ou novos: > 100 linhas, funções > 30 linhas, linha em branco dentro de função, comentário novo | só `schema.ts` (125, já tinha 124), `planning-commands.test.ts` (144), `planning-reads.test.ts` (178) e `planning-worker.test.ts` (174), todos já acima do limite no `HEAD`; nada mais | ✅ |
| `pgrep -af fakeCli` ao fim | nenhum processo | ✅ |

**Não executado:**
- **Playwright** (`project-admin.spec.ts`, `project-agents.spec.ts`): o `next dev` do próprio usuário (PID 78766, iniciado às 11:47) ocupa o diretório do app, e o Next recusa um segundo servidor ("Another next dev server is already running"). Não o encerrei, e rodar o e2e contra o banco de desenvolvimento dele semearia usuários e projetos ali. Migrei um banco descartável até a 0045, confirmei que todas as migrações aplicam, e o apaguei. O que o e2e cobre ficou assim: o 404 da rota aposentada foi confirmado por `curl` no servidor dele; o E2E-006 foi **movido** do `project-admin.spec.ts` (97 linhas) para o `project-agents.spec.ts` (37 linhas), e a review-001 já o viu verde dentro do `project-admin.spec.ts`; não comparei linha a linha o conteúdo antes e depois da mudança. Convém rodar os dois specs uma vez com o servidor do usuário parado.
- **V-11 com as CLIs reais:** o usuário o fez e relatou que funcionou; ele não consta de nenhum arquivo, e eu não o reexecutei (consome a assinatura e exige o login do GitHub).

## Estado das correções da review-001

| Achado | Status | Evidência |
|---|---|---|
| I-1 smoke real com contexto falso | ✅ pelo aceite do usuário; ❌ no registro | O usuário fez a passada manual e informou o resultado. `spec.md` ("Resultado do V-11") ainda diz "ainda precisa de uma passada manual", e `task_06.md` 06.5 segue `[ ]`. Ver M-5 |
| I-2 arquivos > 100 linhas | ✅ | `tasksController.ts` 100 (montagem do DTO em `controllers/mappers/taskWorkspaceDtoMapper.ts`, 24 linhas); `project-admin.spec.ts` 97 + `project-agents.spec.ts` 37; `agentProcess.test.ts` 45 + `agentProcessOutput.test.ts` 20 + `agentProcessTestSupport.ts` 52; `context-mcp.test.ts` 31 + `context-mcp-auth.test.ts` 46 + `context-mcp-support.ts` 47. Contagem de testes: a suíte subiu de 483 para 486 e a de integração ficou em 384 |
| I-3 controller importando `infra/` | ✅ | `grep "infra/agents" packages/api/src/controllers` sem resultado; `agentFailureDetail` em `application/services/tasks/failureCode.ts:18`, importado por `taskWorkerController.ts:6` e `planningWorkerOutcome.ts:6`; `agentFailureMapping.test.ts` e `failureCode.test.ts` verdes |
| M-1 log de `invalid_output` | ✅ | `agentExecution.ts:57-61` grava `reason` e `outputBytes` (via `AgentRunError.withOutputBytes`, `localAgentRunner.ts:27-34`); `localIssueAuthorGateway.test.ts:92-98` confere os campos e que o título do rascunho não aparece no log |
| M-2 V-01d arquivo ausente | ✅ | `loadInstructions(agent, root = RESOURCES_ROOT)` (`agentInstructions.ts:26`); `agentInstructions.test.ts:19-23` espera `ENOENT` para os dois agentes |
| M-3 V-10c | ✅ | `project-agents.spec.ts:30-35` (POST → 404, sem credencial, independente); `routes.test.ts:49-52` continua conferindo a ausência do arquivo; 404 confirmado por `curl` |
| M-4 corrida no `shutdown()` | ✅ | `providerRunner.ts:31-33` confere `closed` de novo depois da sondagem; `providerRunner.test.ts:68-73` (V-04f) falharia sem essa segunda conferência, porque a execução retornaria `ok` em vez de `cancelled` |
| Efeito colateral da extração do DTO (I-2): `lastError` | ✅ | `workspaceDto` devolve `splitFailureCode(task.lastError)`, o mesmo valor que as leituras de lista já devolviam; a suíte de integração (rotas de detalhe) segue verde |

## Conformidade com a spec

Todos os itens avaliados como ✅ na review-001 continuam ✅: as correções só moveram código (I-2, I-3), acrescentaram campos de log (M-1), uma segunda conferência de `closed` (M-4), um parâmetro opcional (M-2) e testes (M-2, M-3, M-4). Nenhum port mudou (`IssueAuthorGateway`, `PlanningGateway`), nenhuma dependência nova entrou, e a grep de V-10d (`DevControl|ISSUE_AUTHOR_BASE_URL|PLANNING_BASE_URL|FLOW_DEV_INTERNAL_API_KEY`) segue vazia em `packages apps`.

| Item | Status | Evidência |
|---|---|---|
| §19 observabilidade | ✅ (era 🟡) | M-1 corrigido |
| REQ-021 / US-04 cen. 2 | ✅ (era 🟡) | 404 em tempo de execução; teste Playwright escrito |
| NFR-03 / B-05 | ✅ | M-4 corrigido; `› V-04e`, `› V-04f` |
| NFR-02 | 🟡 | O V-11 manual foi feito pelo usuário, mas os tempos reais (3 planejamentos ≤ 240 s, rascunho ≤ 600 s, planejamento com Codex) não estão registrados em lugar nenhum. Ver M-5 |
| REQ-012 | 🟡 | Igual à review-001: `localIssueAuthorGateway.ts:26` ainda passa `new AbortController().signal`, que nunca dispara. Segue em "Spec a discutir" |

## Regras do projeto

| Regra (fonte) | Status | Evidência |
|---|---|---|
| `.ts` ≤ 100 linhas (`code-standards.md`) | ✅ | arquivos novos ou alterados por esta entrega, todos ≤ 100; as exceções são arquivos já acima do limite no `HEAD` (`schema.ts` ganhou 1 linha) |
| Funções ≤ 30 linhas, sem linha em branco dentro de função, sem comentário novo | ✅ | varredura própria |
| ≤ 3 parâmetros, constantes nomeadas | ✅ | `loadInstructions(agent, root)`; `INVALID_OUTPUT`, `NOT_FOUND`, `RETIRED_CONTEXT_ROUTE` |
| Camadas (`layered-backend`) | ✅ (era ❌) | I-3 corrigido |
| E2E: locators acessíveis, independente, sem produção (`e2e-testing.md`) | ✅ | `getByRole("form")`, `getByLabel`, dados semeados no próprio teste; V-10c não depende de credencial |
| Verificação proporcional (`AGENTS.md`: sem aumentar `testTimeout`) | ❌ | F-1 |

## Achados

### task_06 · 06.5

#### F-1 (Importante): `composition.test.ts` estoura 5 s sob carga, e a suíte unitária da API falhou numa execução normal
- **Onde:** `packages/api/src/infra/composition.test.ts:4-17` (UT-045), `:20-25` (UT-036) e `:27-42` (V-10a). O primeiro teste importa `./composition` sem cache (`vi.resetModules()` seguido de `import`) e leva cerca de 1,6 s com a máquina ociosa (`vitest --reporter=verbose`: UT-045 1579 ms).
- **Contra:** `AGENTS.md` ("Verificação": "Não aumente `testTimeout` ... investigue a causa"); `_tasks.md` ("Restrições globais": suítes completas uma vez só, na 07.4, e precisam passar).
- **Evidência:**
  - `pnpm --dir packages/api test` falhou na minha primeira execução (485 passed, 1 failed; rodou junto com o scanner). Repeti 7 vezes em seguida, com a máquina ociosa: 7 passaram.
  - Com 3 suítes web em paralelo, 3 de 3 execuções falharam com `Test timed out in 5000ms` em UT-045, UT-036 e V-10a (UT-036 e V-10a falham por efeito do UT-045 ter consumido a janela do módulo).
  - O grafo de `composition.ts` agora importa, estaticamente, `agentComposition.ts` → `contextMcpEndpoint.ts` / `contextMcpServer.ts` → `@modelcontextprotocol/sdk`, mais os runners e os gateways locais (`composition.ts:3`, `agentComposition.ts:3-5`). A causa mais provável é esse acréscimo ao `import` do teste; não consegui comparar com o `HEAD` (a cópia extraída do `HEAD` não transformou com o caminho do repositório, que tem "Á"), então a causa é provável, não provada.
- **Problema:** o teste de composição, que já existia, passou a depender de a máquina estar ociosa. Em CI ou numa máquina ocupada (ou durante `pnpm dev`, como agora), `pnpm --dir packages/api test` falha de forma intermitente, e a 07.4 declarou a suíte "limpa".
- **Correção esperada:** sem aumentar `testTimeout`. Duas opções:
  - os três testes passam a importar `./composition` uma única vez (`beforeAll` ou `import` no topo) e `vi.resetModules()` só onde a variável de ambiente exige; ou
  - o `import` do SDK e dos runners em `agentComposition.ts` vira dinâmico (dentro de `createAgentRuntime`), de modo que `composition.ts` não puxe o SDK no carregamento.

  O resultado esperado é a suíte passar também com 3 suítes web rodando em paralelo.

### Registro

#### M-5 (Menor): a passada manual do V-11 não consta na spec nem na 06.5
- **Onde:** `spec.md` §"Resultado do V-11" (última frase: "O fluxo `pnpm dev` + mensagem pela interface ainda precisa de uma passada manual"); `task_06.md`, 06.5 `[ ]` com "Pendente: aguardando a passada manual ... ou o aceite do usuário"; `task_07.md`, V-11a–c.
- **Contra:** spec §24 ("V-11 executado com o `.env.local` sem as variáveis do Dev_Control"); NFR-02 (3 planejamentos ≤ 240 s em 3 de 3 execuções); `_tasks.md` passo 4 (a tarefa só fecha com o "Pronto quando" comprovado).
- **Problema:** o usuário confirmou que a passada funcionou, mas nenhum arquivo registra o resultado nem os tempos, e eu não tenho como conferir uma execução que não ficou registrada. Pelo aceite dele, o I-1 deixa de ser achado; o que falta é o registro.
- **Correção esperada:** o usuário (ou o implementador, a pedido dele) acrescenta em `spec.md` ("Resultado do V-11") e em `task_06.md` (Registro de execução da 06.5) a data, o que rodou (`pnpm dev`, worker, `.env.local` sem variáveis do Dev_Control, projeto real), os tempos dos 3 planejamentos, o rascunho com `searchProject` na atividade e o planejamento com Codex; depois marca a 06.5 `[x]`. Se ele não quiser os tempos, registra a dispensa do NFR-02 no mesmo lugar.

## Atualizações de spec a discutir (ainda abertas desde a review-001)

1. **REQ-012 para a geração:** o port `IssueAuthorGateway` não recebe `signal`; `localIssueAuthorGateway.ts:26` passa um `AbortController` que nunca dispara. Decidir se a geração precisa ser cancelável; se não, tirar o sinal morto.
2. **`.env.example`:** a §24 pede o arquivo e ele não existe no repositório (nenhum dos três caminhos). Tirar o item da Definição de pronto, ou criar o arquivo.
3. **Planejamento com ferramentas:** explicitar no REQ-005 que o planejamento já tinha as ferramentas de contexto no Dev_Control.
4. **Gate de prontidão:** o `_tasks.md` deve dizer que a revisão final roda com as mini-tarefas marcadas e as tarefas em `in_progress`.

## Divergências entre o relatório do implementador e a evidência

- Os números da 07.4 (483 unitários) já não batem: a suíte tem agora 486 testes, porque as correções acrescentaram 3 (V-04f, M-1, V-01d). Integração (384) e web (281) batem. A 07.4 também diz "limpa" para a suíte unitária, que falha sob carga (F-1).

## Prompt de correção

> Corrija, nesta ordem, sem alterar nada fora do listado. Leia antes `.agents/rules/code-standards.md`.
> 1. **F-1** — `packages/api/src/infra/composition.test.ts` e, se preciso, `packages/api/src/infra/agentComposition.ts`: faça `pnpm --dir packages/api test` passar também com a máquina ocupada, **sem aumentar `testTimeout`**. Opções: (a) importar `./composition` uma só vez nos três testes (`beforeAll`), mantendo `vi.resetModules()` apenas onde a variável de ambiente exige; ou (b) tornar dinâmico o `import` de `ContextMcpEndpoint`/SDK em `createAgentRuntime`, para que `composition.ts` não carregue o SDK. Mantenha UT-045, UT-036 e V-10a com as mesmas asserções, ≤ 100 linhas por arquivo, sem comentários.
> 2. **M-5** — registre em `docs/specs/agentes-locais-por-assinatura/spec.md` ("Resultado do V-11") e em `task_06.md` (06.5) a passada manual que o usuário fez (data, o que rodou, tempos, rascunho com `searchProject`, planejamento com Codex), substituindo a frase "ainda precisa de uma passada manual", e marque a 06.5 `[x]`. Peça ao usuário os tempos; não os invente.
>
> Restrições: nenhuma dependência nova, ports `IssueAuthorGateway` e `PlanningGateway` intocados.
> Ao terminar, rode e mostre a saída de: `pnpm --dir packages/api typecheck`, `pnpm --dir packages/api test` (3 vezes), `pnpm --dir packages/api test` com 3 `pnpm --dir apps/web test` em paralelo, `pnpm --dir packages/api test:integration` (sem `TEST_DATABASE_URL`). Com o `next dev` parado, rode também `pnpm --dir apps/web exec playwright test e2e/project-admin.spec.ts e2e/project-agents.spec.ts` contra um banco descartável. Não marque nada como concluído sem essa saída.

## Resolução (aplicada após esta revisão, a pedido do usuário)

- **F-1:** a hipótese do SDK estava errada. Medido: `@modelcontextprotocol/sdk` custa ~0,1 s; o `import` de `composition.ts` custa ~2 s com a máquina ociosa (drizzle/postgres ≈ 1 s, o resto do grafo ≈ 0,9 s) e ~7 s com uma suíte web rodando em paralelo. O teste, que importa o grafo de produção inteiro, foi movido de `src/infra/composition.test.ts` para `test/composition.test.ts` (suíte de integração, janela de 15 s), com as mesmas três asserções e sem mexer em nenhum timeout. Resultado: `pnpm --dir packages/api test` 483 testes, 3 de 3 verdes com 3 suítes web em paralelo (antes: 3 de 3 falhas); `test:integration` 63 arquivos, 387 testes verdes; typecheck e lint limpos. Uma tentativa intermediária (importar o SDK de forma preguiçosa, e depois um `beforeAll`) não resolveu e foi desfeita.
- **M-5:** passada manual registrada em `spec.md` (Resultado do V-11 e Histórico), `task_06.md` (06.5 `[x]`) e `task_07.md` (V-11a–c `[x]`), **por declaração do usuário, sem tempos**; a NFR-02 segue sustentada só pelos tempos do substituto.
- **Pendente:** as tarefas seguem `in_progress`: o passo 4 do `_tasks.md` exige uma revisão APROVADO para fechá-las, e eu não as altero. O Playwright (`project-admin.spec.ts`, `project-agents.spec.ts`) ainda não foi executado por esta revisão (o `next dev` do usuário ocupa o diretório do app).
