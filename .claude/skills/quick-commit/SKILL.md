---
name: quick-commit
description: >
  Cria commits seguindo Conventional Commits com escopo
  sem o processo completo de PR. Para quando você só quer commitar mudanças
  prontas, dividindo por tarefa lógica. Não cria branch, não faz build obrigatório,
  não faz push, não abre PR.
  Use quando o usuário disser "só faça os commits", "commitar", "faça commits
  sem PR", "commits rápido", "commit normal", ou qualquer pedido de commit
  isolado sem PR/push.
---

# Quick Commit

Skill enxuta para criar commits com Conventional Commits sem o fluxo completo de PR.
Útil quando o usuário quer apenas dividir mudanças em commits lógicos e parar aí.

## Quando usar esta skill em vez de `git-workflow`

- Usuário pediu **apenas** commits ("só commita isso", "faça os commits")
- Não vai criar PR agora
- Não precisa rodar build obrigatório
- Não precisa criar branch nova (já está na branch correta)
- Não precisa push automático

Se o usuário pedir branch, push ou PR, use `git-workflow` em vez desta.

## Hard Gates

- **Nunca** usar `--no-verify` em `git commit` sem confirmação explícita do usuário
- Sempre seguir Conventional Commits com escopo: `feat(scope):`, `fix(scope):`, etc.
- **Nunca** fazer push automático — esta skill para depois do(s) commit(s)

## Phase 0 — Contexto opcional da issue

O contexto da issue é **importante** para escrever commits que reflitam a intenção real da mudança. Por isso, se houver issue, **exigir a URL completa** — não aceitar só o número.

### Step 0.1 — Verificar `.compozy/prompts/` primeiro (atalho)

Se o diretório `.compozy/prompts/` existir e tiver arquivos `.md`:

```bash
ls -1 .compozy/prompts/*.md 2>/dev/null
```

Listar os prompts e oferecer ao usuário escolher. Use `AskUserQuestion` com:
- **header**: `"Issue"`
- **question**: `"Esses commits são para qual issue?"`
- **multiSelect**: `false`
- **options** (até 4, com prefixo `ajuste-` primeiro):
  - label: `"#<issue_number> — <título truncado>"` / description: 80 chars do `## Objetivo` ou `## Pontos de Ajuste`
- Sempre incluir: `"Outra issue / sem prompt local"` / description: `"Vou colar a URL da issue ou commitar sem issue"`

Se o usuário escolher um prompt: abrir o arquivo, extrair `issue_number` e usar o `## Objetivo` como contexto. Pular Step 0.2.

Se escolher `"Outra issue / sem prompt local"`: cair em Step 0.2.

### Step 0.2 — URL obrigatória (sem prompts locais)

Quando não há prompt local, **exigir a URL da issue** se houver uma. Use `AskUserQuestion` com:

- **header**: `"Issue"`
- **question**: `"Esses commits têm issue vinculada?"`
- **multiSelect**: `false`
- **options**:
  - label: `"Não, só commit"` / description: `"Commitar sem referência a issue"`
  - label: `"Colar URL da issue"` / description: `"Use a opção 'Other' e cole o link github.com/.../issues/N — vou ler o conteúdo da issue"`

**Se "Colar URL da issue"**: aceitar via campo `"Other"`. Parsear com regex `github\.com/([^/]+)/([^/]+)/issues/(\d+)` → extrair `owner`, `repo`, `number`. Se não casar, informar erro e pedir novamente. **Não aceitar só o número como fallback.**

Buscar o conteúdo da issue:

```bash
gh issue view <number> --repo <owner>/<repo> --json title,body,labels
```

Usar `title` + `body` como **contexto principal** para entender o que está sendo implementado e escrever mensagens de commit alinhadas com a intenção da issue. Referenciar nas mensagens com `refs #<number>` (não usar `Closes` — isso só faz sentido em PR).

Se `gh` falhar, informar o usuário e pedir outra URL ou autorizar `gh auth login`. **Não prosseguir sem o conteúdo** quando o usuário disse que há issue vinculada.

**Se "Não, só commit"**: pular contexto de issue. Não adicionar `refs #` nas mensagens.

## Phase 1 — Entender as mudanças

1. `git status` — ver arquivos modificados e untracked
2. `git diff --stat` — visão geral
3. `git diff` para cada arquivo modificado — entender o que mudou
4. Ler arquivos untracked que serão adicionados
5. `git log --oneline -5` — entender contexto recente da branch

## Phase 2 — Planejar os commits

Agrupar mudanças em commits lógicos:

- Cada commit = uma unidade lógica de trabalho
- Conventional Commits com escopo:
  - `feat(scope):` — nova feature
  - `fix(scope):` — bug fix
  - `chore(scope):` — tooling, config, type-only changes
  - `refactor(scope):` — restruturação de código
  - `test(scope):` — adição de testes
  - `perf(scope):` — melhorias de performance
  - `docs(scope):` — documentação

**Apresentar o plano ao usuário** antes de commitar (tabela com `#`, mensagem, arquivos). Esperar confirmação antes de prosseguir.

## Phase 3 — Commitar

Para cada commit planejado:

1. Stage só os arquivos do commit:
   ```bash
   git add <file1> <file2> ...
   ```
2. Verificar que só os arquivos certos estão staged:
   ```bash
   git diff --cached --stat
   ```
3. Commitar com mensagem descritiva (incluir `refs #<number>` se houver issue):
   ```bash
   git commit -m "$(cat <<'EOF'
   feat(scope): short summary

   Descrição detalhada do que mudou e por quê.

   refs #<issue_number>
   EOF
   )"
   ```
   (Omitir a linha `refs #` se não houver issue.)
4. Se pre-commit hook falhar por motivo **não relacionado** às mudanças (baseline pré-existente), informar o usuário e perguntar antes de usar `--no-verify`.

Esperar cada commit completar antes do próximo.

## Phase 4 — Reportar

Após todos os commits, mostrar:

```bash
git log --oneline -<N>
```

Onde `N` = quantidade de commits criados nesta sessão.

Confirmar ao usuário com mensagem curta tipo:

```
3 commits criados na branch <branch-name>. Pronto.
```

**Não fazer push, build, ou abrir PR.** Se o usuário quiser ir até o PR depois, apontar para `git-workflow`.

## Reference

- Conventional Commits: https://www.conventionalcommits.org/
- Convenções completas de PR (branch naming, base branch, PR body): ver [git-workflow](../git-workflow/SKILL.md)
