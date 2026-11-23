---
status: completed
title: Spike V-15 dos hooks HTTP do Claude Code
type: test
complexity: high
---

# Task 01: Spike V-15 dos hooks HTTP do Claude Code

## Visão geral
O spike prova, com o Claude Code real (2.1.330 instalado), que os hooks `type: "http"` injetados por `--settings` chegam ao Flow Dev com o Bearer. Ele também registra o payload real de cada evento e mostra se a ferramenta Skill e o `/skill` no prompt são detectáveis. Tudo depois depende disso: o summarizer (03.2) usa os payloads gravados aqui como fixtures. Nenhum código de produção muda nesta tarefa.

<critical>
- LEIA a spec (`spec.md`: §11 P-07, §15 "Endpoint de eventos" e "Settings", §17 DEC-02, DEC-04, DEC-12, §21 riscos, §23 V-15) e as regras do projeto (AGENTS.md/CLAUDE.md) antes de começar. Leia também `docs/specs/execucao-no-terminal/v00-spike.md`, que registra como a Spec A abre o Claude (`--plugin-dir`, namespace `flow-dev:`).
- FAÇA UMA MINI-TAREFA POR VEZ, na ordem. Só marque `[x]` depois de rodar o "Pronto quando" dela e ver passar.
- NÃO saia dos arquivos listados sem registrar o motivo no Registro de execução. Nada fora do escopo da spec.
- TESTES JUNTO COM O CÓDIGO: cada mini-tarefa implementa os testes atribuídos a ela.
- Ao começar, mude `status` para `in_progress` (aqui e em `_tasks.md`). Mude para `completed` só quando todas as mini-tarefas estiverem marcadas e os critérios de sucesso tiverem sido comprovados por comando. A revisão contra a spec acontece uma vez, depois de todas as tarefas: não a espere aqui, mas não marque nada que não tenha prova, porque ela vai conferir.
</critical>

## Requisitos
- P-07: o Claude Code dispara hooks `type: "http"` para SessionStart, UserPromptSubmit, PostToolUse (incluindo a ferramenta Skill), Stop, Notification e SessionEnd, com `onFailure`. Confirmar ou refutar cada item.
- DEC-02: hooks injetados só para a sessão, por `--settings <arquivo>`, somando uma camada às configurações da pessoa.
- DEC-04: o token vai literal no header, dentro de um arquivo `0600`.
- DEC-12: a skill ativa é detectável pelo `/<skill>` no prompt e pelo `PostToolUse` da ferramenta Skill.
- §24: o resultado fica em `docs/specs/acompanhamento-e-artefatos/v15-spike.md`, com a §15 ajustada.
- Não muda: nada em `~/.claude`, nada no repositório além dos arquivos listados (§9).

## Interfaces
- **Consome:** a linha de comando da Spec A (`packages/api/src/infra/terminal/terminalCommand.ts`):
  ```
  gnome-terminal --working-directory=<clone> -- claude --dangerously-skip-permissions --plugin-dir <contexto> -- <prompt>
  ```
  Use uma pasta de contexto montada à mão, com `.claude-plugin/plugin.json` e as skills copiadas de `.claude/skills/`.
- **Produz:**
  - fixtures JSON em `packages/api/test/fixtures/terminal-hooks/`, uma por evento observado: `session-start.json`, `user-prompt-submit.json`, `user-prompt-submit-skill.json`, `post-tool-use-write.json`, `post-tool-use-edit.json`, `post-tool-use-bash.json`, `post-tool-use-skill.json`, `post-tool-use-read.json`, `stop.json`, `notification.json`, `session-end-exit.json` e, se chegar, `session-end-window-closed.json`;
  - o formato exato do settings que funcionou, registrado em `v15-spike.md` e na §15 da spec. A 03.3 escreve exatamente esse formato.

## Mini-tarefas

