# V-00 — Spike: terminal, skills e anexos

> **Data:** 2026-11-22 · **Versões:** GNOME Terminal 3.52.0 (VTE 0.76.0), Claude Code 2.1.329 no início e 2.1.330 depois da atualização automática durante o spike · **Spec:** [spec.md](spec.md)

Cada caso abriu uma janela real do GNOME Terminal, disparada por um script Node com `spawn("gnome-terminal", args, { detached: true, stdio: "ignore", shell: false })` e `unref()`. A pasta de teste foi `/tmp/flow-v00/Área de trabalho/shop` (repositório `git init` com remote `git@github.com:acme/shop.git`). O que o Claude recebeu foi conferido de duas formas: o `argv` do processo em `/proc/<pid>/cmdline`, byte a byte contra o arquivo do prompt, e a tela da janela.

## Veredito

- **Terminal, prompt literal e leitura de anexos: aprovados.**
- **`--add-dir`: reprovado como mecanismo das skills.** Abre um diálogo de confirmação a cada sessão, e a lista `permissions.additionalDirectories` das settings não carrega skills.
- **Plano B da DEC-11, `--plugin-dir`: aprovado.** A pasta da sessão vira um plugin chamado `flow-dev`. Sem diálogo, e o comando de skill namespaced vale sempre a do Flow Dev.

## Resultados

