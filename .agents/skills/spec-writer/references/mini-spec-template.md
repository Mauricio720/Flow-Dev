# Mini-spec template (L2)

Use this for changes that are local but carry real risk: a bug with regression risk or an unclear root cause, or a small feature that touches permissions or data. It fits in a PR description or an issue. **Budget: about 700 words.** If you need more, the work is probably L3.

Headings are in Portuguese; translate them when writing in another language.

```markdown
# Mini-spec: <título>

> **Data:** AAAA-MM-DD · **Nível:** L2 · **Onde:** <arquivos/telas principais>

## Problema
<2–4 linhas: o que acontece hoje, para quem, e evidência (arquivo:linha, passo para reproduzir). Para bug com causa incerta: as 1–3 hipóteses, em ordem de verificação.>

## Comportamento desejado
- **REQ-001:** QUANDO …, o sistema DEVE …
- **REQ-002:** SE …, ENTÃO o sistema DEVE …

## Comportamento que não muda
- QUANDO …, o sistema DEVE CONTINUAR A …

## Critérios de aceite
1. **Dado** …, **quando** …, **então** …
2. …
<!-- For a bug: scenario 1 is the reproduction, which must fail before the fix and pass after. -->

## Verificação
- <test file and the case to add or update, by level; automated only, the user does manual testing after the work is done>
- <real commands: e.g. `pnpm --dir apps/web exec vitest run <file>`, typecheck>

## Em aberto
- **Q-01:** <pergunta> — **Sugestão:** <resposta>   <!-- or "nenhum" -->
```
