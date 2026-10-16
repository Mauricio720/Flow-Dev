---
name: git-workflow
description: >
  Fluxo completo de entrega via Pull Request: revisa as mudanças e, com a
  review concluída, cria tudo em sequência: branch, commits Conventional
  Commits com escopo, verificações do monorepo, push e PR no GitHub com `gh`.
  Use sempre que o usuário pedir PR, push ou branch: "abre um PR", "cria o PR",
  "sobe isso", "faz o push", "cria uma branch e commita", "fluxo completo",
  "entrega essa issue", "revisa e abre o PR", "a review terminou, cria tudo",
  ou quando terminar uma tarefa ou uma rodada de review e pedir para publicar
  o trabalho. É a última etapa depois de `cy-review-round`/`cy-fix-reviews`. Para
  commits isolados, sem branch, push ou PR, use `quick-commit`.
---

# Git Workflow

Leva mudanças prontas do working tree até um Pull Request aberto. É a continuação
de [quick-commit](../quick-commit/SKILL.md): os commits são planejados e escritos
do mesmo jeito, e esta skill acrescenta review, branch, verificação, push e PR.

A ordem importa: a review vem antes de qualquer commit, porque corrigir um
achado depois do PR aberto gera commits de remendo e uma segunda rodada de
revisão. Com a review concluída, o restante roda de ponta a ponta após uma
única confirmação.

## Hard Gates

- Não commitar nem fazer push direto na `main`. O PR existe para que a mudança
  seja revisada antes de entrar na branch base.
- Não criar branch, commits nem PR enquanto a review (Phase 2) tiver achado
  bloqueante em aberto.
- Push e abertura de PR publicam o trabalho. Apresente o plano completo (Phase 4)
  e espere a confirmação do usuário antes de qualquer um dos dois.
- Não usar `--no-verify`, `--force` ou `--force-with-lease` sem confirmação
  explícita do usuário.
- Não abrir PR com verificação falhando sem que o usuário saiba: ou corrija, ou
  registre a falha no corpo do PR com a autorização dele.
- Mensagens de commit, título e corpo do PR em inglês, como o histórico do
  repositório.

## Phase 0 — Contexto da issue

Siga a Phase 0 de [quick-commit](../quick-commit/SKILL.md) (atalho por
`.compozy/prompts/`, senão URL completa da issue). O conteúdo da issue orienta o
nome da branch, as mensagens de commit e o resumo do PR.

Diferença em relação ao quick-commit: os commits continuam usando
`refs #<number>`, e o corpo do PR usa `Closes #<number>` para que o merge feche
a issue.

## Phase 1 — Entender o estado

```bash
git status
git diff --stat
git branch --show-current
git fetch origin
git log --oneline origin/main..HEAD
```

Leia o `git diff` dos arquivos modificados e os arquivos untracked que entrarão.
Com isso, determine:

- **Branch atual**: `main` ou uma branch de trabalho já existente.
- **Commits já feitos** à frente de `origin/main`: eles entram no PR e precisam
  aparecer no plano.
- **PR já aberto** para a branch (`gh pr view --json url,state 2>/dev/null`): se
  existir, o fluxo vira "commitar, push e atualizar o PR", sem criar outro.
- **Mudanças alheias à tarefa** no working tree: deixe fora dos commits e avise
  o usuário, em vez de arrastá-las para o PR.

## Phase 2 — Review

Nada é criado antes desta fase terminar.

### Step 2.1 — Reaproveitar uma review já feita

Não repita uma review que já aconteceu. Considere-a feita quando:

- ela foi executada nesta sessão (`/code-review`, `cy-review-round` ou pedido
  direto do usuário) e o código não mudou depois, além das correções dela; ou
- existe uma rodada Compozy da tarefa em `.compozy/tasks/<name>/reviews-NNN/`:

  ```bash
  grep -L "^status: resolved" .compozy/tasks/<name>/reviews-*/issue_*.md
  ```

  Saída vazia significa que todas as issues da rodada estão resolvidas. Qualquer
  arquivo listado é um achado em aberto: mostre ao usuário e sugira
  `cy-fix-reviews` antes de continuar.

### Step 2.2 — Revisar, quando ainda não houve review

Revise tudo o que entrará no PR: `git diff origin/main...HEAD` mais o working
tree e os arquivos untracked. Procure, nesta ordem:

1. Bugs de comportamento: lógica errada, caso de erro não tratado, regressão em
   quem consome o código alterado.
2. Segredos, credenciais e restos de depuração (`console.log`, `.only`, código
   comentado).
3. Violações de `.agents/rules/code-standards.md` (arquivo acima de 100 linhas,
   função acima de 30, comentários, mais de 3 parâmetros, números mágicos) e, em
   specs Playwright, de `.agents/rules/e2e-testing.md`.
4. Camada errada, conforme a skill da área (`layered-backend`, `trpc-nextjs`,
   `nextjs-folder-structure`).
5. Comportamento novo sem teste.

Classifique cada achado como **bloqueante** (itens 1 e 2, ou qualquer coisa que
quebre o build) ou **melhoria**, com `arquivo:linha` e a correção proposta.

### Step 2.3 — Fechar a review

- Sem achados: diga isso em uma linha e siga.
- Bloqueantes: corrija antes de continuar. Se a correção mudar comportamento ou
  escopo, confirme com o usuário primeiro.