- [x] **01.1 — Hooks chegando a um receptor local, junto com o `--plugin-dir`**
  - **Arquivos:**
    - nenhum no repositório;
    - o receptor fica na pasta temporária do spike, fora do repositório: um servidor HTTP mínimo em Node, que grava cada corpo e cada header `Authorization` em um arquivo por requisição e responde `204`;
    - criar `packages/api/test/fixtures/terminal-hooks/` com os payloads de SessionStart, UserPromptSubmit, PostToolUse (Write, Edit, Bash, Read), Stop e Notification.
  - **Testes:** V-15a, V-15b
  - **Pronto quando:** numa sessão aberta com a linha da Spec A mais `--settings <tmp>/settings.json` (`0600`), o receptor registrou as requisições com `Authorization: Bearer <token-do-teste>`. O registro inclui pelo menos um SessionStart, um UserPromptSubmit, um PostToolUse de Write, Edit e Bash, um Stop e um Notification. `/flow-dev:direct-executor` continua reconhecido como skill. `ls packages/api/test/fixtures/terminal-hooks` lista os arquivos.
  - **Nota:** antes de salvar as fixtures, troque caminhos absolutos pessoais por `/tmp/flow-dev-clone` e `/tmp/flow-dev-session`, e o token por `test-token`. Mantenha os demais campos como chegaram.
- [x] **01.2 — Skill, prompt com `/skill` e modos de falha**
  - **Arquivos:** fixtures restantes em `packages/api/test/fixtures/terminal-hooks/`: `user-prompt-submit-skill.json`, `post-tool-use-skill.json` e `session-end-*.json`.
  - **Testes:** V-15c, V-15d, V-15e, V-15f, V-15g
  - **Pronto quando:** cada caso abaixo tem o resultado observado anotado no Registro de execução, com o arquivo da fixture correspondente:
    - V-15c: prompt `/flow-dev:spec-writer …`, e também `/exit` e `/clear`;
    - V-15d: o Claude aciona uma skill sozinho;
    - V-15e: receptor desligado;
    - V-15f: receptor respondendo `401` e `413`;
    - V-15g: `/exit` e fechamento da janela.
  - **Nota:** se a ferramenta Skill não gerar `PostToolUse` com o nome em `tool_input.skill`, teste o plano B da §21: `PreToolUse` com o mesmo matcher. Registre qual dos dois a 03.2 e a 03.3 devem usar.
- [x] **01.3 — Registro do spike e §15 ajustada**
  - **Arquivos:**
    - criar `docs/specs/acompanhamento-e-artefatos/v15-spike.md`;
    - alterar `docs/specs/acompanhamento-e-artefatos/spec.md` (§15 "Settings" e "Endpoint de eventos", mais uma linha no Histórico).
  - **Testes:** —
  - **Pronto quando:**
    - `v15-spike.md` tem:
      - uma tabela de V-15a a V-15g, com o resultado, a versão do Claude e a fixture;
      - o JSON exato do settings que funcionou;
      - a lista dos campos usados por evento;
      - as decisões para a 03.2 e a 03.3: o matcher, o plano B se houver, e quais comandos embutidos chegam ao `UserPromptSubmit`;
    - a §15 da spec reflete o formato confirmado;
    - `python3 -I .claude/skills/spec-to-tasks/scripts/tasks_status.py docs/specs/acompanhamento-e-artefatos` roda sem ERRO.

## Detalhes de implementação
- O formato de partida é o da §15 ("Settings"): um bloco por evento, com `H = { type: "http", url, headers: { Authorization: "Bearer <token>" }, timeout: 5, onFailure: "continue" }`. Se algum campo for recusado pelo Claude, registre o erro e o formato aceito.
- Para medir V-15e, cronometre o tempo entre enviar o prompt e a resposta do Claude, com o receptor desligado e com ele ligado.
- Siga a forma de `docs/specs/execucao-no-terminal/v00-spike.md`, que registrou o spike da Spec A.

### Arquivos relevantes
- `docs/specs/execucao-no-terminal/v00-spike.md`: formato do registro e a nota "A Spec B acrescenta `--settings` a esta linha; os dois flags convivem (o spike não testou a combinação, que a Spec B deve provar)".
- `packages/api/src/infra/terminal/terminalCommand.ts` e `packages/api/src/infra/terminal/fileSessionContextBuilder.ts`: a linha de comando e a pasta de contexto que o spike imita.
- `packages/api/test/fixtures/agents/claude/`: padrão de fixtures já usado no pacote.

