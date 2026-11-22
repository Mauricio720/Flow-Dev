# Conformance report template

Write in the user's language; Portuguese headings below. Save as `<spec-dir>/reviews/review-NNN.md`, using the next free number.

```markdown
# Revisão de conformidade NNN: <feature ou tarefa>

> **Data:** AAAA-MM-DD · **Escopo:** <feature inteira | tarefa T0X | mudanças não commitadas> · **Intervalo:** `<base>...<head>`
> **Spec:** <caminho(s)> · **Regras lidas:** <AGENTS.md, apps/web/AGENTS.md, .agents/rules/code-standards.md, skills obrigatórias…>

## Veredito: REPROVADO | APROVADO COM RESSALVAS | APROVADO

<2–3 lines: the decisive reason. E.g. "2 requisitos ausentes (REQ-004, REQ-007), testes de autorização ocos e 3 arquivos acima do limite de 100 linhas.">

| Bloqueante | Importante | Menor | Spec a discutir |
|---|---|---|---|
| 2 | 3 | 1 | 1 |

## Verificação executada

| Comando | Saída | Resultado |
|---|---|---|
| `pnpm --dir packages/api exec vitest run src/...` | exit 0 · 24 passed | ✅ |
| `pnpm --dir apps/web typecheck` | exit 2 · 3 errors (first: …) | ❌ |
| `scan_diff.py --base main --max-lines 100` | 4 hints, 2 confirmed | — |

<If something could not run: what and why. Never mark it as passing.>

## Conformidade com a spec

| Item | Status | Evidência |
|---|---|---|
| REQ-001 | ✅ | `path/file.ts:42` · teste `file.test.ts › "cria comentário"` |
| REQ-004 | ❌ | Nenhum caminho de código trata a edição após 15 min |
| US-02 cen. 2 | 🟡 | Implementado em `x.ts:88`; sem teste |
| Não muda #1 | ✅ | `deletionPurge.ts:30` inclui a tabela nova; `UT-024` cobre |
| DEC-02 | 🔀 | Spec: polling 15 s; código: websocket (`useComments.ts:12`) |
| Fora de escopo | ⛔ | Menções `@usuário` adicionadas (`CommentBody.tsx:20`), não pedidas |

## Regras do projeto

| Regra (fonte) | Status | Evidência |
|---|---|---|
| Máx. 100 linhas por `.ts` (`.agents/rules/code-standards.md:45`) | ❌ | `commentsService.ts` 180 linhas; `commentsDao.ts` 131 |
| Sem comentários no código (`code-standards.md:5`) | ✅ | |
| Autorização junto aos dados (`AGENTS.md:…` / spec NFR-02) | ❌ | `comments.list` sem checagem no DAO |

## Achados

### B-1 (Bloqueante) — <título curto>
- **Onde:** `path:line` — "<trecho curto>"
- **Contra:** REQ-004 / `AGENTS.md:14`
- **Problema:** <o que está errado e por que importa>
- **Correção esperada:** <o resultado certo, não o código>

### I-1 (Importante) — …

### M-1 (Menor) — …

## Atualizações de spec a discutir
- <onde o código parece certo e a spec deveria mudar, ou onde a spec era ambígua>

## Divergências entre o relatório do implementador e a evidência
- <claim> → <what the evidence shows>   <!-- or "nenhuma" -->

## Prompt de correção

> Corrija, nesta ordem, sem alterar nada fora do listado:
> 1. **B-1** — `path`: <resultado esperado> (REQ-004). Teste: <caso que deve existir/passar>.
> 2. **I-1** — …
>
> Restrições: <regras relevantes, ex.: arquivos ≤ 100 linhas, sem comentários, sem novas dependências>.
> Ao terminar, rode e mostre a saída de: `<comando 1>`, `<comando 2>`. Não marque como concluído sem essa saída.
```

## Severity guide

- **Bloqueante:** blocks merge.
  - A requirement in scope is ❌.
  - A "não muda" item is broken.
  - A security, authorization or data-integrity risk.
  - A failing verification command.
  - A disabled or hollow test covering spec behavior.
  - Behavior that contradicts the spec in a user-visible way.
- **Importante:** fix before merge unless the user accepts the risk.
  - A 🟡 item.
  - A 🔀 divergence from a DEC.
  - An unrequested dependency or feature.
  - A rule violation with real maintenance impact (layering, file limits, placement).
- **Menor:** convention or clarity problems that do not affect behavior.
- **Spec a discutir:** not a defect. The code may be right and the spec outdated, or the spec was ambiguous.
