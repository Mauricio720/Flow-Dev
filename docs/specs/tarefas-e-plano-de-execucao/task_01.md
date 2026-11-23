---
status: pending
title: Spike V-33 de modelo e esforço no SDK
type: test
complexity: high
---

# Task 01: Spike V-33 de modelo e esforço no SDK

## Visão geral
O plano e a divisão rodam o Claude com o modelo e o esforço escolhidos, passados como `Options.model` e `Options.effort` do `query()` do Agent SDK 0.3.330 (DEC-24). Este spike prova com o Claude real quais combinações são aceitas, se o modelo efetivo é o pedido e se o `resume` mantém a escolha. O resultado fixa a 7.4 usada pela task_03 (catálogo) e pela task_05 (runtime).

<critical>
- LEIA a spec (`docs/specs/tarefas-e-plano-de-execucao/spec.md`, §7.4, §11 P-14, §17 DEC-24, §23 V-33), o `docs/specs/sessao-no-flow-dev/v20-spike.md` (como o spike da Spec C chamou o SDK) e as regras do projeto (AGENTS.md/CLAUDE.md) antes de começar.
- FAÇA UMA MINI-TAREFA POR VEZ, na ordem. Só marque `[x]` depois de rodar o "Pronto quando" dela e ver passar.
- NÃO saia dos arquivos listados sem registrar o motivo no Registro de execução. Nada fora do escopo da spec. O spike não toca em `apps/` nem em `packages/`.
- TESTES JUNTO COM O CÓDIGO: cada mini-tarefa implementa os testes atribuídos a ela, seguindo a skill de testes do projeto (`software-testing`). Isso quer dizer: asserção sobre o efeito observável e específico, nada de `toBeTruthy` ou de só checar que não lança exceção; valor esperado tirado da spec, nunca recalculado a partir do código; dublês só em dependências lentas, variáveis ou externas; relógio e aleatoriedade controlados. Em bug, reproduza antes de corrigir.
- Ao começar, mude `status` para `in_progress` (aqui e em `_tasks.md`). Mude para `completed` só quando todas as mini-tarefas estiverem marcadas e os critérios de sucesso tiverem sido comprovados por comando. A revisão contra a spec acontece uma vez, depois de todas as tarefas: não a espere aqui, mas não marque nada que não tenha prova, porque ela vai conferir.
</critical>

## Requisitos
- P-14: o SDK 0.3.330, com o `claude` do PATH, aplica `model` e `effort` em `query()`, também no `resume`. Confirmar ou negar com evidência.
- 7.4 (Claude Code): modelos Opus, Sonnet e Haiku; esforços Baixo, Médio, Alto, Muito alto e Máximo (`low`, `medium`, `high`, `xhigh`, `max`, o `EffortLevel` do `sdk.d.ts`). Uma combinação recusada não é oferecida.
- §21 (risco): uma combinação pode ser recusada com erro ou ignorada sem erro. O spike registra qual dos dois acontece e como o modelo efetivo aparece no `init`.
- §24: V-33 registrado em `docs/specs/tarefas-e-plano-de-execucao/v33-spike.md`, com a 7.4 ajustada ao resultado.

## Interfaces
- **Consome:** `docs/specs/sessao-no-flow-dev/spike/` (padrão de `package.json` com o SDK fixado, `spikeRepo.ts`, `spikeLog.ts` e `lib.ts`); o `claude` do PATH; `Options.model` e `Options.effort` do `sdk.d.ts` (`packages/api/node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts`, linhas com `model?: string` e `effort?: EffortLevel`).
- **Produz:** `docs/specs/tarefas-e-plano-de-execucao/v33-spike.md` com:
  - a tabela modelo × esforço (aceito, recusado com a mensagem, ou ignorado);
  - o valor do campo de modelo na mensagem `system/init`, para cada modelo;
  - o comportamento do `resume` com e sem `model`/`effort`;
  - os nomes exatos que a 03.2 deve usar em `sessionAgentCatalog` (ex.: `opus` ou `claude-opus-…`).

## Mini-tarefas

- [ ] **01.1 — Roteiro do spike de modelo e esforço**
  - **Arquivos:** `docs/specs/tarefas-e-plano-de-execucao/spike/` (criar: `package.json` com `@anthropic-ai/claude-agent-sdk` 0.3.330 sem `^` e `tsx`, `tsconfig.json`, `modelEffort.ts`, `spikeRepo.ts` e `spikeLog.ts` copiados do spike da Spec C e reduzidos ao necessário); a saída vai para `spike/out/` (no `.gitignore` local do spike)
  - **Testes:** nenhum automatizado; o roteiro é a ferramenta do V-33
  - **Pronto quando:** `pnpm --dir docs/specs/tarefas-e-plano-de-execucao/spike install` e `pnpm --dir docs/specs/tarefas-e-plano-de-execucao/spike exec tsx modelEffort.ts --dry-run` listam as 15 combinações (3 modelos × 5 esforços) que vão rodar, sem chamar o Claude
  - **Nota:** use um repositório git temporário fora da pasta de rascunho do Claude Code (o `TMPDIR` longo quebra o `tsx`; ver a memória da Spec C). Prompt curto e barato por combinação ("Responda só OK."), `maxTurns: 1`, `permissionMode: "default"`.
