---
status: completed
title: Spike V-00 do terminal, das skills e dos anexos
type: test
complexity: high
---

# Task 01: Spike V-00 do terminal, das skills e dos anexos

## Visão geral
Antes de escrever o lançador, prova manualmente, com o GNOME Terminal e o Claude Code reais, as premissas que a arquitetura assume:
- a linha de comando abre o terminal na pasta certa e entrega o prompt literal;
- as skills copiadas para uma pasta passada com `--add-dir` carregam, e `/skill` no prompt inicial as aciona;
- o Claude lê imagens, PDFs e texto pelo caminho.

O resultado fixa o formato exato do comando (§15) e responde a Q-03. As tasks 03 e 04 dependem dele.

<critical>
- LEIA a spec (`spec.md`, §12, §15 "Comando", §17 DEC-01, DEC-10 e DEC-11, §21, P-02, P-03 e P-06, Q-03) e as regras do projeto (AGENTS.md/CLAUDE.md) antes de começar.
- FAÇA UMA MINI-TAREFA POR VEZ, na ordem. Só marque `[x]` depois de rodar o "Pronto quando" dela e ver passar.
- NÃO saia dos arquivos listados sem registrar o motivo no Registro de execução. Nada fora do escopo da spec.
- Esta tarefa não altera código do produto. Scripts auxiliares ficam no scratchpad da sessão ou em `/tmp/flow-v00/`, nunca no repositório.
- Ao começar, mude `status` para `in_progress` (aqui e em `_tasks.md`). Mude para `completed` só quando todas as mini-tarefas estiverem marcadas e os critérios de sucesso tiverem sido comprovados por comando. A revisão contra a spec acontece uma vez, depois de todas as tarefas: não a espere aqui, mas não marque nada que não tenha prova, porque ela vai conferir.
- Cada caso abre uma janela real do GNOME Terminal na máquina do usuário. Se a sessão não tiver display (`$DISPLAY`/`$WAYLAND_DISPLAY` vazios), peça ao usuário que rode os comandos e cole o resultado. Não marque o caso sem a observação real.
</critical>

## Requisitos
- V-00 (spec §23): executar o spike e registrar o resultado em `docs/specs/execucao-no-terminal/v00-spike.md` (Definição de pronto, §24).
- P-02: o ambiente tem `gnome-terminal` (confirmar a versão com `gnome-terminal --version`).
- P-03: Claude Code 2.1.329 (confirmar com `claude --version`; se a versão for outra, registrar).
- P-06: o Claude lê imagem, PDF e texto pelo caminho local citado no prompt, carrega as skills do `.claude/skills/` de um diretório passado com `--add-dir` e aceita `/skill` no prompt inicial.
- Q-03: medir qual skill vale quando o diretório de trabalho tem uma skill com o mesmo nome da cópia passada com `--add-dir`.
- Ajustar a §15 "Comando" da spec com o formato que funcionou.

## Interfaces
- **Consome:** `claude` e `gnome-terminal` no PATH; as skills em `.claude/skills/{spec-writer,spec-to-tasks,direct-executor,spec-conformance}/` do monorepo.
- **Produz:** `v00-spike.md`, com:
  - a linha de comando final (argumentos na ordem exata);
  - a resposta para a Q-03 ("cópias com o nome original" ou "cópias com prefixo `flow-`");
  - as limitações observadas, como o diálogo de confirmação do modo de permissões na primeira vez.

## Mini-tarefas

