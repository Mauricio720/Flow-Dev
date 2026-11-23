# V-15 — Spike: hooks HTTP do Claude Code

> **Data:** 2026-11-22 · **Versão:** Claude Code 2.1.330 · **Spec:** [spec.md](spec.md)

Os hooks foram injetados com `--settings <arquivo 0600>` junto com `--plugin-dir`, na mesma linha da Spec A. O receptor foi um servidor Node local que gravava cada corpo e cada header `Authorization`. Dois modos foram usados:

- **`claude -p`** (sem terminal), para os casos de payload e de falha;
- **`claude` interativo dentro de um pty**, com o primeiro prompt como argumento, para `SessionStart`, `/exit`, `/clear` e o fechamento da janela (o pty fechado envia `SIGHUP`, como o GNOME Terminal ao fechar a janela).

Notification não foi observado (ver V-15a). Nada em `~/.claude` nem no repositório foi alterado além das fixtures e deste registro.

## Resultados

| ID | Resultado | Evidência |
|---|---|---|
| V-15a | **Passou, com duas diferenças da spec.** UserPromptSubmit, PostToolUse (Write, Edit, Bash, Read), Stop e SessionEnd chegam com `Authorization: Bearer <token>` e `content-type: application/json`. **SessionStart nunca chegou**, em `-p` nem no modo interativo: o hook `http` não é entregue nesse evento. **Notification não foi observado**: com `--dangerously-skip-permissions` não há pedido de permissão, e 75 s parado no prompt não gerou aviso. | `user-prompt-submit.json`, `post-tool-use-write.json`, `post-tool-use-edit.json`, `post-tool-use-bash.json`, `post-tool-use-read.json`, `stop.json`. `session-start.json` e `notification.json` são **sintéticos**, montados com os campos documentados, só para o summarizer. |
| V-15b | **Passou.** Com `--plugin-dir` e `--settings` juntos, os hooks disparam e `/flow-dev:direct-executor` foi reconhecido ("Skill carregada: flow-dev:direct-executor"). | Execução `k` do spike. |
| V-15c | **Passou.** `/flow-dev:spike-skill` chega inteiro em `UserPromptSubmit.prompt`. `/exit` e `/clear` **não disparam** `UserPromptSubmit`. | `user-prompt-submit-skill.json`. |
| V-15d | **Passou.** A ferramenta Skill gera `PreToolUse` e `PostToolUse` com `tool_name: "Skill"` e `tool_input.skill: "flow-dev:spike-skill"`, com o namespace do plugin. Um comando `/skill` digitado **não** gera evento de ferramenta, só o prompt. | `post-tool-use-skill.json`, `pre-tool-use-skill.json`. |
| V-15e | **Passou.** Com o receptor desligado (`ECONNREFUSED`) o Claude respondeu normalmente em 4,16 s, contra 4,25 s sem hooks. O erro aparece só como uma linha de aviso. | Cronometragem do spike. |
| V-15f | **Passou.** Com `401` e depois `413`, o Claude seguiu sem bloquear nem mostrar decisão; só uma linha "hook failed: HTTP 401/413". | Execuções `f401` e `f413` do spike. |
| V-15g | **Passou, com uma surpresa.** `/exit` envia `SessionEnd` com `reason: "prompt_input_exit"`. Fechar a janela (`SIGHUP`) envia `SessionEnd` com `reason: "other"`. **`/clear` envia `SessionEnd` com `reason: "clear"` e a sessão continua**, com os mesmos hooks. | `session-end-exit.json`, `session-end-window-closed.json`, `session-end-clear.json`. |

## Formato do settings que funcionou

O formato da §15 original foi aceito sem mudança. `SessionStart` pode ficar no arquivo: o Claude o aceita, só não o entrega.

```json
{ "hooks": {
  "SessionStart":     [{ "hooks": [H] }],
  "UserPromptSubmit": [{ "hooks": [H] }],
  "PostToolUse":      [{ "matcher": "Write|Edit|MultiEdit|NotebookEdit|Bash|Skill", "hooks": [H] }],
  "Stop":             [{ "hooks": [H] }],
  "Notification":     [{ "hooks": [H] }],
  "SessionEnd":       [{ "hooks": [H] }] } }
H = { "type": "http", "url": "<BETTER_AUTH_URL>/api/terminal-sessions/events",
      "headers": { "Authorization": "Bearer <token>" }, "timeout": 5, "onFailure": "continue" }
```

