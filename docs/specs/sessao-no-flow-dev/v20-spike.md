# V-20 — Spike: Claude Agent SDK dentro do Flow Dev

> **Data:** 2026-11-23 · **Claude Code:** 2.1.330 (o do PATH) · **SDK:** `@anthropic-ai/claude-agent-sdk` 0.3.330, fixado sem `^` · **Spec:** [spec.md](spec.md)

O script está em `spike/` (`spike-session.ts <basics|permissions|resume|interrupt|hooks|wait|exit|multi>`, com o `package.json` próprio, fora do monorepo). Cada caso sobe o Claude real com a assinatura da máquina, num repositório git temporário e com o ambiente filtrado pelo mesmo `terminalEnvironment` do produto (sem `CLAUDE*` nem `ANTHROPIC_API_KEY`). A saída de cada subcomando fica em `spike/out/<subcomando>.log` (ignorada pelo git); `hooks-payloads.json` guarda os payloads recebidos.

## Resultados

| ID | Resultado | Evidência |
|---|---|---|
| V-20a | **Passou.** Com `pathToClaudeCodeExecutable` igual ao `claude` do PATH e sem chave de API, a sessão responde. A mensagem `system/init` traz `apiKeySource: "none"` (login da assinatura) e `claude_code_version: "2.1.330"`. | `out/basics.log` |
| V-20b | **Passou, com uma diferença.** O plugin `contexto/` carrega: `init.skills` lista `flow-dev:direct-executor` e as outras três. Um prompt que começa por `/flow-dev:direct-executor …` é expandido pelo Claude Code e a skill roda, mas **sem chamada da ferramenta Skill** (nenhum `tool_use` com `name: "Skill"`), igual ao que o V-15d já mostrou no terminal. O evento de skill continua vindo do `UserPromptSubmit.prompt` (e do `PostToolUse` quando o Claude chama a ferramenta). | `out/basics.log` |
| V-20c | **Passou.** Em `bypassPermissions`, o `canUseTool` recebe `AskUserQuestion` (e só ele; as demais ferramentas rodam sem passar pelo callback). Devolver `{ behavior: "allow", updatedInput: { questions, answers: { "<pergunta>": "Verde" } } }` faz o Claude escrever "Escolhida: Verde" na vez seguinte. O SDK emite um aviso `CLAUDE_SDK_CAN_USE_TOOL_SHADOWED` no processo; é só um aviso. | `out/basics.log` |
| V-20c (múltipla) | **Passou.** Para `multiSelect`, `answers[pergunta]` aceita tanto o array `["Azul","Verde"]` quanto a string `"Azul, Verde"`; o Claude leu as duas igual. O produto envia o array (V-22b). | `out/multi.log` |
| V-20d | **Passou.** Com `toolConfig.askUserQuestion.previewFormat: "markdown"`, a opção chega com `preview: "```\nazul\n```"` quando o Claude manda prévia. | `out/basics.log` |
| V-20e | **Passou.** Em `acceptEdits`, `pnpm --version` chega ao `canUseTool` como `Bash` com `suggestions: [{ type: "addRules", rules: [{ toolName: "Bash", ruleContent: "pnpm --version" }], behavior: "allow", destination: "localSettings" }]`. Devolver essas sugestões em `updatedPermissions` grava `.claude/settings.local.json` com `{"permissions":{"allow":["Bash(pnpm --version)"]}}`, e a segunda sessão roda o mesmo comando sem chamar o `canUseTool`. A sugestão já vem com `destination: "localSettings"`. | `out/permissions.log` |
| V-20f | **Passou.** Com um `node -e "setTimeout(...)"` rodando em primeiro plano, `SIGKILL` no processo `claude` filho derruba o fluxo com `Claude Code process terminated by signal SIGKILL`. `query({ resume: <session_id> })` volta com a conversa inteira: o Claude lembrou da palavra secreta e disse que a chamada do Bash foi interrompida antes de o resultado ser gravado. | `out/resume.log` |
| V-20g | **Passou.** `interrupt()` durante um comando em primeiro plano de 30 s devolve `{ still_queued: [] }` e o fluxo emite um `result` com `subtype: "error_during_execution"` em cerca de 0,1 s (limite: 5 s). A sessão aceitou a mensagem seguinte e respondeu. | `out/interrupt.log` |
| V-20h | **Mudou.** Dos seis hooks, o callback entrega `UserPromptSubmit`, `PostToolUse` e `Stop`, com os mesmos campos e tipos das fixtures da Spec B (nenhuma divergência em `hook_event_name`, `session_id`, `prompt`, `tool_name`, `tool_input.file_path`, `tool_input.command`, `tool_input.skill`). **`SessionStart`, `SessionEnd` e `Notification` nunca chegam ao callback** nem com `includeHookEvents: true`, nem ao fechar a entrada (`input.close()`) ou a query (`query.close()`), nem com 75 s ociosos (o V-15 já tinha visto o mesmo para `SessionStart` e `Notification` nos hooks HTTP). Plano: o runtime sintetiza os dois que importam (ver abaixo). | `out/hooks.log`, `out/hooks-payloads.json` |
| V-20i | **Passou.** Um `canUseTool` de `AskUserQuestion` que só resolve depois de 30 min (1.800 s): o Claude esperou sem erro de prazo e, quando a promessa resolveu, escreveu "Escolhida: Verde". | `out/wait.log` |
| V-20j | **Passou (B-25).** A mensagem `/exit` chega ao Claude Code como texto; ele responde com o assistente dizendo `/exit isn't available in this environment.` e um `result` de sucesso. O fluxo não termina e a sessão aceitou uma mensagem depois. Para terminar, a pessoa usa "Encerrar". | `out/exit.log` |
| V-20k | **Passou.** Com `settingSources: ["user","project","local"]`, o `CLAUDE.md` do projeto (instrução marcadora "PONTEIRO") e o `CLAUDE.md` pessoal da pessoa (importa o `RTK.md`) entram no contexto; com `settingSources: []` nenhum dos dois entra e a lista de skills do usuário some. A verificação usa `tools: []`, para a resposta vir do contexto e não de uma leitura de arquivo. | `out/basics.log` |