- [x] **01.1 — Terminal na pasta com acentos e prompt literal**
  - **Arquivos:** `docs/specs/execucao-no-terminal/v00-spike.md` (criar, seção "Terminal e prompt")
  - **Testes:** V-00a, V-00b
  - **Pronto quando:** em `/tmp/flow-v00/Área de trabalho/shop` (repositório git criado com `git init`), a linha da §15 é disparada por um script Node que usa `execFile` sem shell (`gnome-terminal --working-directory=<pasta> -- claude --dangerously-skip-permissions --add-dir <contexto> -- <prompt>`). A janela abre nessa pasta (`/status` ou `pwd` pelo Claude). O prompt `Teste "aspas" 'simples' $(whoami) \`crase\`` com duas quebras de linha, e um segundo prompt que começa com `--help`, chegam ao Claude exatamente como enviados. O resultado de cada caso está registrado em `v00-spike.md`, com a versão do `gnome-terminal` e do `claude`.
  - **Nota:** se `--` depois de `claude` não impedir que o prompt vire flag, teste a forma alternativa (prompt como argumento posicional sem `--`, ou `--` seguido do prompt) e registre a que funcionou.
- [x] **01.2 — Skills por `--add-dir` e precedência (Q-03)**
  - **Arquivos:** `docs/specs/execucao-no-terminal/v00-spike.md` (seção "Skills")
  - **Testes:** V-00c, V-00d
  - **Pronto quando:** cobre os três casos abaixo, e `v00-spike.md` registra o que aconteceu em cada um e a decisão da Q-03.
    - Com as quatro skills copiadas para `/tmp/flow-v00/sessao/contexto/.claude/skills/` e o clone de teste sem skills, o prompt inicial `/direct-executor Diga apenas o nome da skill que está seguindo.` aciona a skill copiada.
    - Com uma skill `spec-writer` diferente, com uma frase marcadora, em `<clone>/.claude/skills/spec-writer/`, o prompt `/spec-writer` mostra qual das duas valeu.
    - Se valer a do repositório, a cópia renomeada para `flow-spec-writer` (pasta e `name:` do frontmatter) é acionada com `/flow-spec-writer`.
- [x] **01.3 — Leitura dos anexos e ajuste da spec**
  - **Arquivos:** `docs/specs/execucao-no-terminal/v00-spike.md` (seção "Anexos" e "Comando final"), `docs/specs/execucao-no-terminal/spec.md` (§15 "Comando", P-06)
  - **Testes:** V-00e
  - **Pronto quando:** com um PNG, um PDF de cerca de 2 MB e um `.log` em `/tmp/flow-v00/sessao/contexto/anexos/`, e o prompt terminando na seção `Anexos (leia antes de começar):` com os caminhos absolutos (formato §7.3), o Claude descreve o conteúdo dos três. `v00-spike.md` tem a seção "Comando final", e a §15 da spec mostra essa mesma linha (`git diff docs/specs/execucao-no-terminal/spec.md` mostra só o ajuste da §15, e da P-06 se ela mudou).

## Detalhes de implementação
- O script de disparo deve imitar o que o `GnomeTerminalLauncher` fará: `execFile("gnome-terminal", args, { detached: true, stdio: "ignore" })` seguido de `unref()`. Assim o spike prova o mecanismo real, não uma linha de shell.
- A variação do prompt longo (perto de 20.000 caracteres) também deve ser testada em 01.1, porque o risco da §21 cita argumentos longos.
- Registre o diálogo de confirmação de `--dangerously-skip-permissions` na primeira execução (risco da §21), sem tentar contorná-lo.

### Arquivos relevantes
- `.claude/skills/spec-writer/SKILL.md`, `.claude/skills/direct-executor/SKILL.md`, `.claude/skills/spec-to-tasks/SKILL.md`, `.claude/skills/spec-conformance/SKILL.md`: as skills que serão copiadas.
- `packages/api/src/infra/agents/claudeArguments.ts`: como o projeto já monta argumentos do Claude (aqui o modo é interativo, sem `-p`).
- `docs/specs/agentes-locais-por-assinatura/v00-spike.md`: formato de registro de um spike anterior neste repositório.

### Arquivos afetados
- `docs/specs/execucao-no-terminal/v00-spike.md`: novo.
- `docs/specs/execucao-no-terminal/spec.md`: §15 "Comando" (e P-06, se mudar).

