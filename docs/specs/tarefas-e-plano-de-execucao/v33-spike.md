# V-33 — Spike: modelo e esforço no Claude Agent SDK

> **Data:** 2026-11-23 · **Claude Code:** 2.1.330 (o do PATH) · **SDK:** `@anthropic-ai/claude-agent-sdk` 0.3.330, fixado sem `^` · **Spec:** [spec.md](spec.md)

O roteiro está em `spike/` (`modelEffort.ts <matrix|resume|max|haiku|models|invalid>` e `--dry-run`, com o `package.json` próprio, fora do monorepo; instalar com `pnpm --dir docs/specs/tarefas-e-plano-de-execucao/spike install --ignore-workspace`). Cada caso chama `query()` com o Claude real da assinatura da máquina, num repositório git temporário, com o ambiente filtrado pelo mesmo `terminalEnvironment` do produto e `maxTurns: 1`, `permissionMode: "default"`, prompt "Responda só OK.". A saída fica em `spike/out/<subcomando>.log` (ignorada pelo git).

## Resultados

| ID | Resultado | Evidência |
|---|---|---|
| V-33a | **Passou.** As 15 combinações (3 modelos × 5 esforços) foram **aceitas**: nenhuma lançou exceção, nenhuma voltou com `is_error` e o `system/init` mostrou o modelo pedido em todas. Nenhuma foi ignorada pelo modelo. | `out/matrix.log` |
| V-33a (esforço) | **O esforço não aparece em nenhum lugar observável** (nem no `init`, nem no `result`). O que o SDK informa é o catálogo: `query.supportedModels()` devolve `opus`, `sonnet` e `haiku` com `supportsEffort: true` e `supportedEffortLevels: ["low","medium","high","xhigh","max"]` cada um. Portanto os cinco níveis valem para os três modelos, e não há `effortsByModel`. | `out/models.log` |
| V-33b | **Passou.** `model: "haiku"` → `init.model` = `claude-haiku-5-5`. | `out/haiku.log` |
| V-33c | **Passou, com uma observação.** Sessão iniciada em `sonnet`/`high` e retomada com `resume` e a mesma escolha → `init.model` = `claude-sonnet-5-5`. Retomada **sem** `model` e `effort` → também `claude-sonnet-5-5`: o Claude Code **herda** o modelo gravado na conversa. A task_05 continua repassando `model` e `effort` no `resume` (é o que a REQ-101 pede, e o repasse não depende de um comportamento que o SDK não promete). | `out/resume.log` |
| V-33d | **Passou.** `opus`/`max` com o prompt curto → `result` com `subtype: "success"`, `is_error: false`, texto "OK". | `out/max.log` |
| V-33e | **Nenhuma combinação válida foi recusada.** Dois casos fora da 7.4 mostram as duas formas de falha, para a task_05 (B-39): ver abaixo. | `out/invalid.log` |

### Como o modelo efetivo aparece

| Pedido | `system/init` → `model` |
|---|---|
| `opus` | `claude-opus-5-5` |
| `sonnet` | `claude-sonnet-5-5` |
| `haiku` | `claude-haiku-5-5` |

O `usageModels` do `result` também lista `claude-haiku-5-5` em todas as chamadas, em qualquer modelo pedido: é o uso interno do Claude Code (títulos e tarefas leves), não o modelo da conversa.

### Forma das falhas (V-33e)

- **Modelo inexistente** (`model: "modelo-inexistente-v33"`): o `init` ecoa o nome pedido; chega uma mensagem do assistente com `error: "model_not_found"`; o `result` vem com `subtype: "success"` **e** `is_error: true`, com o texto "There's an issue with the selected model (modelo-inexistente-v33). It may not exist or you may not have access to it."; e a iteração do `query()` lança `Claude Code returned an error result: <o mesmo texto>`. Ou seja, a falha tem três sinais, e o `subtype: "success"` não serve para decidir. O runtime deve tratar `is_error: true`, o `error` do assistente ou a exceção como "Falhou ao abrir" (B-39) quando acontecer antes de a sessão começar.
- **Esforço fora do enum** (`effort: "turbo"`, forçado com cast): o SDK **não recusa**. A sessão abre normalmente em `claude-sonnet-5-5`, sem erro. Quem barra isso é o servidor (NFR-16, V-44a), porque o Claude Code não vai fazê-lo.

## Nomes para o catálogo (03.2)

Em `sessionAgentCatalog`, o agente `claude` usa os apelidos, e é o apelido que vai em `Options.model`:

| Modelo na tela | Valor gravado e passado ao SDK |
|---|---|
| Opus | `opus` |
| Sonnet | `sonnet` |
| Haiku | `haiku` |

| Esforço na tela | Valor gravado e passado ao SDK |
|---|---|
| Baixo | `low` |
| Médio | `medium` |
| Alto | `high` |
| Muito alto | `xhigh` |
| Máximo | `max` |

Combinações recusadas: nenhuma. O catálogo é o produto cartesiano dos três modelos pelos cinco esforços, e o padrão `opus`/`max` está nele.

## Ajuste da spec

Nenhum. A 7.4 e a P-14 conferem com o resultado: o SDK 0.3.330 aplica `model` e `effort` em `query()`, também no `resume`, e todas as combinações da 7.4 são aceitas. A única nuance, que o esforço não é observável nas mensagens, fica registrada aqui e entra na leitura do V-42 (smoke real).

## Smoke V-42

> **Estado:** pendente. Precisa de uma pessoa logada no Flow Dev com acesso pessoal ao repositório e ao quadro do GitHub, e do Claude Code real, o que esta sessão não tem (o GraphQL do GitHub recusa chamadas sem credencial, e a tela do trabalho só libera a operadora depois da verificação do GitHub). Faça uma vez, pela tela, e preencha a tabela.

Preparação: banco de desenvolvimento migrado até a `0050_session_plans` (`DATABASE_URL=… pnpm --dir packages/api db:migrate`), `pnpm dev` rodando (o serviço de sessões sobe junto), uma Issue com o planejamento aprovado (Tech Spec) e uma spec pequena capturada pela spec-writer, e o clone vinculado nas Configurações do projeto.

| Passo | Resultado esperado | Resultado visto |
|---|---|---|
| V-42a: aba "Tarefas" → "Gerar tarefas", com Claude Code · Opus · Máximo | a spec-to-tasks grava `_tasks.md` e os `task_NN.md`, e a aba lista as tarefas "Pendente" em até 5 s depois de o Claude terminar a vez | |
| V-42b: "Uma sessão por tarefa", Sessão 1 em Sonnet · Alto → "Salvar" → "Iniciar" na Sessão 1 | o agente marca as mini-tarefas e muda o `status` para `completed`; a 01 aparece "Concluída" e a Sessão 2 passa a "Pronta" | |
| Modelo efetivo | o log `[session] started` mostra `agent=claude model=sonnet effort=high` | |

Registre também: a data, a Issue usada, o que apareceu na tela e qualquer divergência da spec.