Desvios do roteiro, todos no próprio script do spike:
- O V-20k usou o `CLAUDE.md` real da pessoa (`~/.claude/CLAUDE.md`, que importa o `RTK.md`) em vez de gravar uma instrução marcadora ali, porque a spec §9 proíbe escrever em `~/.claude`.
- Nos V-20f e V-20g o comando longo é um `node -e "setTimeout(() => {}, N)"` e não `sleep N`: o Bash do Claude Code recusa `sleep` longo em primeiro plano e o Claude o manda para segundo plano, o que invalidava o caso.
- Um repositório de teste dentro da pasta de rascunho do próprio Claude Code (`/tmp/claude-…/scratchpad`) não teve o `CLAUDE.md` carregado; em `/tmp` e no `$HOME` carrega. É uma peculiaridade do ambiente do spike, e o clone da pessoa fica fora disso.

## Opções do `query()`

É o que o `AgentSdkSessionRuntime` (04.2) passa. Os nomes e valores foram os que funcionaram acima.

```ts
query({
  prompt: inputStream,
  options: {
    cwd: session.checkoutPath,
    pathToClaudeCodeExecutable: claudePathFoundByToolLocator,
    env: terminalEnvironment(process.env),
    plugins: [{ type: "local", path: contextDir }],
    settingSources: ["user", "project", "local"],
    permissionMode,
    allowDangerouslySkipPermissions: permissionMode === "bypassPermissions",
    toolConfig: { askUserQuestion: { previewFormat: "markdown" } },
    canUseTool,
    hooks: { UserPromptSubmit, PostToolUse, Stop },
    resume: claudeSessionId,
  },
});
```

- **`prompt`**: um `AsyncIterable<SDKUserMessage>`, o modo de entrada por streaming. Cada mensagem é `{ type: "user", message: { role: "user", content: texto }, parent_tool_use_id: null }`. O texto vai como digitado, inclusive `/flow-dev:…`.
- **`permissionMode`**: `bypass` → `bypassPermissions` (exige `allowDangerouslySkipPermissions: true`), `accept_edits` → `acceptEdits`, `ask_all` → `default`.
- **`hooks`**: cada evento é `[{ hooks: [callback] }]`; o `PostToolUse` leva `matcher: "Write|Edit|MultiEdit|NotebookEdit|Bash|Skill"`, o mesmo da Spec B. O callback devolve `{}`.
- **`resume`**: o `session_id` da mensagem `system/init` da conversa original, só na retomada; a primeira mensagem entra pelo fluxo de entrada.
- **`env`**: o `terminalEnvironment` da Spec A, sem variáveis `CLAUDE*` (exceto `CLAUDE_CONFIG_DIR`) nem `ANTHROPIC_*`. O processo pai do spike estava dentro de outro Claude Code e as variáveis dele não vazaram.
- **Não usar**: `includePartialMessages` (a spec mostra cada texto completo, REQ-057) e `persistSession: false` (o `resume` depende do histórico no disco).

## Formatos reais

- **Mensagem `system/init`**: `session_id`, `apiKeySource`, `claude_code_version`, `permissionMode`, `skills`, `plugins` (`{ name, path, source }`). O `session_id` vira `claude_session_id`.
- **Texto do assistente**: mensagem `type: "assistant"` com `parent_tool_use_id: null` e `message.content[]` com blocos `text`, `thinking` e `tool_use`. Só os blocos `text` com `parent_tool_use_id` nulo entram na conversa (REQ-056).
- **Fim da vez**: mensagem `type: "result"` (`subtype: "success"`, ou `"error_during_execution"` com `is_error: true` depois de `interrupt()`).
- **`canUseTool(toolName, input, options)`**: `options.suggestions` (lista de `PermissionUpdate`, ver V-20e), `options.toolUseID`, `options.title`, `options.displayName`, `options.description` e `options.decisionReason`. Para `AskUserQuestion`, `suggestions` vem vazio e `input` é `{ questions: [{ question, header, options: [{ label, description, preview? }], multiSelect }] }`.
- **`PermissionResult`**: `{ behavior: "allow", updatedInput?, updatedPermissions? }` ou `{ behavior: "deny", message }`. "Permitir sempre" devolve `updatedPermissions: options.suggestions` (que já traz `destination: "localSettings"`); a regra mostrada à pessoa é `Bash(<ruleContent>)`, no formato que o Claude Code grava no arquivo.
- **Queda do processo**: o `for await` lança `Claude Code process terminated by signal SIGKILL`; é o gatilho do `onExit({ kind: "crashed" })`.