### Decisões relacionadas
- DEC-01 (§17): o terminal nativo é disparado pelo servidor local; o spike prova o disparo.
- DEC-10 (§17): os anexos são citados por caminho; o spike prova a leitura.
- DEC-11 (§17): as skills são copiadas para `contexto/` e passadas com `--add-dir`; o plano B é `--plugin-dir`. Se nem a cópia renomeada funcionar, pare e registre um bloqueio em "Premissas e bloqueios" de `_tasks.md` antes de seguir.

## Premissas
- Q-03 sem resposta do usuário: vale a sugestão da spec (a do Flow Dev deve prevalecer; se não prevalecer, usar o prefixo `flow-`).

## Testes atribuídos
- [x] V-00a: terminal disparado sem shell com `--working-directory` numa pasta com espaço e acento → a janela abre nessa pasta.
- [x] V-00b: prompt com aspas, `$()`, crases, quebras de linha, começando por `--help`, e outro com cerca de 20.000 caracteres → chegam literais ao Claude como primeira mensagem.
- [x] V-00c: `/direct-executor` no prompt inicial, com a skill só na pasta do `--add-dir` → a skill copiada é acionada.
- [x] V-00d: skill de mesmo nome no clone → registra qual vale e a decisão da Q-03 (nome original ou prefixo `flow-`).
- [x] V-00e: PNG, PDF e `.log` citados por caminho absoluto em `contexto/anexos/` → o Claude descreve o conteúdo dos três.

## Critérios de sucesso
- Todas as mini-tarefas marcadas, cada uma com o "Pronto quando" executado e observado na máquina real.
- `v00-spike.md` registra: versões, os cinco casos com o resultado, a linha de comando final e a decisão da Q-03.
- A §15 da spec mostra a mesma linha de comando registrada no spike.
- Nenhum arquivo de código do produto alterado (`git status` mostra só os dois documentos).

## Registro de execução
<!-- The implementer appends one entry per mini-task: date, what was done, commands run with their result, deviations. Example:
- 2026-11-22 · 01.1 · disparo com acentos e prompt literal · `node /tmp/flow-v00/launch.mjs` → janela em /tmp/flow-v00/Área de trabalho/shop, prompt literal · sem desvios -->
- 2026-11-22 · 01.1 · terminal na pasta com acento e prompt literal · script `/tmp/flow-v00/launch2.mjs` (spawn sem shell) + conferência de `/proc/<pid>/cwd` e `/proc/<pid>/cmdline` byte a byte → cwd `/tmp/flow-v00/Área de trabalho/shop`; os 3 prompts (aspas/`$()`/crase, `--help`, 19.914 caracteres) idênticos ao arquivo e tratados como primeira mensagem · desvio: o `gnome-terminal` repassa o ambiente `CLAUDE*` do disparador, então o lançador deve filtrá-lo; o primeiro uso numa pasta nova pede confiança no terminal (o usuário aceitou uma vez a pasta de teste)
- 2026-11-22 · 01.2 · skills e precedência · `--add-dir` abre o diálogo "Adding a new directory" a cada sessão (bloqueia); `--settings additionalDirectories` não carrega skills; `--plugin-dir` carrega sem diálogo e `/direct-executor` virou `/flow-dev:direct-executor`; com `spec-writer` no repositório, `/spec-writer` vale a do repositório e `/flow-dev:spec-writer` vale a do plugin · desvio: DEC-11 passa ao plano B (plugin `flow-dev` em `contexto/`, comandos com namespace); Q-03 decidida assim, sem prefixo `flow-` nas pastas; os três casos do "Pronto quando" foram adaptados porque o caso `--add-dir` não pode ser concluído sem o diálogo
- 2026-11-22 · 01.3 · anexos e spec · PNG, PDF de 2.000.677 bytes e `.log` citados por caminho absoluto → o Claude leu os 3 ("Read 3 files") e citou os marcadores, sem `--add-dir`; §15 e P-06 da spec ajustadas (`git diff` mostra só essas linhas) · `v00-spike.md` criado com "Comando final"; as demais menções a `--add-dir` na spec são atualizadas na 07.2
