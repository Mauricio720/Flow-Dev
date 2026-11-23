---
status: completed
title: Spike V-20 do Agent SDK
type: test
complexity: high
---

# Task 01: Spike V-20 do Agent SDK

## Visão geral
A spec supõe que o Claude Agent SDK para TypeScript, apontado para o `claude` do PATH, faça tudo o que a sessão precisa: usar o login local, carregar o plugin `flow-dev`, entregar perguntas e aprovações ao `canUseTool`, gravar "Permitir sempre", retomar e interromper. Este spike prova cada ponto com o Claude real, antes de qualquer código do produto, e registra as opções exatas do `query()` que as tarefas 04 e 05 vão usar.

<critical>
- LEIA a spec (`docs/specs/sessao-no-flow-dev/spec.md`, em especial §11, §15, §17 e §21) e as regras do projeto (AGENTS.md/CLAUDE.md) antes de começar.
- FAÇA UMA MINI-TAREFA POR VEZ, na ordem. Só marque `[x]` depois de rodar o "Pronto quando" dela e ver passar.
- NÃO saia dos arquivos listados sem registrar o motivo no Registro de execução. Nada fora do escopo da spec.
- TESTES JUNTO COM O CÓDIGO: cada mini-tarefa implementa os testes atribuídos a ela, seguindo a skill de testes do projeto (`software-testing`). Isso quer dizer: asserção sobre o efeito observável e específico, nada de `toBeTruthy` ou de só checar que não lança exceção; valor esperado tirado da spec, nunca recalculado a partir do código; dublês só em dependências lentas, variáveis ou externas; relógio e aleatoriedade controlados. Em bug, reproduza antes de corrigir.
- Ao começar, mude `status` para `in_progress` (aqui e em `_tasks.md`). Mude para `completed` só quando todas as mini-tarefas estiverem marcadas e os critérios de sucesso tiverem sido comprovados por comando. A revisão contra a spec acontece uma vez, depois de todas as tarefas: não a espere aqui, mas não marque nada que não tenha prova, porque ela vai conferir.
</critical>

## Requisitos
- P-09: o SDK, com `pathToClaudeCodeExecutable` apontando para o `claude` do PATH (2.1.330), usa o login da pessoa sem chave de API.
- P-10: o `canUseTool` recebe as perguntas também em `bypassPermissions`; as aprovações vêm com sugestões; `updatedPermissions` com destino `localSettings` grava `.claude/settings.local.json` no clone.
- P-11: `resume` com o id da sessão do Claude funciona depois de o processo morrer.
- DEC-18: os callbacks de hook do SDK entregam o mesmo payload dos hooks HTTP da Spec B.
- DEC-19 e DEC-20: a versão mínima do Claude Code e o mapeamento dos modos ficam decididos por evidência.
- B-25: o que acontece com `/exit` e outros comandos interativos numa mensagem.

## Interfaces
- **Consome:** a pasta de plugin que a Spec A monta (`<sessão>/contexto/`, com `.claude-plugin/plugin.json` e `skills/`), produzida por `packages/api/src/infra/terminal/fileSessionContextBuilder.ts`; as fixtures dos hooks em `packages/api/test/terminal-hook-payloads.ts` e `docs/specs/acompanhamento-e-artefatos/v15-spike.md`.
- **Produz:** `docs/specs/sessao-no-flow-dev/v20-spike.md`, com a versão do SDK fixada, as opções exatas do `query()` (`pathToClaudeCodeExecutable`, `plugins`, `settingSources`, `permissionMode`, `toolConfig.askUserQuestion.previewFormat`, `resume`), o formato real de `suggestions` e de `updatedPermissions`, os payloads dos hooks e a decisão do plano A ou B da DEC-20.

## Mini-tarefas

- [x] **01.1 — Login, plugin, skill e perguntas**
  - **Arquivos:** `docs/specs/sessao-no-flow-dev/spike/` (criar: `package.json` com o SDK fixado, `spike-session.ts`, um repositório git temporário criado pelo script em `$TMPDIR`); nada em `apps/` nem em `packages/`
  - **Testes:** V-20a, V-20b, V-20c, V-20d, V-20k
  - **Pronto quando:** `pnpm --dir docs/specs/sessao-no-flow-dev/spike exec tsx spike-session.ts basics` roda contra o Claude real, e a saída (salva em `spike/out/basics.log`) mostra cada caso com o resultado observado
