---
status: completed
title: Artefatos na tela
type: frontend
complexity: medium
---

# Task 07: Artefatos na tela

## Visão geral
Na aba "Execução no terminal", a seção "Artefatos" lista os documentos que as skills produziram: caminho, skill da última versão, número de versões e horário. Ao abrir um, mostra a versão mais recente como Markdown renderizado, com o HTML cru escapado, e permite escolher versões anteriores pelo teclado. É a parte visível da US-05.

<critical>
- LEIA a spec (`spec.md`: US-05, REQ-045, REQ-046, REQ-024, §7.4, NFR-08, NFR-09, §13 `ArtifactList` + `ArtifactViewer`, §15 `tasks.artifacts.*`, §18 "Renderização") e as regras do projeto (AGENTS.md/CLAUDE.md, `.agents/rules/code-standards.md`, `apps/web/AGENTS.md`, `apps/web/DESIGN.md`). Leia a skill `nextjs-folder-structure` e a documentação atual do `marked` 16 (Context7) sobre renderer e tokens `html`.
- FAÇA UMA MINI-TAREFA POR VEZ, na ordem. Só marque `[x]` depois de rodar o "Pronto quando" dela e ver passar.
- NÃO saia dos arquivos listados sem registrar o motivo no Registro de execução. Nada fora do escopo da spec.
- TESTES JUNTO COM O CÓDIGO: cada mini-tarefa implementa os testes atribuídos a ela.
- Ao começar, mude `status` para `in_progress` (aqui e em `_tasks.md`). Mude para `completed` só quando todas as mini-tarefas estiverem marcadas e os critérios de sucesso tiverem sido comprovados por comando. A revisão contra a spec acontece uma vez, depois de todas as tarefas: não a espere aqui, mas não marque nada que não tenha prova, porque ela vai conferir.
</critical>

## Requisitos
- REQ-045: a tarefa DEVE listar os artefatos com caminho, skill da última versão, número de versões e horário da última. Ao abrir um, DEVE mostrar a versão mais recente como Markdown renderizado e permitir escolher versões anteriores.
- REQ-046 (UI): o motivo da falha ("Maior que 1 MB", "Arquivo não encontrado no clone", "Não foi possível ler o arquivo") aparece no artefato.
- US-05.1: o item se lê "docs/specs/login/spec.md · spec-writer · versão 1", e abri-lo mostra o conteúdo renderizado.
- US-05.2: depois da versão 2, a versão 1 continua acessível.
- NFR-08: lista e seletor de versão funcionam pelo teclado; o conteúdo renderizado mantém a hierarquia de títulos.
- NFR-09: o HTML cru do Markdown é escapado; nenhum script do arquivo roda.
- §7.4 e REQ-024: operadora, membro e admin veem os artefatos e as versões; ninguém edita nem apaga.

## Interfaces
- **Consome:**
  - da task_05: `execution.artifacts` em `tasks.byId` (`{ id; path; skill; versions; updatedAt; lastFailure }`); `tasks.artifacts.list({ projectId, taskId })`; `tasks.artifacts.get({ projectId, taskId, artifactId, version? })`;
  - da task_06: `ExecutionStage({ detail, reader })` e `executionCopy.ts`;
  - `marked` (^16.4.2, já dependência de `apps/web`); `trpc` de `@/lib/trpc/client`.
- **Produz:**
  - `apps/web/src/features/issues/assigned-work/artifactClient.ts`: `fetchArtifactVersions(scope)` e `fetchArtifactContent(scope, { artifactId, version? })`;
  - hook `useArtifactViewer({ projectId, taskId })` em `apps/web/src/features/issues/assigned-work/hooks/useArtifactViewer.ts`, que devolve `{ open(artifactId), selectVersion(version), current, versions, loading, failure }`;
  - `renderArtifactMarkdown(markdown: string): string` em `apps/web/src/features/issues/assigned-work/artifactMarkdown.ts`, com o HTML cru escapado;
  - os componentes `ArtifactList`, `ArtifactViewer` e `ArtifactVersionPicker` em `apps/web/src/features/issues/assigned-work/components/`.

## Mini-tarefas

