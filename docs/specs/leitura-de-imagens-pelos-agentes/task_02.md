---
status: completed
title: Runners e execução entregam as imagens
type: backend
complexity: high
---

# Task 02: Runners e execução entregam as imagens

## Visão geral
Leva as imagens de `executeLocalAgent` até as CLIs: `AgentRun` ganha `images`, o Claude passa a usar `stream-json` com blocos de imagem quando há imagens, e o Codex grava as imagens no diretório da execução e as passa com `--image`. Sem imagens, os dois runners continuam byte a byte iguais. É a fatia de maior risco (formato de saída do Claude, ordem dos argumentos do Codex, limpeza de arquivos), por isso fica isolada e provada contra o CLI falso.

<critical>
- LEIA a spec (`docs/specs/leitura-de-imagens-pelos-agentes/spec.md`, em especial §15 "Claude, com imagens"/"Codex, com imagens", DEC-01, DEC-02, §21) e as regras do projeto (AGENTS.md, `.agents/rules/code-standards.md`, skill `layered-backend`) antes de começar.
- FAÇA UMA MINI-TAREFA POR VEZ, na ordem. Só marque `[x]` depois de rodar o "Pronto quando" dela e ver passar.
- NÃO saia dos arquivos listados sem registrar o motivo no Registro de execução. Nada fora do escopo da spec.
- TESTES JUNTO COM O CÓDIGO: cada mini-tarefa implementa os testes atribuídos a ela, seguindo a skill de testes do projeto (`software-testing`). Isso quer dizer: asserção sobre o efeito observável e específico, nada de `toBeTruthy` ou de só checar que não lança exceção; valor esperado tirado da spec, nunca recalculado a partir do código; dublês só em dependências lentas, variáveis ou externas; relógio e aleatoriedade controlados. Em bug, reproduza antes de corrigir.
- Ao começar, mude `status` para `in_progress` (aqui e em `_tasks.md`). Mude para `completed` só quando todas as mini-tarefas estiverem marcadas e os critérios de sucesso tiverem sido comprovados por comando. A revisão contra a spec acontece uma vez, depois de todas as tarefas: não a espere aqui, mas não marque nada que não tenha prova, porque ela vai conferir.
</critical>

## Requisitos
- REQ-005: QUANDO houver imagens, o sistema DEVE entregá-las ao modelo como conteúdo de imagem, pelo Claude e pelo Codex, sem depender de ferramentas do agente. (spec §6)
- REQ-010 (runners): SE `images` estiver vazio, ENTÃO os argumentos de CLI e o stdin DEVEM ser exatamente os de hoje. (spec §6)
- NFR-02: os arquivos de imagem do Codex ficam no diretório privado da execução e são apagados ao final, com sucesso, falha, timeout ou cancelamento. (spec §10)
- NFR-03: a linha `[agents] run` ganha `images` e `omittedImages` como contagens, nunca conteúdo nem ids. (spec §10, §19)
- DEC-01: Claude com imagens troca `--output-format json` por `--input-format stream-json --output-format stream-json --verbose`; stdin é uma única linha `{"type":"user","message":{"role":"user","content":[{"type":"text","text":<prompt>},{"type":"image","source":{"type":"base64","media_type":<contentType>,"data":<base64>}}…]}}` seguida de fim de arquivo; o resultado é o último evento `{"type":"result"}`, com `structured_output` lido como hoje. `--tools ""` continua. (spec §15, §17)
- DEC-02: Codex grava `images/<n>.<ext>` no diretório da execução e passa `--image <caminho>` uma vez por imagem, logo depois de `exec` e antes das demais opções; `view_image` continua em `DISABLED_FEATURES`. (spec §15, §17)
- B-05: GIF é enviado como está, sem conversão. (spec §8)
- B-06: recusa do provedor cai na classificação de falha existente (`classifyFailure`), sem nova tentativa sem imagens. (spec §8)

## Interfaces
- **Consome:** `AgentImage`, `OmittedImage` de `packages/api/src/application/agents/agentImages.ts` (task_01).
- **Produz:**
  - `AgentRun` (`application/agents/localAgentRunner.ts`) com o campo novo `images: AgentImage[]`.
  - `AgentExecution<T>` (`infra/agents/agentExecution.ts`) com os campos novos `images: AgentImage[]` e `omittedImages: OmittedImage[]`; `executeLocalAgent` repassa `images` ao runner e grava `images: <n>` e `omittedImages: <n>` na linha `[agents] run`, no sucesso e na falha.
  - `claudeArguments` aceita `withImages: boolean` no objeto de entrada.
  - `codexArguments` aceita `imagePaths: string[]` no objeto de entrada.

## Mini-tarefas