- [x] **01.2 — Permissões, retomada, interrupção, hooks, espera e `/exit`**
  - **Arquivos:** `docs/specs/sessao-no-flow-dev/spike/spike-session.ts` (alterar, com os subcomandos `permissions`, `resume`, `interrupt`, `hooks`, `wait`, `exit`)
  - **Testes:** V-20e, V-20f, V-20g, V-20h, V-20i, V-20j
  - **Pronto quando:** cada subcomando roda contra o Claude real, e a saída fica em `spike/out/<subcomando>.log`; o arquivo `.claude/settings.local.json` do repositório temporário existe depois de `permissions`
- [x] **01.3 — Registrar o resultado e ajustar a spec**
  - **Arquivos:** `docs/specs/sessao-no-flow-dev/v20-spike.md` (criar), `docs/specs/sessao-no-flow-dev/spec.md` (§11, §15, DEC-20, §21 e Histórico, só se o resultado mudar algo)
  - **Testes:** nenhum novo; consolida V-20a–k
  - **Pronto quando:** `v20-spike.md` tem uma linha por caso V-20a–k (passou, falhou ou mudou, com a evidência do log) e a seção "Opções do `query()`"; se algum caso falhou, a spec registra o plano B no Histórico com data
  - **Nota:** se o V-20c falhar, o plano B da DEC-20 vale: "Tudo liberado" vira `permissionMode: "default"` com um `canUseTool` que libera tudo menos `AskUserQuestion`.

## Detalhes de implementação
- O spike não entra no produto. Mantenha o `package.json` próprio dentro de `spike/` para não mexer nas dependências do monorepo, e adicione `spike/node_modules` e `spike/out` ao `.gitignore` da pasta.
- Monte a pasta de plugin chamando o `FileSessionContextBuilder` existente, ou copie à mão as quatro skills de `.claude/skills/` para `contexto/skills/` com o `plugin.json` como a Spec A faz.
- Para o `kill -9` do V-20f, pegue o pid do processo `claude` filho (com `ps`, pelo `cwd` do repositório temporário), não o do script.
- Compare os payloads do V-20h campo a campo com `packages/api/test/terminal-hook-payloads.ts`: `hook_event_name`, `session_id`, `prompt`, `tool_name`, `tool_input.file_path`, `tool_input.command`, `tool_input.skill`, `message`, `reason`.

### Arquivos relevantes
- `packages/api/src/infra/agents/claudeArguments.ts`: como os agentes locais já usam a assinatura (`claude -p`).
- `packages/api/src/infra/terminal/fileSessionContextBuilder.ts` e `flowDevSkillsDir.ts`: montam o plugin da sessão.
- `docs/specs/execucao-no-terminal/v00-spike.md` e `docs/specs/acompanhamento-e-artefatos/v15-spike.md`: formato dos spikes anteriores.

### Arquivos afetados
- `docs/specs/sessao-no-flow-dev/spike/` e `v20-spike.md`: novos.

### Decisões relacionadas
- DEC-15, DEC-18, DEC-19, DEC-20 (spec §17): este spike confirma ou derruba cada uma.

## Premissas
Nenhuma além das P-09 a P-11, que esta tarefa testa.

## Testes atribuídos
- [x] V-20a: `query()` com `pathToClaudeCodeExecutable` igual ao `claude` do PATH, sem `ANTHROPIC_API_KEY` no ambiente → a sessão responde, usando a assinatura · Claude real
- [x] V-20b: plugin `contexto/` passado ao `query()` e prompt começando por `/flow-dev:direct-executor` → a ferramenta Skill é acionada com `direct-executor` · Claude real
- [x] V-20c: `permissionMode: "bypassPermissions"` e um prompt que pede ao Claude para perguntar com opções → `canUseTool` recebe `AskUserQuestion`, e a resposta devolvida em `updatedInput.answers` aparece no texto seguinte do Claude · Claude real
- [x] V-20d: `toolConfig.askUserQuestion.previewFormat: "markdown"` → as opções chegam com `preview` quando o Claude manda prévia · Claude real
- [x] V-20e: `permissionMode: "acceptEdits"`, o Claude pede `pnpm --version` → `canUseTool` recebe Bash com `suggestions` não vazias; devolver `updatedPermissions` da sugestão com destino `localSettings` cria `.claude/settings.local.json` no repositório temporário, e uma segunda sessão roda o mesmo comando sem chamar `canUseTool` · Claude real
- [x] V-20f: sessão no meio de `sleep 60`, `kill -9` no `claude` filho, depois `query({ resume: <id> })` com "o que eu te pedi antes?" → a resposta cita a conversa anterior · Claude real
- [x] V-20g: `interrupt()` durante `sleep 30` → o fluxo termina a vez em até 5 s, e a sessão aceita a próxima mensagem · Claude real
- [x] V-20h: callbacks de `SessionStart`, `UserPromptSubmit`, `PostToolUse`, `Stop`, `Notification` e `SessionEnd` → os campos lidos pelo `HookEventSummarizer` têm os mesmos nomes e tipos das fixtures da Spec B (`terminal-hook-payloads.ts`) · Claude real
- [x] V-20i: `canUseTool` que só resolve depois de 30 min → o Claude continua esperando, sem erro de prazo, e segue quando a promessa resolve · Claude real
- [x] V-20j: mensagem `/exit` → registrar a resposta do Claude Code (texto ou fim do fluxo) para a B-25 · Claude real
- [x] V-20k: `settingSources` com usuário, projeto e local → um CLAUDE.md pessoal com uma instrução marcadora ("responda começando com PONTEIRO") é seguido · Claude real