- [x] **07.1 — Cliente e `ArtifactList`**
  - **Arquivos:**
    - criar `apps/web/src/features/issues/assigned-work/artifactClient.ts`, `apps/web/src/features/issues/assigned-work/artifactCopy.ts` e `apps/web/src/features/issues/assigned-work/components/ArtifactList.tsx`;
    - criar `apps/web/src/features/issues/assigned-work/components/ArtifactList.test.tsx`.
  - **Testes:** V-18a, V-18e
  - **Pronto quando:** `pnpm --dir apps/web exec vitest run src/features/issues/assigned-work/components/ArtifactList.test.tsx` passa.
  - **Nota:** cada item é um `<button>` dentro de uma lista (`<ul aria-label="Artefatos">`), para receber foco e abrir com Enter. Um artefato com `versions: 0` mostra só o caminho e a falha, sem botão de abrir.
- [x] **07.2 — `ArtifactViewer` com Markdown seguro e seletor de versão**
  - **Arquivos:**
    - criar `apps/web/src/features/issues/assigned-work/artifactMarkdown.ts`, `apps/web/src/features/issues/assigned-work/hooks/useArtifactViewer.ts`, `apps/web/src/features/issues/assigned-work/components/ArtifactViewer.tsx` e `apps/web/src/features/issues/assigned-work/components/ArtifactVersionPicker.tsx` (`<select>` rotulado "Versão");
    - criar `apps/web/src/features/issues/assigned-work/artifactMarkdown.test.ts` e `apps/web/src/features/issues/assigned-work/components/ArtifactViewer.test.tsx`.
  - **Testes:** V-18b, V-18c, V-18d
  - **Pronto quando:** `pnpm --dir apps/web exec vitest run src/features/issues/assigned-work/artifactMarkdown.test.ts src/features/issues/assigned-work/components/ArtifactViewer.test.tsx` passa; `pnpm --dir apps/web typecheck` sem erros.
  - **Nota:**
    - no renderer do `marked`, os tokens `html` (bloco e inline) saem como texto escapado;
    - links com `javascript:` saem sem `href`;
    - o resultado é usado com `dangerouslySetInnerHTML` só depois dessa função;
    - os títulos do documento descem um nível abaixo do título do visualizador (`#` → `h3`), para manter a hierarquia da página (NFR-08).
- [x] **07.3 — Seção "Artefatos" na etapa, com visão de membro**
  - **Arquivos:**
    - alterar `apps/web/src/features/issues/assigned-work/components/ExecutionStage.tsx` (seção "Artefatos" com `ArtifactList` e `ArtifactViewer`);
    - alterar `apps/web/src/features/issues/assigned-work/components/ExecutionStage.test.tsx` ou criar `apps/web/src/features/issues/assigned-work/components/ExecutionArtifacts.test.tsx`.
  - **Testes:** V-18f
  - **Pronto quando:** `pnpm --dir apps/web exec vitest run src/features/issues/assigned-work/components/ExecutionArtifacts.test.tsx src/features/issues/assigned-work/components/ExecutionStage.test.tsx` passa; `pnpm --dir apps/web typecheck` sem erros.

## Detalhes de implementação
- **Padrões a espelhar:**
  - cliente tRPC: `apps/web/src/features/issues/assigned-work/terminalClient.ts`;
  - hook com carregamento e falha: `hooks/useWorkDetail.ts`;
  - classes de conteúdo: as do corpo da Issue, onde houver Markdown renderizado na tela. Se não houver, use os tokens de `apps/web/DESIGN.md`.
- **Lista:** vem de `detail.execution.artifacts`, que o polling de 3 s mantém atualizado. As versões e o conteúdo vêm sob demanda, por `tasks.artifacts.list` e `get`, ao abrir um artefato.
- **Texto do item:** `<path> · <skill> · versão <versions>`, mais o horário com `formatMoment`. Com `lastFailure`, acrescente a linha `role="note"` com o motivo.

### Arquivos relevantes
- `apps/web/src/features/issues/assigned-work/components/ExecutionStage.tsx` (task_06): onde a seção entra.
- `apps/web/src/features/issues/assigned-work/executionCopy.ts` (task_06).
- `apps/web/src/test/tasks.ts`: fábrica de `execution.artifacts` (06.1).

### Arquivos afetados
- Os listados nas mini-tarefas.

