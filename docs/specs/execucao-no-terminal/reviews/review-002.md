# Revisão de conformidade 002: Abrir a execução no terminal (Spec A)

> **Data:** 2026-11-22 · **Escopo:** feature inteira, rodada depois da [review-001](review-001.md) (REPROVADO). Reconfere as correções e tudo o que elas tocaram · **Intervalo:** mudanças não commitadas sobre `main` (`a7f359e`)
> **Spec:** `docs/specs/execucao-no-terminal/spec.md`, `_tasks.md`, `task_01.md`–`task_07.md`, `v00-spike.md`
> **Regras lidas:** as mesmas da review-001 (`AGENTS.md`, `apps/web/AGENTS.md`, `.agents/rules/code-standards.md`, `.agents/rules/e2e-testing.md`, skills `layered-backend`, `trpc-nextjs` e `nextjs-folder-structure`)
> **Aviso:** a rodada de correções foi feita pelo mesmo agente que faz esta revisão. Para compensar, cada correção foi relida como código de terceiros, e os testes novos foram conferidos por mutação: com a correção desligada, eles falham.

## Veredito: APROVADO COM RESSALVAS (depende de você aceitar)

O bloqueante foi resolvido, e os achados de código importantes também. Todas as verificações automáticas passam, inclusive o `pnpm build`, que a review-001 não tinha rodado. Ficam dois itens importantes que não são defeito do código implementado e dependem de você:
- o smoke V-10b pela UI, que só você pode fazer e é item da Definição de pronto;
- a mudança de `board_missing`, fora do escopo da spec, que parece sua.

Pela regra do `_tasks.md`, a feature só fica pronta quando você fizer o smoke ou aceitar a ressalva. Enquanto isso, ela não está pronta.

| Bloqueante | Importante | Menor | Spec a discutir |
|---|---|---|---|
| 0 | 2 | 2 | 4 |

## Verificação executada

O working tree não mudou depois da rodada de verificação feita ao fim das correções (`find -newer` sem resultados). Por isso, aqueles resultados valem como evidência desta sessão.

| Comando | Saída | Resultado |
|---|---|---|
| `pnpm typecheck` | exit 0 | ✅ |
| `pnpm lint` | exit 0 | ✅ |
| `pnpm --dir packages/api test` | 86 arquivos, 564 passed | ✅ |
| `pnpm --dir packages/api test:integration` (sem `TEST_DATABASE_URL`) | 78 arquivos, 461 passed | ✅ |
| `pnpm --dir apps/web test` | 66 arquivos, 323 passed | ✅ |
| `pnpm build` | exit 0 · "Compiled successfully"; rotas `ƒ /api/terminal-attachments` e `ƒ /api/terminal-attachments/[attachmentId]` | ✅ |
| Teste de mutação dos testes novos | com o descarte e a soma de bytes desligados, B-1 (fechar descarta) e I-1 falham; restaurado em seguida | ✅ |
| `scan_diff.py --worktree --max-lines 100` | sem dependências novas; nenhum arquivo novo da feature acima de 100 linhas; arquivos longos restantes: ver M-2 | ✅ |
| `pnpm --dir apps/web test:e2e terminal-execution.spec.ts` | **não executado**: exige banco descartável e servidor com as variáveis de e2e; o V-10a continua `test.fixme` | ⚠️ sem evidência própria |

**Correção da review-001:** o build não tinha sido rodado "por causa do `next dev`". Isso estava errado. A documentação do Next 16 diz: "Development builds output to `.next/dev` instead of `.next`. This allows you to run `next dev` and `next build` concurrently without conflicts" (`apps/web/node_modules/next/dist/docs/01-app/03-api-reference/06-cli/next.md:60`). Nesta rodada, o build rodou com o seu servidor de dev no ar, e o servidor continuou rodando.

## Achados da review-001: situação