## Campos usados por evento

| Evento | Campos lidos |
|---|---|
| Todos | `hook_event_name`, `session_id` |
| SessionStart (se vier) | `source` |
| UserPromptSubmit | `prompt` |
| PostToolUse | `tool_name`, `tool_input.file_path`, `tool_input.command`, `tool_input.skill`. `tool_response` traz o conteúdo do arquivo e a saída do comando e **nunca é lido**. |
| Stop | nenhum além dos comuns (`last_assistant_message` existe e **nunca é lido**) |
| Notification | `message` |
| SessionEnd | `reason` |

## Decisões para a task_03

1. **Matcher e plano B:** o `PostToolUse` com `Write|Edit|MultiEdit|NotebookEdit|Bash|Skill` basta. O plano B (`PreToolUse`) não é preciso.
2. **Nome da skill:** `tool_input.skill` e o `/comando` do prompt podem vir com o namespace (`flow-dev:spec-writer`). A skill é gravada sem o prefixo (P-A).
3. **Comandos embutidos (P-B):** `/exit` e `/clear` não chegam ao `UserPromptSubmit`, então não viram evento. Por segurança o summarizer ignora como skill: `exit`, `clear`, `compact`, `help`, `resume`, `model`, `config`, `status`, `quit`.
4. **`started` sem SessionStart:** como o `SessionStart` não chega, o `started` é gravado pelo Flow Dev no primeiro evento de uma sessão que ainda não tem `started_at`, com `source: "startup"`. Se um dia o `SessionStart` chegar, ele ocupa esse lugar e nada duplica.
5. **`SessionEnd` com `reason: "clear"`:** a sessão do terminal continua. Não vira evento `ended`, não encerra a sessão e não apaga o `settings.json`; só dispara a captura de artefatos (`session_end`). Qualquer outro `reason` encerra.
6. **Fixtures sintéticas:** `session-start.json` e `notification.json`. As demais vêm de payloads reais, com caminhos trocados por `/tmp/flow-dev-clone` e `/tmp/flow-dev-session`.

## Smoke V-19

**V-19c, executado em 2026-11-22 com o Claude Code 2.1.330 real e a spec-writer real**, sobre o código real do servidor (route handler, controller de eventos, captura e Postgres de teste). O hook `http` do Claude fez POST num servidor HTTP local que entrega a requisição ao `POST` de `apps/web/src/app/api/terminal-sessions/events/route.ts`, com o `after()` executado depois da resposta. A abertura veio do controller real (token, `privado/settings.json` e a linha de comando da Spec A), e o Claude rodou com os mesmos flags (`--dangerously-skip-permissions --plugin-dir … --settings …`), em modo `-p`, num clone temporário vazio.

| Passo | Resultado |
|---|---|
| Sessão 1: `/flow-dev:spec-writer` escrevendo `docs/specs/login/spec.md` | Eventos gravados: `started`, `prompt`, `skill` (spec-writer), `command`, `file_edit` (spec-writer), `waiting`, `ended` (`other`). Sessão `ended`, artefato `docs/specs/login/spec.md` **versão 1** (spec-writer, `trigger = stop`, 702 bytes). |
| Sessão 2 (mesma tarefa): pedido de ajuste na mesma spec | Eventos da sessão 2 gravados com a mesma sequência; o mesmo artefato passa a **versão 2** (911 bytes), a versão 1 continua. |
| `dropped_events`, `last_failure`, `active_skill` | 0, nulo e nulo ao final das duas sessões. |

**O que este smoke não cobriu** (fica para quem abrir a tela com GitHub e quadro reais): a janela do GNOME Terminal, a sessão interativa com `/exit`, e a tela do navegador (etapa "Aguardando você", artefato renderizado e seletor de versão). Esses trechos têm cobertura por teste de componente (V-08, V-18) e pelo e2e V-19a/b, que está `test.fixme` pela trava do GitHub. A transição `running → waiting → ended` foi vista no banco: com `-p`, o `SessionEnd` chega logo depois do `Stop`.