- [x] **02.1 — `images` no `AgentRun` e na execução, com contagens no log**
  - **Arquivos:** `packages/api/src/application/agents/localAgentRunner.ts`, `packages/api/src/infra/agents/agentExecution.ts`, `packages/api/src/infra/agents/agentExecution.test.ts` (criar), `packages/api/src/infra/issue-author/localIssueAuthorGateway.ts` e `packages/api/src/infra/planning/localPlanningGateway.ts` (passar `images: []` e `omittedImages: []` por enquanto), construtores de `AgentRun` nos testes existentes (`claudeCodeRunner.test.ts`, `codexRunner.test.ts`, `providerRunner.test.ts`) com `images: []`
  - **Testes:** V-08c
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run src/infra/agents/agentExecution.test.ts` passa; `pnpm --dir packages/api typecheck` sem erros
  - **Nota:** os gateways recebem `[]` fixo aqui; as tarefas 03 e 04 trocam pelo valor do input. `agentExecution.ts` tem 68 linhas: se passar de 100, extraia `writeLog` para `agentRunLog.ts`.
- [x] **02.2 — Claude por `stream-json` quando há imagens**
  - **Arquivos:** `packages/api/src/infra/agents/claudeArguments.ts`, `packages/api/src/infra/agents/claudeStreamInput.ts` (criar: monta a linha de stdin), `packages/api/src/infra/agents/claudeStreamOutput.ts` (criar: acha o último evento `result`), `packages/api/src/infra/agents/claudeCodeRunner.ts`, `packages/api/test/fixtures/agents/fakeCli.mjs`, `packages/api/src/infra/agents/claudeImageRunner.test.ts` (criar)
  - **Testes:** V-04a, V-04b, V-04c, V-04d, V-06a
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run src/infra/agents/claudeImageRunner.test.ts src/infra/agents/claudeCodeRunner.test.ts` passa (o arquivo antigo sem mudar asserções); `pnpm --dir packages/api typecheck` sem erros
  - **Nota:** o CLI falso hoje acha o cenário numa linha de stdin que começa com `{"mode"`. Com `--input-format stream-json`, ele precisa ler a linha JSON, pegar o texto do bloco `text` e procurar o cenário ali, e no `dump` registrar também os blocos de imagem recebidos (`media_type` e `data`). Com `--output-format stream-json`, `emitStructured` emite várias linhas (`{"type":"system"}`, `{"type":"assistant"}`, `{"type":"result","is_error":false,"structured_output":…}`). `isCompleteResult` e `claudeReportsError` precisam funcionar nos dois formatos.