| ID | Resultado | Evidência |
|---|---|---|
| V-00a | **Passou** | `readlink /proc/<pid>/cwd` → `/tmp/flow-v00/Área de trabalho/shop`; a tela do Claude mostra a mesma pasta. |
| V-00b | **Passou** | `argv` do `claude` com o último elemento idêntico ao arquivo do prompt, em três casos: `Teste "aspas" 'simples' $(whoami) \`crase\`` com quebras de linha, `\` e `$HOME`; prompt começando por `--help`; prompt de 19.914 caracteres (20.413 bytes) com `$(x)`, crases e aspas. O Claude tratou os três como primeira mensagem, sem expandir nada (o terceiro respondeu `LONGO-OK`, o segundo `PROMPT-HELP-OK`). |
| V-00c | **Passou com `--plugin-dir`.** Com `--add-dir`, **bloqueado** pelo diálogo. | Ver "Skills". |
| V-00d | **Respondida** | Ver "Skills" e a decisão da Q-03. |
| V-00e | **Passou** | Ver "Anexos". |

## Terminal e prompt

- A forma que funcionou: `gnome-terminal --working-directory=<pasta> -- claude <flags> -- <prompt>`. O primeiro `--` separa o comando do terminal; o segundo impede que um prompt começando por `-` vire flag do Claude.
- O caminho com espaço e acento (`Área de trabalho`) chega ao `cwd` do Claude sem tratamento extra.
- **Ambiente herdado.** O `gnome-terminal` repassa o ambiente do processo que o dispara. Quando o disparo vem de dentro de outra sessão do Claude Code, as variáveis `CLAUDE*` (`CLAUDECODE`, `CLAUDE_CODE_SESSION_ID`, `CLAUDE_CODE_MESSAGING_TOKEN` etc.) vão junto, e o Claude novo avisa "Transcript saving is off — inherited CLAUDE_CODE_CHILD_SESSION marker". Depois de remover as variáveis `CLAUDE*` do ambiente passado ao `spawn`, o aviso sumiu. **O lançador filtra as variáveis `CLAUDE*`** (e, com isso, não repassa tokens de outra sessão).
- **Confiança na pasta de trabalho.** Numa pasta que o Claude nunca viu, a primeira tela é "Accessing workspace… Is this a project you created or one you trust?". Não é contornável por flag e não faz parte do Flow Dev: o clone que a pessoa vincula normalmente já foi aberto no Claude e está confiável. Num clone novo, ela responde uma vez no terminal.
- `--dangerously-skip-permissions` não mostrou diálogo extra nesta máquina (`skipDangerousModePermissionPrompt` já está ativo nas configurações da pessoa). Em outra máquina, o diálogo de confirmação do modo pode aparecer na primeira vez (risco da §21, sem contorno).

## Skills

| Tentativa | Resultado |
|---|---|
| `--add-dir <sessão>/contexto` com as skills em `contexto/.claude/skills/` | A janela para em "Adding a new directory: <pasta>. This session hasn't worked here before… Yes, add it / No, exit" e espera uma tecla. A resposta vale só para a sessão, e cada sessão tem uma pasta nova, então a pergunta volta sempre. Derrota o clique único (G1). |
| `--settings '{"permissions":{"additionalDirectories":[<pasta>]}}'` | Sem diálogo, mas as skills não carregam: `/direct-executor` → "Unknown command: /direct-executor". |
| `--plugin-dir <sessão>/contexto` com `.claude-plugin/plugin.json` (`{"name":"flow-dev",…}`) e `skills/<skill>/SKILL.md` | Sem diálogo. `/direct-executor Diga apenas o nome da skill…` foi resolvido para `/flow-dev:direct-executor`, e o Claude respondeu "Estou seguindo a skill flow-dev:direct-executor". |

**Precedência (V-00d).** Com um `spec-writer` marcador em `<clone>/.claude/skills/spec-writer/`:

- `/spec-writer …` (sem namespace) → valeu **a do repositório** ("skill do repositorio shop").
- `/flow-dev:spec-writer …` → valeu **a do plugin** ("Recebi as instruções do plugin flow-dev, da skill flow-dev:spec-writer"), com o aviso de que existe outra no repositório.

**Decisão da Q-03:** o comando inicial do prompt usa o namespace do plugin, **`/flow-dev:direct-executor`** e **`/flow-dev:spec-writer`**. A skill do Flow Dev vale sempre, mesmo que o repositório tenha uma de mesmo nome, e não é preciso renomear pastas nem o `name:` das cópias (a alternativa `flow-` da Q-03 fica descartada). As cópias mantêm o nome original dentro do plugin, e a pessoa aciona as outras por `/flow-dev:spec-to-tasks` e `/flow-dev:spec-conformance`.

**Consequência para a estrutura da sessão:** a pasta `contexto/` passa a ser a raiz de um plugin:

```text
<sessão>/contexto/.claude-plugin/plugin.json
<sessão>/contexto/skills/<skill>/…
<sessão>/contexto/anexos/…
```

Os anexos ficam dentro de `contexto/` só por organização; o Claude os lê pelo caminho absoluto sem `--add-dir` nem diálogo.

## Anexos

Com `/tmp/flow-v00/sessao/anexos/` contendo um PNG (texto "PNG-MARCADOR-AZUL-42"), um PDF de 2.000.677 bytes (texto "PDF-MARCADOR-LARANJA-77" mais um objeto de enchimento) e um `.log` de 40 linhas ("LOG-MARCADOR-VERDE-99"), e o prompt terminando em `Anexos (leia antes de começar):` com os três caminhos absolutos (formato §7.3), o Claude fez "Read 3 files" e descreveu os três citando cada marcador. Isso foi **sem `--add-dir`**, pelo modo de permissões liberado.

## Comando final

```text
gnome-terminal --working-directory=<checkout> -- claude --dangerously-skip-permissions --plugin-dir <sessão>/contexto -- <prompt>
```

Argumentos na ordem exata, cada um como um elemento do array: `--working-directory=<checkout>`, `--`, `claude`, `--dangerously-skip-permissions`, `--plugin-dir`, `<sessão>/contexto`, `--`, `<prompt>`. O `spawn` usa `{ detached: true, stdio: "ignore", shell: false, env: <ambiente sem as variáveis CLAUDE*> }` e `unref()`.

A Spec B acrescenta `--settings` a esta linha; os dois flags convivem (o spike não testou a combinação, que a Spec B deve provar).

## Limitações observadas

- O primeiro uso numa pasta de trabalho nova pede a confiança dela no próprio terminal.
- O `gnome-terminal` repassa o ambiente do disparador (corrigido pelo filtro `CLAUDE*`).
- A skill do repositório vence o comando sem namespace; o Flow Dev usa sempre o namespace.
- O Claude Code se atualiza sozinho (2.1.329 → 2.1.330 durante o spike); o formato do comando não mudou.

## Smoke V-10b

Executado em 2026-11-22 com o código real do servidor (controller de abertura e serviço de anexos, GNOME Terminal e Claude Code reais, nada falso), num clone temporário sem skills e com três anexos enviados pelo serviço (PNG, PDF e log) e prompt `/flow-dev:spec-writer …` (rota Tech Spec):

- o terminal abriu na pasta do clone e o Claude respondeu "Sigo a skill flow-dev:spec-writer";
- leu os três anexos ("Read 3 files") e descreveu cada um com o marcador certo (PNG-MARCADOR-AZUL-42, PDF-MARCADOR-LARANJA-77, LOG-MARCADOR-VERDE-99).

Desvio: o disparo não passou pelos cliques da interface no navegador (a UI é coberta pelos testes de componente; o e2e V-10a ficou `test.fixme`, ver `terminal-execution.spec.ts`, porque a tela do trabalho exige a verificação do GitHub da operadora). Na primeira tentativa os anexos não foram lidos porque o teste apagou a pasta de estado ao terminar; a repetição com a pasta preservada passou.
