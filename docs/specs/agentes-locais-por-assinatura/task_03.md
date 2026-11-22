---
status: completed
title: Ferramentas de contexto por endpoint MCP em loopback
type: backend
complexity: high
---

# Task 03: Ferramentas de contexto por endpoint MCP em loopback

## Visão geral
O worker passa a servir, em `127.0.0.1` com porta efêmera, um endpoint MCP com as quatro ferramentas de contexto (`searchProject`, `readProjectFile`, `searchGitHubIssues`, `getGitHubIssue`). O endpoint é autenticado pela capability da execução e delega ao `IssueContextController` existente. Ele substitui a rota HTTP interna que o Dev_Control usava, e só a capability sai do worker para o processo do agente.

<critical>
- LEIA a spec (`spec.md`, §15 "Endpoint MCP", DEC-03, §18) e as regras do projeto (AGENTS.md, `.agents/rules/code-standards.md`) antes de começar. Leia a skill `layered-backend`.
- Use o Context7 para a API atual do `@modelcontextprotocol/sdk` (servidor streamable HTTP).
- FAÇA UMA MINI-TAREFA POR VEZ, na ordem. Só marque `[x]` depois de rodar o "Pronto quando" dela e ver passar.
- NÃO saia dos arquivos listados sem registrar o motivo no Registro de execução. Nada fora do escopo da spec.
- TESTES JUNTO COM O CÓDIGO: cada mini-tarefa implementa os testes atribuídos a ela.
- Ao começar, mude `status` para `in_progress` (aqui e em `_tasks.md`). Não marque `completed`: isso acontece depois da revisão aprovada.
</critical>

## Requisitos
- REQ-005: o sistema DEVE oferecer ao agente apenas as quatro consultas de contexto, restritas ao repositório e ao commit fixados da execução e registradas na atividade.
- NFR-01: nenhuma credencial além da capability da execução chega ao processo do agente.
- B-07: a consulta além da 12ª volta "indisponível".
- B-08: uma consulta com credencial de outra execução ou vencida é recusada.
- Não muda (spec §9): os limites do broker (12 consultas, 300 linhas por leitura, 64 KB por resultado, commit fixado na primeira consulta).

## Interfaces
- **Consome:** `IssueContextController.handle({ executionId, toolCallId, request }, capability)`, `IssueContextRequest` e `ScopedContextResult` (existentes, `packages/api/src/controllers/issueContextController.ts`, `packages/api/src/application/github/scopedContextGateway.ts`).
- **Produz:**
  - `IssueContextDao.listCalls(executionId: string): Promise<RecordedContextCall[]>`, com `RecordedContextCall = { toolCallId: string; status: "done" | "empty" | "unavailable"; evidenceIds: string[]; durationMs: number; reason?: string }`, em ordem de gravação;
  - `class ContextMcpEndpoint { constructor(controller: IssueContextController); start(): Promise<void>; stop(): Promise<void>; urlFor(executionId: string): string }`, com a URL `http://127.0.0.1:<porta>/mcp/<executionId>` e bearer igual à capability.

## Mini-tarefas

