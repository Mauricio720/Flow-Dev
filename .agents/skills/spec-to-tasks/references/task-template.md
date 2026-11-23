# `task_NN.md` template

One document per task. It must be self-contained: an agent in a fresh session, with only this file, the spec and the repository, can execute it.

## Frontmatter rules (Compozy-compatible)

- **`status`:** `pending` | `in_progress` | `completed`. Compozy also accepts `done` and `finished` as completed.
- **`title`:** must match the H1.
- **`type`:** one of `[tasks].types` from `.compozy/config.toml`; otherwise `frontend`, `backend`, `docs`, `test`, `infra`, `refactor`, `chore`, `bugfix`.
- **`complexity`:** `low` | `medium` | `high` | `critical`. It rates risk, not size.
- **No other keys.** Dependencies live only in `_tasks.md`.
- **File name:** `task_NN.md`, zero-padded, with no leading underscore.

## Template

```markdown
---
status: pending
title: <Título da tarefa>
type: backend
complexity: medium
---

# Task 02: <Título da tarefa>

## Visão geral
<2–3 frases: que fatia do sistema esta tarefa entrega e por que importa.>

<critical>
- LEIA a spec (e `_tests.md`, se existir) e as regras do projeto (AGENTS.md/CLAUDE.md) antes de começar.
- FAÇA UMA MINI-TAREFA POR VEZ, na ordem. Só marque `[x]` depois de rodar o "Pronto quando" dela e ver passar.
- NÃO saia dos arquivos listados sem registrar o motivo no Registro de execução. Nada fora do escopo da spec.
- TESTES JUNTO COM O CÓDIGO: cada mini-tarefa implementa os testes atribuídos a ela, seguindo a skill de testes do projeto (`software-testing`). Isso quer dizer: asserção sobre o efeito observável e específico, nada de `toBeTruthy` ou de só checar que não lança exceção; valor esperado tirado da spec, nunca recalculado a partir do código; dublês só em dependências lentas, variáveis ou externas; relógio e aleatoriedade controlados. Em bug, reproduza antes de corrigir.
- Ao começar, mude `status` para `in_progress` (aqui e em `_tasks.md`). Mude para `completed` só quando todas as mini-tarefas estiverem marcadas e os critérios de sucesso tiverem sido comprovados por comando. A revisão contra a spec acontece uma vez, depois de todas as tarefas: não a espere aqui, mas não marque nada que não tenha prova, porque ela vai conferir.
</critical>

## Requisitos
- REQ-003: O sistema DEVE … (spec §6)
- NFR-02: …
- Não muda: … (spec §9)

## Interfaces
- **Consome:** <nomes e tipos exatos de código existente ou de tarefas anteriores>
- **Produz:** <assinaturas exatas que outras tarefas usam>

## Mini-tarefas

- [ ] **02.1 — <resultado pequeno e verificável>**
  - **Arquivos:** `caminho/real/a.ts` (criar), `caminho/real/a.test.ts` (criar)
  - **Testes:** V-03a, V-03b
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run src/.../a.test.ts` passa
- [ ] **02.2 — …**
  - **Arquivos:** …
  - **Testes:** V-01a, V-05
  - **Pronto quando:** teste acima passa; `pnpm --dir packages/api typecheck` sem erros
  - **Nota:** <uma linha, só se houver decisão específica deste passo>
- [ ] **02.3 — …**

## Detalhes de implementação
<Padrão a espelhar e pontos de integração. Referencie a spec, não copie.>

### Arquivos relevantes
- `caminho/existente.ts`: <por que importa>

### Arquivos afetados
- `caminho/que/muda.ts`: <o que muda>

### Decisões relacionadas
- DEC-02 (spec §17): <relevância>

## Premissas
<Somente se a spec deixou algo em aberto que afeta esta tarefa. "Nenhuma" caso contrário.>

## Testes atribuídos
<!-- Cenário → resultado esperado (da spec) · fronteira real. Ex.: "V-05: não membro chama comments.list → FORBIDDEN · serviço + Postgres de teste". -->
- [ ] V-03a: <cenário> → <resultado esperado>
- [ ] V-03b: …
- [ ] V-05: …

## Critérios de sucesso
- Todas as mini-tarefas marcadas, cada uma com o "Pronto quando" executado.
- Todos os testes atribuídos implementados e passando.
- <resultado observável 1>
- Typecheck e lint do pacote sem erros; nenhuma regra do AGENTS.md violada.

## Registro de execução
<!-- The implementer appends one entry per mini-task: date, what was done, commands run with their result, deviations. Example:
- 2026-11-22 · 02.1 · criado DAO + testes · `vitest run …/a.test.ts` → 4 passed · sem desvios -->

```