- [x] **02.3 — Codex com `--image` e arquivos no diretório da execução**
  - **Arquivos:** `packages/api/src/infra/agents/codexArguments.ts`, `packages/api/src/infra/agents/codexImageFiles.ts` (criar: grava `images/<n>.<ext>` e devolve os caminhos), `packages/api/src/infra/agents/codexRunner.ts`, `packages/api/test/fixtures/agents/fakeCli.mjs` (no `dump`, registrar o conteúdo em base64 dos arquivos passados em `--image` no momento da execução), `packages/api/src/infra/agents/codexImageRunner.test.ts` (criar)
  - **Testes:** V-05a, V-05b, V-05c, V-06b
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run src/infra/agents/codexImageRunner.test.ts src/infra/agents/codexRunner.test.ts` passa (o antigo sem mudar asserções); `pnpm --dir packages/api typecheck` sem erros
  - **Nota:** extensões: `image/png` → `png`, `image/jpeg` → `jpg`, `image/gif` → `gif`, `image/webp` → `webp` (o mesmo mapa de `issueImageSelection.ts`; exporte-o ou mova-o para `application/agents/agentImages.ts` sem mudar o terminal). Sem imagens, não criar a pasta `images/`. O stdin do Codex continua `${instructions}\n\n${prompt}`.

## Detalhes de implementação
O teste de runner é processo real contra `test/fixtures/agents/fakeCli.mjs` (spec §22). Espelhe `claudeCodeRunner.test.ts` e `codexRunner.test.ts`: `request(scenario)` põe o cenário como prompt; o modo `dump` devolve `args`, `stdin`, `cwd` e arquivos. Use dois buffers pequenos e distintos (por exemplo os 8 bytes de assinatura PNG + 3 bytes, e um JPEG mínimo) para conferir base64 e bytes. `withAgentDirectory` já apaga o diretório no `finally`, o que cobre NFR-02 desde que os arquivos de imagem fiquem dentro dele.

### Arquivos relevantes
- `packages/api/src/infra/agents/claudeCodeRunner.ts`: `isCompleteResult`, `structuredOutput`, `interpret`, `execute`.
- `packages/api/src/infra/agents/agentFailure.ts`: `claudeReportsError` e `classifyFailure` (B-06).
- `packages/api/src/infra/agents/agentProcess.ts`: `runAgentProcess` escreve `stdin` e fecha a entrada.
- `packages/api/src/infra/agents/agentDirectory.ts`: `withAgentDirectory`.
- `packages/api/src/infra/agents/codexOutput.ts`: leitura da saída do Codex (não muda).
- `packages/api/test/fixtures/agents/fakeCli.mjs`, `fakeCliPath.ts`: CLI falso.

### Arquivos afetados
- `localAgentRunner.ts`, `agentExecution.ts`, `claudeArguments.ts`, `claudeCodeRunner.ts`, `codexArguments.ts`, `codexRunner.ts`, `fakeCli.mjs`, os dois gateways (só `images: []`/`omittedImages: []`) e os construtores de pedido dos testes de runner.

### Decisões relacionadas
- DEC-01 (spec §17): `stream-json` só com imagens.
- DEC-02 (spec §17): `--image`, sem reativar `view_image`.
- Riscos (spec §21): parser procura a última linha `type: "result"`; stdin fechado logo após a linha; `--image` logo após `exec`.

## Premissas
- P-05: com imagens, o Claude mantém `-p` e as demais opções na mesma ordem; só o par `--output-format json` é substituído, na mesma posição, por `--input-format stream-json --output-format stream-json --verbose`.

## Testes atribuídos
- [x] V-08c: `executeLocalAgent` com runner dublê, 2 imagens e 1 omitida → o runner recebe `images` com os 2 itens na mesma ordem; a linha `[agents] run` tem `"images":2,"omittedImages":1` e não contém os ids nem o base64; na falha do runner a linha também traz as contagens · `executeLocalAgent` real, runner e log dublês
- [x] V-04a: Claude com 2 imagens → `args` iguais aos de hoje exceto `--output-format json` trocado por `--input-format stream-json --output-format stream-json --verbose` · `ClaudeCodeRunner` + processo real do CLI falso
- [x] V-04b: mesmo cenário → stdin é uma única linha JSON terminada em fim de arquivo, `content[0]` é `{type:"text", text:<prompt>}` e `content[1..2]` são blocos `image` com `media_type` igual ao `contentType` e `data` igual ao base64 dos bytes originais, na ordem de `images`; um GIF sai com `image/gif` sem conversão (B-05) · CLI falso
- [x] V-04c: saída `stream-json` com linhas `system`, `assistant` e `result` → `output` igual ao `structured_output` do evento `result` · CLI falso
- [x] V-04d: saída `stream-json` sem evento `result` e código 0 → `AgentRunError` `invalid_output` com detalhe `no_structured_output`; com `result` `is_error: true` → a mesma classificação de falha que o formato `json` dá hoje (B-06) · CLI falso
- [x] V-06a: Claude com `images: []` → `args` exatamente os do teste V-05a atual e stdin igual ao prompt · CLI falso
- [x] V-05a: Codex com 2 imagens (PNG e JPEG) → durante a execução existem `images/1.png` e `images/2.jpg` no diretório da execução, com os bytes originais (base64 registrado pelo CLI falso) · `CodexRunner` + processo real do CLI falso
- [x] V-05b: mesmo cenário → `args[0]` é `exec`, seguido de `--image <…/images/1.png> --image <…/images/2.jpg>`, depois as opções de hoje na mesma ordem, e o último argumento é `-`; `--disable view_image` continua presente · CLI falso
- [x] V-05c: depois de uma execução com imagens bem-sucedida e de outra que falha (modo `fail`) → o diretório da execução não existe mais · CLI falso
- [x] V-06b: Codex com `images: []` → `args` iguais aos de hoje, nenhum `--image`, nenhuma pasta `images/` · CLI falso

## Critérios de sucesso
- Todas as mini-tarefas marcadas, cada uma com o "Pronto quando" executado.
- Todos os testes atribuídos implementados e passando.
- `claudeCodeRunner.test.ts`, `codexRunner.test.ts`, `providerRunner.test.ts` e os testes dos gateways passam sem mudança nas asserções existentes.
- Nenhum arquivo passa de 100 linhas; nenhuma função passa de 30 linhas.
- Fechamento: `pnpm --dir packages/api test` e `pnpm --dir packages/api typecheck` sem erros.

## Registro de execução
- 2026-11-26 — 02.1 concluída. `pnpm --dir packages/api exec vitest run src/infra/agents/agentExecution.test.ts` (2 testes passaram) e `pnpm --dir packages/api typecheck` passaram.
- 2026-11-26 — 02.2 concluída. `pnpm --dir packages/api exec vitest run src/infra/agents/claudeImageRunner.test.ts src/infra/agents/claudeCodeRunner.test.ts` (16 testes passaram, incluindo os existentes sem alteração de asserções) e `pnpm --dir packages/api typecheck` passaram.
- 2026-11-26 — 02.3 concluída. `pnpm --dir packages/api exec vitest run src/infra/agents/codexImageRunner.test.ts src/infra/agents/codexRunner.test.ts` (11 testes passaram, incluindo os existentes sem alteração de asserções) e `pnpm --dir packages/api typecheck` passaram. A extensão MIME foi centralizada em `application/agents/agentImages.ts` e o seletor do terminal passou a consumir essa constante para manter um único mapa sem alterar seu comportamento.
- 2026-11-26 — Fechamento da task_02: `pnpm --dir packages/api test` (146 arquivos, 914 testes passaram), `pnpm --dir packages/api typecheck` e `pnpm lint` passaram.