| Achado | Situação | Evidência |
|---|---|---|
| **B-1** Anexos de um diálogo fechado bloqueavam a próxima abertura | ✅ Resolvido | `hooks/useStagingCleanup.ts:19-26`: no desmonte sem `commit`, apaga cada upload em staging; `attachmentUploadRunner.ts:14`: um envio que termina depois do fechamento também é descartado; `TerminalLaunchDialog.tsx:33`: `commit()` só depois de abrir com sucesso. Testes: `TerminalLaunchStaging.test.tsx` ("discards… when the dialog closes", "keeps… when the session opens") e `terminal-attachments.test.ts` (depois do `remove`, o mesmo conteúdo e a vaga voltam) |
| **I-1** 30 MB com as imagens da Issue só na confirmação | 🟡 Resolvido no envio; sobra no checkbox | `useTerminalAttachments.ts:11` reserva quantidade e bytes das imagens marcadas; `terminalAttachmentModel.ts` (`limitBreach`) recusa no item com "Os anexos passariam de 30 MB." · teste I-1 em `TerminalLaunchStaging.test.tsx`. Sobra: ver M-1 |
| **I-2** V-10a desligado e V-10b fora da UI | 🟡 Parcial | O corpo do `test.fixme` agora cobre o roteiro inteiro (`e2e/terminal-execution.spec.ts:74-95`, helpers em `e2e/fixtures/terminalLaunch.ts`: registro antigo apagado, prompt exato, 2 linhas de anexos, `contexto/anexos` e `contexto/skills`). O smoke V-10b pela UI **continua não feito** (`v00-spike.md:84`). Ver I-1 abaixo |
| **I-3** Funções acima de 30 linhas e mais de 3 parâmetros | ✅ Resolvido | `useTerminalLaunch.ts` dividido em `usePreflight` e no hook principal; `useAttachmentUploads.ts` com 41 linhas no total e o envio em `attachmentUploadRunner.ts`; rodapé extraído para `TerminalLaunchFooter.tsx`; `LocalCheckoutService({ … })`, `persist({ … })`, `createTasksRouter(…, …, { planning, terminal })`. Nova varredura: nenhuma função da feature acima de 30 linhas, e os sinais restantes de "parâmetros" são objetos desestruturados |
| **I-4** Arquivos acima de 100 linhas | ✅ Resolvido nos arquivos que esta mudança tinha feito passar do limite; sobra nos legados | `AssignedWork.test.tsx` voltou a 98, `issue-deletion-purge.test.ts` a 73 (o V-11a foi para `issue-deletion-terminal.test.ts`, com 44 linhas), e `issue-deletion-support.ts` caiu de 117 para 105. Sobra: ver M-2 |
| **I-5** `board_missing` fora do escopo | ⏸ Não alterado, de propósito | Tem teste próprio (agora em `QueueBoardMissing.test.tsx`) e parece edição sua. Ver I-2 abaixo |
| **M-1** ORM fora do DAO | ✅ Resolvido | `terminalTaskFilesPurger.ts` usa `TerminalTaskFilesDao` (`sessionIdsOfTask`, `stagedFilesOfTask`), implementado em `drizzleTerminalAttachmentDao.ts:53-61` |
| **M-2** Constantes duplicadas e literal mágico | ✅ Resolvido | `CLAUDE_BINARY` e `TERMINAL_BINARY` em `application/terminal/terminalLauncher.ts`; `UUID_PATTERN` em `application/terminal/uuidPattern.ts`, usado pelos três arquivos da feature; `PRIVATE_FILE_MODE` em `fileSessionContextBuilder.ts:10` |

## Conformidade com a spec

Os itens que as correções não tocaram continuam como na review-001 (✅), e a suíte completa passou de novo. Mudaram:

| Item | Status | Evidência |
|---|---|---|
| §7.6 "Repetido", US-04.2, REQ-035 | ✅ (era ❌) | B-1 resolvido |
| REQ-030 | 🟡 (era 🟡) | O envio que estoura é recusado no item; marcar de novo uma imagem da Issue continua sem limite na UI (M-1). A confirmação recusa com a mensagem certa |
| REQ-032, NFR-05 | ✅ | O rodapé extraído mantém a confirmação bloqueada no envio, `Cancelar` escondido durante a abertura e Esc bloqueado quando ocupado (`TerminalLaunchFooter.tsx:9-15`, `TerminalLaunchDialog.tsx:29`). Os testes V-14c e V-09 continuam passando |
| REQ-025, V-11a | ✅ | Teste movido, mesmo conteúdo, passando (`issue-deletion-terminal.test.ts`); o purger agora usa DAO |
| REQ-001–004 | ✅ | `LocalCheckoutService` com objeto de dependências; `local-checkout.test.ts` passando |
| V-10a | 🟡 | Roteiro completo no `fixme`, que ainda não roda (S-1) |
| V-10b, §24 "Smoke V-10 real feito uma vez pela UI" | 🟡 | Não feito. Ver I-1 |
| §24 "`pnpm build` passando" | ✅ (era sem evidência) | Build com exit 0 nesta sessão |
| Fora de escopo | ⛔ | `board_missing` (I-2) |