## Critérios de sucesso
- Todas as mini-tarefas marcadas, cada uma com o "Pronto quando" executado.
- `v20-spike.md` com evidência para V-20a–k e as opções do `query()` prontas para a 04.2.
- A spec reflete o plano escolhido para a DEC-20.

## Registro de execução
<!-- Uma entrada por mini-tarefa: data, o que foi feito, comandos e resultado, desvios. -->

### 2026-11-23 — 01.1 Login, plugin, skill e perguntas
- `spike/` criado com `package.json` próprio (`@anthropic-ai/claude-agent-sdk` 0.3.330, fixado), `lib.ts`, `basics.ts` e `spike-session.ts`, mais `.gitignore` (`node_modules`, `out`). O ambiente passado ao Claude é o `terminalEnvironment` do produto.
- `pnpm --dir docs/specs/sessao-no-flow-dev/spike exec tsx spike-session.ts basics`: V-20a, V-20b, V-20c, V-20d e V-20k passam; saída em `spike/out/basics.log`.
- Ajustes no caminho: o V-20k só ficou determinístico com `tools: []` (senão o Claude abria o `CLAUDE.md` com a ferramenta Read) e com o repositório de teste em `/tmp` (dentro da pasta de rascunho do Claude Code o `CLAUDE.md` não carrega). Detalhes em `v20-spike.md`.

### 2026-11-23 — 01.2 Permissões, retomada, interrupção, hooks, espera e `/exit`
- Subcomandos `permissions`, `resume`, `interrupt`, `hooks`, `wait`, `exit` (mais um `multi`, extra, para a resposta de múltipla escolha) rodaram contra o Claude real; logs em `spike/out/<subcomando>.log`. Depois de `permissions`, o `.claude/settings.local.json` do repositório temporário existe e traz `Bash(pnpm --version)` (está no log).
- V-20e, V-20f, V-20g, V-20i, V-20j passam. O V-20i esperou os 1.800 s inteiros.
- V-20h **mudou**: só `UserPromptSubmit`, `PostToolUse` e `Stop` chegam ao callback; `SessionStart`, `SessionEnd` e `Notification` não chegam. Os campos dos três que chegam batem com as fixtures da Spec B.
- Nos V-20f e V-20g o comando longo é um `node -e "setTimeout(...)"`: o Bash do Claude Code manda `sleep` longo para segundo plano, e o caso deixava de testar o que a spec quer.

### 2026-11-23 — 01.3 Registrar o resultado e ajustar a spec
- `v20-spike.md` criado, com uma linha por caso V-20a–k, as opções do `query()` para a 04.2, os formatos reais e as decisões. Spec ajustada: §11 (P-09 a P-11 confirmadas), §15 (opções do `query()`), DEC-18 (o runtime sintetiza `SessionStart` e `SessionEnd`; `Notification` sai), DEC-20 (plano A) e Histórico.
- O plano B da DEC-20 não foi preciso; o V-20c passou.

### 2026-11-23 — Fechamento da tarefa
- Nada em `apps/` nem em `packages/` foi tocado por esta tarefa; só `docs/specs/sessao-no-flow-dev/spike/`, `v20-spike.md` e a spec.

### 2026-11-23 — Correção da review-001 (I-5)
- `spike/lib.ts` (195 linhas) e `spike/lifecycle.ts` (106) foram divididos (`paths.ts`, `spikeLog.ts`, `spikeRepo.ts`, `spikeInput.ts`, `spikeSession.ts`, `lifecycleHelpers.ts`); `lib.ts` só reexporta. Nenhum arquivo do spike passa de 100 linhas. `tsc --noEmit` do spike limpo e o caso `interrupt` rodou de novo contra o Claude real (V-20g passou).