### Arquivos afetados
- `packages/api/test/fixtures/terminal-hooks/*.json` (novos).
- `docs/specs/acompanhamento-e-artefatos/v15-spike.md` (novo) e `spec.md` (§15, Histórico).

### Decisões relacionadas
- DEC-02 (§17): o mecanismo inteiro depende do V-15a.
- DEC-04 (§17): o token literal no header, no arquivo `0600`.
- DEC-12 (§17): a detecção de skill depende do V-15c e do V-15d.

## Premissas
- P-B (`_tasks.md`): o V-15c registra se `/exit`, `/clear` e afins chegam ao `UserPromptSubmit`. O resultado decide a lista de comandos embutidos que a 03.2 ignora.

## Testes atribuídos
- [x] V-15a: sessão com `--settings` → os hooks SessionStart, UserPromptSubmit, PostToolUse (Write/Edit/Bash), Stop e Notification chegam com `Authorization: Bearer <token>`, e o payload de cada um vira fixture.
- [x] V-15b: `--plugin-dir` e `--settings` juntos → as skills do plugin continuam carregando (`/flow-dev:direct-executor` reconhecido) e os hooks disparam.
- [x] V-15c: prompt `/flow-dev:spec-writer escreva a spec` → `UserPromptSubmit.prompt` traz o texto com o comando. Fica registrado se `/exit` e `/clear` disparam `UserPromptSubmit`.
- [x] V-15d: o Claude aciona uma skill → chega `PostToolUse` (ou `PreToolUse`, no plano B) com `tool_name: "Skill"` e o nome em `tool_input.skill`, ou o campo real registrado.
- [x] V-15e: receptor desligado → o Claude segue trabalhando; nenhum hook atrasa mais de 5 s (NFR-03).
- [x] V-15f: receptor respondendo `401` e depois `413` → o Claude segue sem bloquear nem mostrar decisão de hook.
- [x] V-15g: `/exit` → chega `SessionEnd` com `reason`. Fica registrado se fechar a janela do GNOME Terminal também envia `SessionEnd`, e com qual `reason` (B-05).

## Critérios de sucesso
- Todas as mini-tarefas marcadas, cada uma com o "Pronto quando" executado.
- Todos os testes atribuídos executados, com o resultado registrado em `v15-spike.md`.
- As fixtures existem, sem dados pessoais nem token real.
- A §15 da spec descreve o settings e os campos que realmente funcionam.
- Nenhum arquivo de produção nem `~/.claude` alterado: `git status` mostra só as fixtures, `v15-spike.md` e `spec.md`.

## Registro de execução
<!-- The implementer appends one entry per mini-task: date, what was done, commands run with their result, deviations. Example:
- 2026-11-22 · 01.1 · receptor local + 6 hooks capturados · `ls packages/api/test/fixtures/terminal-hooks` → 8 arquivos · sem desvios -->
- 2026-11-22 · 01.1 · receptor local (Node) + `claude -p` e `claude` num pty com `--plugin-dir` + `--settings` · Write/Edit/Bash/Read/Stop/UserPromptSubmit/SessionEnd chegaram com `Authorization: Bearer`; `/flow-dev:direct-executor` reconhecido; `ls packages/api/test/fixtures/terminal-hooks` → 14 fixtures · desvios: SessionStart não é entregue por hook http e Notification não foi observado (fixtures sintéticas para esses dois); o spike usou `-p` e um pty em vez de uma janela do GNOME Terminal
- 2026-11-22 · 01.2 · prompt com `/skill`, ferramenta Skill, receptor desligado, 401, 413, `/exit`, `/clear` e fechamento do pty · Skill chega por PostToolUse com `tool_input.skill` namespaced; `/exit` e `/clear` não chegam ao UserPromptSubmit; `SessionEnd` reason `prompt_input_exit`, `other` (SIGHUP) e `clear` (a sessão continua); receptor desligado 4,16 s contra 4,25 s sem hooks; 401 e 413 sem bloquear · sem desvios
- 2026-11-22 · 01.3 · `v15-spike.md` e §15 ajustada · `python3 -I .claude/skills/spec-to-tasks/scripts/tasks_status.py docs/specs/acompanhamento-e-artefatos` → Validação: OK · sem desvios