## Regras do projeto

| Regra (fonte) | Status | Evidência |
|---|---|---|
| Sem comentários (`code-standards.md:5`) | ✅ | O scanner não acusou comentários |
| `.ts` com até 100 linhas (`code-standards.md:39`) | 🟡 | Os arquivos da feature estão dentro do limite; os legados crescem 2 linhas cada (M-2) |
| Funções com até 30 linhas (`code-standards.md:82`) | ✅ | Nova varredura limpa nos arquivos da feature |
| Até 3 parâmetros (`code-standards.md:154`) | ✅ | Os três casos foram convertidos para objeto |
| Sem números e textos mágicos (`code-standards.md:223`) | ✅ | `NOTE_SIZE_LABEL`, `ATTACHMENTS_SECTION_SEPARATOR`, `MAX_ATTACHMENTS_TOTAL_BYTES`, `PRIVATE_FILE_MODE` |
| ORM só em DAOs (`layered-backend` SKILL.md:38) | ✅ | M-1 resolvido |
| E2E: localizadores acessíveis e estado próprio (`e2e-testing.md`) | ✅ | O corpo novo do V-10a usa `getByRole`/`getByLabel`, apaga o registro anterior do lançador e limpa o clone |
| Verificação completa no fim (`AGENTS.md:33-39`) | 🟡 | Tudo confirmado, menos o e2e |

## Achados

### I-1 (Importante) — Smoke V-10b pela UI ainda não feito, embora marcado `[x]`
- **Onde:** `docs/specs/execucao-no-terminal/v00-spike.md:84` ("o disparo não passou pelos cliques da interface"); `task_07.md`, V-10b `[x]`.
- **Contra:** spec §24 ("Smoke V-10 real feito uma vez pela UI") e §23 V-10.
- **Problema:** é o único ponto do fluxo que nada exercitou de ponta a ponta: a tela do trabalho, o diálogo, o upload multipart, a mutation e o terminal real. O e2e não alcança esse ponto por causa da verificação do GitHub (S-1), mas na sua máquina o fluxo é viável.
- **Correção esperada:** você faz o roteiro uma vez pela UI, com rota Tech Spec, PDF e print anexados, o terminal aberto e o Claude descrevendo os anexos, e a observação vai para `v00-spike.md` ("Smoke V-10b"). Também vale fechar o diálogo uma vez com um anexo enviado e reabrir, que confirma o B-1 no navegador. Se preferir aceitar o risco, registre o aceite.

### I-2 (Importante) — `board_missing`: mudança fora do escopo ainda misturada à feature
- **Onde:** `apps/web/src/features/issues/assigned-work/components/QueueNotices.tsx:10-31`, `workReasons.ts:17`, `ReadyQueue.tsx:24`, `components/QueueBoardMissing.test.tsx`.
- **Contra:** spec §4 e a regra "Nada fora do escopo da spec" das tasks.
- **Problema:** não é um defeito. É um comportamento sem requisito nesta spec, que vai entrar no mesmo pacote se não for separado.
- **Correção esperada:** decidir. Se a mudança for sua e desejada, vai para um commit próprio, com `QueueBoardMissing.test.tsx`. Se não for, sai.