### Decisões relacionadas
- DEC-13 (§17): o conteúdo vem completo do servidor, sem montar diff.
- §18 "Renderização": HTML cru escapado.

## Premissas
- P-F (`_tasks.md`): os artefatos ficam numa seção "Artefatos" dentro da aba "Execução no terminal".
- O texto "versão N" usa o número da versão mais recente, que é igual à contagem de versões, porque elas são sequenciais (§7.8).

## Testes atribuídos
- [x] V-18a: `artifacts` com `docs/specs/login/spec.md` (spec-writer, 1 versão) e `docs/specs/login/_tasks.md` (spec-to-tasks, 2 versões) → itens "docs/specs/login/spec.md · spec-writer · versão 1" e "docs/specs/login/_tasks.md · spec-to-tasks · versão 2", cada um com horário. Tab e Enter abrem o item focado (US-05.1, REQ-045).
- [x] V-18e: artefato com `lastFailure: "Arquivo não encontrado no clone"` → o motivo aparece junto do item. Com `versions: 0` e `lastFailure: "Maior que 1 MB"` → caminho e motivo, sem ação de abrir (REQ-046).
- [x] V-18b: abrir `spec.md` → mostra a versão mais recente renderizada (`# Spec` vira um título, listas e código formatados), sob um título com o caminho; a hierarquia de títulos não pula níveis (REQ-045, NFR-08).
- [x] V-18c: conteúdo `<script>alert(1)</script>`, `<img src=x onerror=alert(1)>` e `[x](javascript:alert(1))` → os textos aparecem escapados; o DOM não tem `script`, nenhum atributo `on*` e nenhum `href` com `javascript:` (NFR-09).
- [x] V-18d: artefato com 2 versões → o seletor "Versão" começa na 2. Com o teclado (foco, seta para cima, Enter ou `change`), a escolha da 1 busca `get` com `version: 1` e mostra o conteúdo da 1 (US-05.2, NFR-08).
- [x] V-18f: `ExecutionStage` com `reader = true` → a seção "Artefatos" aparece e abre o conteúdo; não há botão de editar, apagar nem renomear, para nenhum papel (§7.4, REQ-024).

## Critérios de sucesso
- Todas as mini-tarefas marcadas, cada uma com o "Pronto quando" executado.
- Todos os testes atribuídos implementados e passando.
- Na aba, a operadora e os membros veem a lista, abrem um artefato renderizado e trocam de versão pelo teclado; nenhum HTML do arquivo roda.
- No fim da tarefa, `pnpm --dir apps/web test` passa.
- `pnpm --dir apps/web typecheck` e `pnpm lint` sem erros; nenhuma regra do AGENTS.md violada.

## Registro de execução
<!-- The implementer appends one entry per mini-task: date, what was done, commands run with their result, deviations. Example:
- 2026-11-22 · 07.1 · lista de artefatos · `vitest run src/features/issues/assigned-work/components/ArtifactList.test.tsx` → 3 passed · sem desvios -->
- 2026-11-22 · 07.1 · `artifactClient`, `artifactCopy`, `ArtifactList` · `vitest run src/features/issues/assigned-work/components/ArtifactList.test.tsx` → 2 passed (V-18a, V-18e) · sem desvios
- 2026-11-22 · 07.2 · `artifactMarkdown` (instância `Marked` própria; HTML cru, imagens e links não seguros escapados; títulos +2 níveis), `useArtifactViewer`, `ArtifactViewer`, `ArtifactVersionPicker` · `vitest run src/features/issues/assigned-work/artifactMarkdown.test.ts src/features/issues/assigned-work/components/ArtifactViewer.test.tsx` → 8 passed (V-18b, V-18c, V-18d); typecheck sem erros · desvios: o mock do tRPC em `src/test/setup.ts` ganhou `tasks.artifacts`; `ArtifactSection` junta lista e visualizador
- 2026-11-22 · 07.3 · seção "Artefatos" em `ExecutionStage` · `vitest run src/features/issues/assigned-work/components/ExecutionArtifacts.test.tsx src/features/issues/assigned-work/components/ExecutionStage.test.tsx` passou (V-18f); typecheck sem erros · sem desvios
- 2026-11-22 · fechamento · `pnpm --dir apps/web test` → 74 files, 354 passed; typecheck e `pnpm lint` sem erros