- [x] **03.1 — `listCalls` no DAO de contexto**
  - **Arquivos:** `packages/api/src/application/database/dao/issueContextDao.ts`, `packages/api/src/infra/database/dao/tasks/drizzleIssueContextDao.ts`, `packages/api/test/issue-context.test.ts` (acrescentar caso)
  - **Testes:** V-06g
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/issue-context.test.ts` passa; `pnpm --dir packages/api typecheck` sem erros
- [x] **03.2 [P] — Definição e validação das quatro ferramentas**
  - **Arquivos:** `packages/api/src/infra/agents/contextMcpTools.ts` e `packages/api/src/infra/agents/contextMcpTools.test.ts` (criar)
  - **Testes:** V-06e, V-06h
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run src/infra/agents/contextMcpTools.test.ts` passa; typecheck sem erros
- [x] **03.3 — Servidor MCP HTTP em loopback**
  - **Arquivos:** `packages/api/package.json` (`@modelcontextprotocol/sdk`, versão exata), `packages/api/src/infra/agents/contextMcpEndpoint.ts` (criar), `packages/api/test/context-mcp.test.ts` (criar)
  - **Testes:** V-06a, V-06b, V-06c, V-06d, V-06f, V-06i
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/context-mcp.test.ts` passa; typecheck sem erros

## Detalhes de implementação
- Os schemas de entrada e as descrições das ferramentas são os de `../Dev_Control/src/mastra/tools/flow-dev-context-tools.ts` (mesmas chaves e limites).
- O `toolCallId` é `randomUUID()` gerado pelo endpoint em cada chamada.
- Erros do controller (`capability_invalid`, `stale_execution`, `access_revoked`) viram erro de ferramenta MCP com mensagem fixa, sem stack.
- Escutar só em `127.0.0.1`, porta `0`. Qualquer caminho fora de `/mcp/<uuid>` responde 404.
- Validar o formato do bearer (1–128 caracteres, sem espaços nem aspas) antes do controller. Nunca logar o valor.
- O endpoint não é ligado ao worker aqui; isso acontece na 06.5.

### Arquivos relevantes
- `packages/api/src/controllers/issueContextController.ts`: as regras de capability, limite e registro reusadas.
- `apps/web/src/app/api/internal/issue-context/route.ts`: a rota atual que este endpoint substitui (removida na 07.2).
- `packages/api/test/issue-context.test.ts`: o fixture de execução e o gateway falso para reaproveitar.

### Arquivos afetados
- `packages/api/src/application/database/dao/issueContextDao.ts`: o método `listCalls`.
- `packages/api/package.json`: a dependência nova.

### Decisões relacionadas
- DEC-03 (spec §17): MCP em loopback dentro do worker, em vez de stdio ou da rota do Next.

## Premissas
Nenhuma.

## Testes atribuídos
- [x] V-06g: duas chamadas gravadas na mesma execução → `listCalls` devolve 2 itens em ordem de gravação, com `status` e `evidenceIds`; sem chamadas → `[]`.
- [x] V-06e: `readProjectFile` com `toLine - fromLine >= 300` → recusado antes do controller.
- [x] V-06h: `searchProject` com `query` de 1 caractere → recusado; com 2–180 → vira `IssueContextRequest` com `tool: "searchProject"`.
- [x] V-06a: um cliente MCP real lista exatamente as quatro ferramentas.
- [x] V-06b: `searchProject` com capability válida → resultado do `ScopedContextGateway` falso, e `listCalls` com 1 item.
- [x] V-06c: capability de outra execução, e depois uma vencida → erro de ferramenta, nada gravado.
- [x] V-06d: 13ª chamada na mesma execução → `status: "unavailable"`, `reason: "context_limit"`.
- [x] V-06f: bearer com espaços, aspas ou mais de 128 caracteres → recusado antes do controller, sem o valor no log.
- [x] V-06i: `GET /outro` → 404; o servidor escuta só em `127.0.0.1`.

## Critérios de sucesso
- Todas as mini-tarefas marcadas, cada uma com o "Pronto quando" executado.
- Todos os testes atribuídos implementados e passando.
- O endpoint sobe e desce sem deixar porta aberta (`stop()` fecha o servidor).
- Typecheck e lint de `packages/api` sem erros; nenhuma regra do AGENTS.md violada.

## Registro de execução

- **03.1:** `IssueContextDao.listCalls` + `RecordedContextCall`, lendo `task_tool_activity` por `sequence`. Caso V-06g acrescentado a `test/issue-context.test.ts` (6 passam).
- **03.2:** `contextMcpTools.ts` (schemas e `parseContextToolInput`, mesmas chaves e limites do Dev_Control) com 4 testes unitários.
- **03.3:** `@modelcontextprotocol/sdk` 1.32.2 (versão exata, publicada em 2026-10-23). `contextMcpServer.ts` monta um `McpServer` por requisição (modo sem sessão, resposta JSON) e `contextMcpEndpoint.ts` é o servidor HTTP em `127.0.0.1:0`, que responde 404 fora de `/mcp/<uuid>`, 401 para bearer fora de `[^\s"']{1,128}`, 405 para métodos ≠ POST (a CLI tenta um GET de SSE, e o 405 é aceito, como visto no spike). Os erros do controller viram erro de ferramenta com texto fixo. Desvio: dois arquivos em vez de um, por causa do limite de 100 linhas. `test/context-mcp.test.ts` com cliente MCP real: 7 passam (V-06a–d, f, i e o fechamento da porta). A suíte unitária inteira e o typecheck continuam verdes.

## Revisões

- 2026-11-22 · review-003 · APROVADO COM RESSALVAS · reviews/review-003.md (as revisões 001 e 002 reprovaram; todos os achados delas foram corrigidos e reconferidos na 003)