- Melhorias: liste e pergunte quais entram neste PR; as que ficarem de fora vão
  para `Notes` no corpo do PR.

As correções da review entram nos commits da mudança a que pertencem, e não em
um commit separado de "fix review", já que nada foi commitado ainda.

## Phase 3 — Branch

A base é `main`, salvo instrução diferente do usuário.

Se já estiver em uma branch de trabalho, continue nela.

Se estiver na `main`, crie a branch a partir do estado atual. As mudanças não
commitadas acompanham a troca:

```bash
git switch -c <type>/<slug>
```

Nome da branch: `<type>/<issue>-<slug>` com issue, `<type>/<slug>` sem issue.
`<type>` é o tipo Conventional Commit dominante da mudança e `<slug>` são 2 a 5
palavras em kebab-case, em inglês.

```
feat/42-worktree-provisioning
fix/retry-runtime-form-validation
chore/align-agent-skills
```

Se a `main` local tiver commits que não estão em `origin/main`, eles irão junto
para a nova branch. Avise o usuário: a `main` local continuará à frente da
remota até ele sincronizá-la depois do merge.

## Phase 4 — Planejar e confirmar

Agrupe as mudanças em commits lógicos conforme a Phase 2 de
[quick-commit](../quick-commit/SKILL.md). Depois apresente um plano único, para
uma única confirmação:

- Review: de onde veio (rodada Compozy, sessão ou Step 2.2) e o que ficou de fora.
- Branch: nome e base.
- Commits: tabela com `#`, mensagem e arquivos (incluindo os já existentes na
  branch, marcados como tal).
- Verificações que serão rodadas.
- Título do PR.

Espere a confirmação. Depois dela, execute as Phases 5 a 9 em sequência, sem
novas perguntas, parando só se uma verificação falhar ou o push for rejeitado.

## Phase 5 — Commitar

Execute a Phase 3 de [quick-commit](../quick-commit/SKILL.md) para cada commit:
stage só dos arquivos do commit, conferência com `git diff --cached --stat` e
mensagem com corpo explicando o que mudou e por quê.

## Phase 6 — Verificar

Rode as verificações depois dos commits, para validar exatamente o que será
publicado. Mantenha proporcional à mudança, como define o `AGENTS.md`:

| Mudança | Verificação |
| --- | --- |
| Qualquer código | `pnpm lint` e `pnpm typecheck` |
| `apps/web` | `pnpm --dir apps/web test` |
| `packages/api` | `pnpm --dir packages/api test` e `pnpm --dir packages/api test:integration` |
| Rotas ou configuração de build | `pnpm build` |
| Fluxo visível coberto por spec E2E | apenas o spec afetado |
| Só documentação ou skills | nenhuma |

Confira os scripts do pacote antes de rodar; se um deles não existir, registre
como não executado em vez de improvisar outro comando.

Se algo falhar por causa da mudança, corrija, crie um commit novo com a correção
e rode de novo o que falhou. Se a falha já existia na `main`, mostre a evidência
ao usuário e pergunte se o PR segue com a falha registrada.

## Phase 7 — Push

```bash
git push -u origin <branch>
```

Se o push for rejeitado porque a branch remota andou, pare e mostre a situação
ao usuário. Reescrever o histórico remoto é decisão dele.

## Phase 8 — Abrir o PR

Título: uma linha Conventional Commit com escopo que resuma o PR inteiro. Com um
único commit, reutilize o assunto dele.

```bash
gh pr create --base main --head <branch> --title "<type>(<scope>): <summary>" --body "$(cat <<'EOF'
## Summary

<1 a 3 frases: o que muda e por quê, do ponto de vista de quem revisa>

## Changes

- <mudança relevante, agrupada por área e não por arquivo>

## Verification

- [x] `pnpm lint`
- [x] `pnpm typecheck`
- [ ] `<comando não executado ou falhando>` — <motivo>

## Notes

<riscos, migrações, variáveis de ambiente novas, melhorias da review deixadas de fora, pontos em que o revisor deve olhar com atenção>

Closes #<issue_number>
EOF
)"
```

Regras do corpo:

- `Verification` lista só o que foi de fato executado nesta sessão, com o
  resultado real. Marcar como feito algo que não rodou engana o revisor.
- Omita `Notes` quando não houver nada a dizer e `Closes` quando não houver issue.
- Mudança visual em `apps/web`: descreva em `Notes` onde ver o resultado.
- Use `--draft` quando o usuário pedir rascunho ou quando o PR seguir com
  verificação falhando.

Se já existir PR para a branch, não crie outro: o push já o atualizou. Ajuste o
corpo com `gh pr edit --body` apenas se o escopo mudou.

## Phase 9 — Reportar

Mostre a URL do PR, a branch, os commits (`git log --oneline origin/main..HEAD`)
e o resultado de cada verificação, incluindo as que não rodaram.

```
PR aberto: <url>
Branch feat/42-worktree-provisioning → main, 3 commits.
lint e typecheck passaram; test:integration não foi executado (sem mudança em packages/api).
```

Não faça merge nem apague a branch: isso acontece depois da revisão.

## Reference

- Conventional Commits: https://www.conventionalcommits.org/
- Commits isolados, sem PR: [quick-commit](../quick-commit/SKILL.md)