### M-1 (Menor) — Marcar de novo uma imagem da Issue ignora os limites na UI
- **Onde:** `apps/web/src/features/issues/assigned-work/hooks/useIssueImageSelection.ts:10-13`: `toggle` marca sem conferir quantidade nem bytes.
- **Contra:** REQ-030 ("recusar o anexo que estoura", contando as imagens marcadas).
- **Problema:** com 10 arquivos enviados, ou com 25 MB de uploads, marcar uma imagem passa do limite sem aviso, e o erro só aparece na confirmação ("Limite de 10 arquivos por abertura." ou "Os anexos passariam de 30 MB."). Desmarcar resolve. A review-001 apontou esse caminho no texto do I-1, mas o prompt de correção cobriu só o envio.
- **Correção esperada:** `toggle` recusa marcar quando `limitBreach` acusa estouro, mostrando a mensagem do limite junto às imagens. Teste com uploads perto do limite e uma imagem desmarcada.

### M-2 (Menor) — Arquivos legados acima de 100 linhas cresceram 2 linhas cada
- **Onde:** `issueDeletionWorker.ts` (200 → 202), `schema.ts` (125 → 127), `test/issue-deletion-support.ts` (103 → 105; tinha chegado a 117 antes das correções).
- **Contra:** `code-standards.md:39`.
- **Problema:** é dívida anterior à feature. A integração custou 2 linhas por arquivo.
- **Correção esperada:** aceite registrado, ou divisão desses arquivos numa tarefa própria.

## Atualizações de spec a discutir

Iguais às da review-001, sem mudança na spec desde então:
- **S-1:** aceitar `terminal-execution-flow.test.ts` como V-10a, porque o e2e de navegador depende de GitHub controlado; o `fixme` fica com o roteiro completo.
- **S-2:** texto desatualizado depois do spike:
  - `contexto/.claude/skills/` e "move os anexos" na §12 e na §16;
  - `/spec-to-tasks` na §7.7;
  - `/direct-executor` na §23 V-02;
  - `{ reason }` na §15.
- **S-3:** a REQ-012 e a §20 não citam `terminal_disabled` (Q-01).
- **S-4:** um vínculo salvo que ficou inválido aparece no diálogo como "ainda não vinculou".

## Divergências entre o relatório do implementador e a evidência
- Continuam valendo as da review-001 que dependem dos registros das tasks:
  - V-10b marcado `[x]` sem smoke pela UI;
  - a 07.2 diz que atualizou a REQ-012 e a §20, e não atualizou.
- A rodada de correções não foi anotada nos "Registros de execução" das tasks (`task_05`/`task_06`/`task_07`). Esta revisão e a resposta da rodada de correções são o único registro dela.
- A afirmação de que `pnpm build` passou, feita na 07.2, agora está **confirmada**.

## Prompt de correção

> Itens restantes, nesta ordem. Os dois primeiros são decisões ou ações da pessoa usuária:
> 1. **I-1:**
>    - A pessoa usuária faz o smoke V-10b pela UI: rota Tech Spec, PDF e print, terminal aberto, o Claude descreve os anexos. Inclua fechar e reabrir o diálogo com um anexo enviado.
>    - Registre a observação em `docs/specs/execucao-no-terminal/v00-spike.md`, seção "Smoke V-10b", com data.
>    - Sem esse registro, o V-10b continua pendente.
> 2. **I-2:** separe as mudanças de `board_missing` (`QueueNotices.tsx`, `ReadyQueue.tsx`, `workReasons.ts`, `QueueBoardMissing.test.tsx`) num commit próprio, ou retire-as.
> 3. **M-1:**
>    - Em `hooks/useIssueImageSelection.ts`, `toggle` recebe o uso atual (quantidade e bytes dos uploads ativos) e recusa marcar quando `limitBreach` acusa estouro, com a mensagem do limite num `role="status"` junto às imagens.
>    - Teste de componente com 10 uploads e uma imagem desmarcada.
> 4. **S-1 a S-4:** se aceitas, atualize a spec (§7.7, §12, §15, §16, §20, §23, REQ-012) e o Histórico.
>
> Restrições: as mesmas da review-001 (sem comentários, arquivos com até 100 linhas, funções com até 30, até 3 parâmetros, sem números mágicos).
>
> Depois do item 3, rode e mostre a saída de:
> - `pnpm --dir apps/web exec vitest run src/features/issues/assigned-work`;
> - `pnpm --dir apps/web test`;
> - `pnpm typecheck`;
> - `pnpm lint`.