## Decisões que o spike fecha

- **DEC-15, DEC-19:** confirmadas. O SDK, apontado para o `claude` do PATH (2.1.330), usa o login da pessoa sem chave de API. A versão mínima do Claude Code é a 2.1.330, a única testada.
- **DEC-20:** plano A. "Tudo liberado" é `bypassPermissions` com `allowDangerouslySkipPermissions`, e as perguntas chegam ao `canUseTool`. O plano B (`default` com `canUseTool` liberando tudo) não é necessário.
- **DEC-18:** vale para `UserPromptSubmit`, `PostToolUse` e `Stop`. `SessionStart` e `SessionEnd` não chegam pelo SDK, então o runtime os sintetiza e entrega ao `onHook` com o payload mínimo que o `HookEventSummarizer` lê:
  - ao receber a mensagem `system/init`: `{ hook_event_name: "SessionStart", session_id, cwd }`;
  - ao fim da sessão (`onExit` com `ended`): `{ hook_event_name: "SessionEnd", session_id, reason: "other" }`.
  O `Notification` não é entregue e deixa de ser necessário: o "Precisa de você" vem dos pedidos gravados pelo próprio serviço.
- **P-09, P-10, P-11:** confirmadas.
- **B-25:** ver V-20j.

## Smoke V-31

> **Data:** 2026-11-23 · **Claude Code:** 2.1.330 · **Comando:** `FLOW_DEV_REAL_CLAUDE=1 pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/session-real-permissions.test.ts test/session-real-claude.test.ts` (4 testes, 105 s; sem a variável, eles são ignorados)

**O que foi e o que não foi feito.** O smoke rodou contra o Claude real, mas **pelas procedures `tasks.session.*` e `tasks.terminal.*`, não pela tela**: o `open`, as respostas, a recusa, a mensagem e o reinício passam pelo mesmo controller, pelo Postgres e pelo `AgentSdkSessionRuntime` de produção, só sem o navegador. A tela do trabalho só libera a operadora com a verificação real do GitHub (a mesma razão de os e2e V-10a, V-19 e V-30 ficarem `test.fixme`), e esse login não dá para fazer sem a pessoa. **Falta uma passada manual pela UI** (os componentes têm teste, mas a ligação tela, API e Claude real não foi vista no navegador).

| ID | Resultado | Evidência |
|---|---|---|
| V-31a | **Passou, com uma ressalva (review-002).** Uma sessão `/flow-dev:spec-writer` com a ferramenta `AskUserQuestion`: as perguntas viraram pedidos `pending`, foram respondidas por `answerQuestion` com a primeira opção, o Claude seguiu, e o `docs/specs/sair/spec.md` virou artefato quando a vez terminou (sessão em "Aguardando você"). **Ressalva:** o artefato só é capturado se o Claude gravar o arquivo com a ferramenta Write, Edit, MultiEdit ou NotebookEdit; em 3 execuções da review-002 ele usou Bash (`mkdir && cat >`), e nada foi capturado, sem defeito do serviço (a Spec B só registra essas ferramentas). O prompt do teste agora pede a ferramenta Write, e o teste passou 2 vezes seguidas; se falhar, a mensagem lista os eventos gravados. | `test/session-real-claude.test.ts` |
| V-31b | **Passou.** Em `accept_edits`, `pnpm --version` abriu um pedido com a regra `Bash(pnpm --version)`; "Permitir sempre" gravou `.claude/settings.local.json` no clone com a regra, e uma segunda sessão rodou o mesmo comando sem abrir nenhum pedido. | `test/session-real-permissions.test.ts` |
| B-26 | **Diferente da spec.** Com o `.claude/settings.local.json` **versionado** no clone, o Claude Code 2.1.330 não grava a regra (o arquivo e o `git status` ficam como estavam), embora o `canUseTool` devolva `updatedPermissions` com `localSettings`. Sem o arquivo versionado, ele grava. A spec dizia que a mudança apareceria no git. O experimento está em `spike/tracked-settings.ts`, e o teste "B-26 finding" fixa o comportamento atual para avisar se o Claude Code mudar. | `test/session-real-permissions.test.ts`, `spike/out/tracked-settings.log` |
| V-31c | **Passou.** Com um pedido pendente, o processo `claude` foi morto com `SIGKILL` (a queda real): a sessão foi a "Interrompida", o pedido ficou "Cancelada", e a mensagem "Pode seguir com a opção recomendada" retomou a mesma conversa (`resume`), com o Claude respondendo "Azul", a opção recomendada da pergunta anterior. | `test/session-real-claude.test.ts` |