- [ ] **01.2 — Rodar a matriz, o resume e Opus · Máximo; registrar e ajustar a spec**
  - **Arquivos:** `docs/specs/tarefas-e-plano-de-execucao/spike/modelEffort.ts` (subcomandos `matrix`, `resume` e `max`), `docs/specs/tarefas-e-plano-de-execucao/v33-spike.md` (criar), `docs/specs/tarefas-e-plano-de-execucao/spec.md` (ajustar a 7.4 e a P-14 só se o resultado divergir, com uma linha no Histórico)
  - **Testes:** V-33a, V-33b, V-33c, V-33d, V-33e
  - **Pronto quando:** `pnpm --dir docs/specs/tarefas-e-plano-de-execucao/spike exec tsx modelEffort.ts matrix`, `… resume` e `… max` rodaram contra o Claude real, a saída está em `spike/out/*.log`, e o `v33-spike.md` tem a tabela das 15 combinações, o resultado do `resume` e os nomes para o catálogo

## Detalhes de implementação
- Para cada combinação, chame `query({ prompt, options: { model, effort, pathToClaudeCodeExecutable, cwd, settingSources: ["user","project","local"], maxTurns: 1 } })` e registre: a mensagem `system/init` (campo de modelo), o `result` (sucesso ou `is_error` e o texto) e qualquer exceção.
- "Ignorado sem erro" é quando o `init` mostra um modelo diferente do pedido, ou quando o esforço não aparece em nenhum lugar observável. Registre o que dá para observar e o que não dá; não afirme o que não foi visto.
- `resume`: inicie com `sonnet`/`high`, guarde o `session_id`, retome com `resume` e o mesmo `model`/`effort`, e veja o modelo no `init` da retomada. Repita a retomada sem `model` para saber se o SDK herda a escolha (isso decide se a task_05 precisa repassar sempre).
- Gasto: são cerca de 20 chamadas curtas na assinatura do usuário. Se o limite de uso acabar no meio, registre até onde foi e pare.

### Arquivos relevantes
- `docs/specs/sessao-no-flow-dev/spike/spikeSession.ts`, `spikeRepo.ts`, `spikeLog.ts`: como o spike anterior chamou o SDK e montou o repositório.
- `docs/specs/sessao-no-flow-dev/v20-spike.md`: formato de registro a espelhar.
- `packages/api/src/infra/terminal/agentSdkQueryOptions.ts`: opções que o produto já passa (a task_05 acrescenta `model` e `effort`).

### Arquivos afetados
- Os listados nas mini-tarefas.

### Decisões relacionadas
- DEC-24 (spec §17): escolha gravada na sessão, passada como `Options.model` e `Options.effort`, e reaplicada no `resume`.

## Premissas
- O usuário está logado no Claude Code desta máquina, com uma assinatura que inclui Opus.

## Testes atribuídos
- [ ] V-33a: cada modelo (`opus`, `sonnet`, `haiku`) × cada esforço (`low`, `medium`, `high`, `xhigh`, `max`) com um prompt curto → cada uma das 15 combinações registrada como aceita, recusada (com a mensagem) ou ignorada · Claude real, repositório temporário
- [ ] V-33b: sessão iniciada com `model: "haiku"` → a mensagem `system/init` mostra o modelo Haiku (o valor exato fica registrado) · Claude real
- [ ] V-33c: sessão com `sonnet`/`high` retomada com `resume` e a mesma escolha → o `init` da retomada mostra Sonnet; retomada sem `model` → o modelo observado fica registrado (herda ou volta ao padrão) · Claude real
- [ ] V-33d: Opus com `effort: "max"` e um prompt curto → responde com `result` sem erro · Claude real
- [ ] V-33e: uma combinação recusada, se houver → a forma da falha registrada (exceção no `query()`, `result` com `is_error`, ou mensagem do assistente com `error`), para a task_05 tratá-la como "Falhou ao abrir" (B-39); sem nenhuma recusa, o registro diz isso · Claude real

## Critérios de sucesso
- Todas as mini-tarefas marcadas, cada uma com o "Pronto quando" executado.
- `v33-spike.md` com as 15 combinações, o `resume`, Opus · Máximo e os nomes para o catálogo.
- A 7.4 e a P-14 da spec conferem com o `v33-spike.md` (ajustadas, com linha no Histórico, se divergirem).
- Nada alterado em `apps/` nem em `packages/`.

## Registro de execução
<!-- Uma entrada por mini-tarefa: data, o que foi feito, comandos e resultado, desvios. -->
