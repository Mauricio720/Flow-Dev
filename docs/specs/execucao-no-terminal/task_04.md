---
status: completed
title: Anexos no servidor
type: backend
complexity: high
---

# Task 04: Anexos no servidor

## Visão geral
Entrega o lado servidor dos anexos (US-04):
- validação de tipo e assinatura (§7.6);
- staging em disco com nomes gerados;
- route handlers de envio e remoção;
- imagens da Issue no `preflight`;
- entrega dos anexos na pasta da sessão, com a seção "Anexos" no `open`;
- limpeza de 24 h e de 7 dias;
- expurgo na exclusão da Issue.

O Claude passa a receber imagens, PDFs e textos por caminho local.

<critical>
- LEIA a spec (`spec.md`, US-04, REQ-025, REQ-027 a REQ-033, REQ-035, §7.5, §7.6, §14 `task_terminal_attachments`, §15 "Anexos", §16 "Anexar" e "Limpeza", §17 DEC-09 e DEC-10, §18 "Anexos", §19, B-12 a B-15, NFR-06) e as regras do projeto (AGENTS.md/CLAUDE.md, `.agents/rules/code-standards.md`) antes de começar. Leia as skills `layered-backend` e `trpc-nextjs`; para os route handlers, leia também `nextjs-folder-structure` e `apps/web/AGENTS.md`.
- FAÇA UMA MINI-TAREFA POR VEZ, na ordem. Só marque `[x]` depois de rodar o "Pronto quando" dela e ver passar.
- NÃO saia dos arquivos listados sem registrar o motivo no Registro de execução. Nada fora do escopo da spec: a UI dos anexos é da task_06.
- TESTES JUNTO COM O CÓDIGO: cada mini-tarefa implementa os testes atribuídos a ela.
- Testes de disco usam `mkdtemp` como `XDG_STATE_HOME`; nunca gravam em `~/.local/state`.
- Ao começar, mude `status` para `in_progress` (aqui e em `_tasks.md`). Mude para `completed` só quando todas as mini-tarefas estiverem marcadas e os critérios de sucesso tiverem sido comprovados por comando. A revisão contra a spec acontece uma vez, depois de todas as tarefas: não a espere aqui, mas não marque nada que não tenha prova, porque ela vai conferir.
</critical>

## Requisitos
- REQ-025: QUANDO a Issue for excluída do Flow Dev, o sistema DEVE excluir junto as sessões e os anexos da tarefa, tanto os registros quanto os arquivos.
- REQ-027 (servidor): o envio aceita os tipos da §7.6.
- REQ-028 (servidor): o `preflight` DEVE listar as imagens da Issue publicada como anexos já marcados, na ordem em que aparecem no corpo.
- REQ-029: SE um arquivo for de tipo não aceito, ou o conteúdo não corresponder ao tipo, ENTÃO o sistema DEVE recusá-lo com a mensagem da §7.6, sem afetar os demais.
- REQ-030: SE um anexo passar de 10 MB, ou a abertura passar de 10 arquivos ou de 30 MB somados (contando as imagens da Issue marcadas), ENTÃO o sistema DEVE recusar o anexo que estoura e dizer qual limite.
- REQ-031: QUANDO a pessoa confirmar, o sistema DEVE entregar os anexos marcados como arquivos locais que o Claude pode ler e acrescentar ao fim do prompt a seção "Anexos" da §7.3.
- REQ-033: O sistema DEVE apagar os arquivos dos anexos 7 dias depois do último sinal da sessão (nesta spec, o sinal é a abertura: `last_signal_at`).
- REQ-035: SE a pessoa fechar o diálogo sem abrir a sessão, ENTÃO o sistema DEVE descartar os anexos enviados em até 24 h.
- §7.6, mensagens exatas:
  - "Tipo não aceito. Envie imagens (PNG, JPEG, GIF, WebP), PDF ou arquivos de texto.";
  - "Arquivo maior que 10 MB.";
  - "Limite de 10 arquivos por abertura.";
  - "Os anexos passariam de 30 MB.";
  - "Este arquivo já está anexado." (mantém o primeiro).
- §7.5: nome original de 1 a 255 caracteres.
- NFR-06: os anexos DEVEM ser gravados com nomes gerados pelo sistema, numa pasta fora do clone, legível só pelo dono (`0600` para arquivos, `0700` para pastas). Só a pessoa operadora da tarefa pode enviá-los.
- B-12: Issue com mais de 10 imagens → as 10 primeiras vêm marcadas (`preselected: true`), as demais desmarcadas.
- B-13: nome com acentos, espaços, `../` ou `/` → gravado com nome gerado e seguro; o nome original aparece no prompt.
- B-14: depois dos 7 dias, os anexos não existem mais.
- B-15: uma imagem da Issue que some entre o diálogo e a confirmação → a sessão abre sem ela, e `unavailableIssueImages` conta quantas faltaram.
- §18: o `open` só aceita ids de anexos da mesma pessoa e da mesma tarefa, ainda em staging.
- Não muda (§9), NM-07: as imagens do composer continuam guardadas e publicadas como hoje; a abertura só lê `task_images`.
- §19:
  - OBS-04: log `[terminal] attachment_rejected` com motivo, tipo e tamanho, sem o nome;
  - OBS-05: log `[terminal] cleanup` com quantos arquivos e pastas foram removidos.

## Interfaces
- **Consome (task_02):** schema `taskTerminalAttachments` e `taskTerminalSessions`.
- **Consome (task_03):**
  - `TerminalSessionController.preflight` e `.open`;
  - `appendAttachmentsSection(prompt, attachments: PromptAttachment[])`, com `PromptAttachment = { name; contentType; path }`;
  - `SessionContextBuilder.prepare(sessionId)` → `{ sessionDir, contextDir, attachmentsDir }`;
  - `terminalSessionsRoot(env)`;
  - os motivos `attachment_missing` e `attachment_limit` em `TaskError`.
- **Consome (existente):**
  - `TaskImageDao.find`, `.content` e `.forTask` (`packages/api/src/application/database/dao/taskImageDao.ts`);
  - `imageReferenceIds(body)` e `IMAGE_EXTENSIONS` (`packages/api/src/application/services/tasks/taskImageRules.ts`);
  - `sameOrigin`, `sessionActor` e `readBodyWithinLimit` (`apps/web/src/lib/http/taskImageRoute.ts`, `apps/web/src/lib/http/requestBodyLimit.ts`);
  - `CLEANUP_STEPS` (`packages/api/src/infra/database/dao/issue-deletion/deletionPurge.ts`).
- **Produz** (usado pelas tasks 06 e 07):
  - `packages/api/src/application/services/terminal/attachmentRules.ts`:
    - `MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024`, `MAX_ATTACHMENTS = 10`, `MAX_ATTACHMENTS_TOTAL_BYTES = 30 * 1024 * 1024`, `MAX_ATTACHMENT_NAME_LENGTH = 255`;
    - `classifyAttachment(input: { name: string; content: Uint8Array }): { ok: true; contentType: string; extension: string } | { ok: false; reason: "attachment_type_rejected" | "attachment_too_large" }`;
    - `safeAttachmentName(index: number, originalName: string, extension: string): string`, no formato `NN-<nome-seguro>.<ext>`, só `[a-z0-9-]`.
  - `packages/api/src/application/terminal/attachmentFileStore.ts`, interface `AttachmentFileStore`:
    - `writeStaged(userId, content): Promise<string>` (devolve o `stored_name` gerado);
    - `readStaged(userId, storedName)`;
    - `removeStaged(userId, storedName)`;
    - `moveToSession(input: { userId; storedName; attachmentsDir; targetName })`;
    - `writeSessionFile(attachmentsDir, targetName, content)`;
    - `removeSessionDir(sessionId)`.
  - `packages/api/src/application/database/dao/terminalAttachmentDao.ts`, interface `TerminalAttachmentDao`:
    - `stage(input)`, que devolve a linha, `"duplicate"` ou `"limit"`;
    - `findStaged(userId, taskId, ids)`;
    - `remove(userId, id)`;
    - `linkToSession(...)`;
    - `staleStaged(before)`, `staleSessions(before)` e `markFilesRemoved(sessionId)`.
  - `packages/api/src/application/services/terminal/terminalAttachmentService.ts`: `class TerminalAttachmentService` com `upload(actor, { projectId, taskId, name, content })`, `remove(actor, id)` e `cleanup(now: Date)`.
  - HTTP:
    - `POST /api/terminal-attachments` (multipart: `projectId`, `taskId`, `file`) devolve `201 { id, name, contentType, byteSize }`;
    - `DELETE /api/terminal-attachments/:attachmentId` devolve `204`;
    - erros `{ reason }` com `attachment_type_rejected | attachment_too_large | attachment_limit | attachment_duplicate | operator_required | session_required | origin_denied`. O body da resposta de erro inclui `message` com o texto da §7.6.
  - `tasks.terminal.preflight` passa a devolver `issueImages: Array<{ id: string; name: string; contentType: string; byteSize: number; preselected: boolean }>`; `tasks.terminal.open` passa a devolver `unavailableIssueImages` real.

## Mini-tarefas

- [x] **04.1 — Regras puras de tipo, assinatura, tamanho e nome seguro**
  - **Arquivos:** criar `packages/api/src/application/services/terminal/attachmentRules.ts`, `packages/api/src/application/services/terminal/attachmentSignatures.ts` e `packages/api/src/application/services/terminal/attachmentRules.test.ts`
  - **Testes:** V-12a, V-12b, V-12c, V-12d, V-12h
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run src/application/services/terminal/attachmentRules.test.ts` passa.
  - **Nota:**
    - as assinaturas são PNG `89 50 4E 47 0D 0A 1A 0A`, JPEG `FF D8 FF`, GIF `GIF87a`/`GIF89a`, WebP `RIFF????WEBP` e PDF `%PDF`;
    - o texto é aceito pelas extensões da §7.6, com `new TextDecoder("utf-8", { fatal: true })` e sem byte `0x00`;
    - o tipo final vem do conteúdo, não da extensão: um `.png` com conteúdo de PDF é recusado.
- [x] **04.2 — File store, DAO e serviço de envio**
  - **Arquivos:**
    - criar `packages/api/src/application/terminal/attachmentFileStore.ts` e `packages/api/src/infra/terminal/diskAttachmentFileStore.ts`;
    - alterar `packages/api/src/infra/terminal/terminalStateRoot.ts` (`terminalStagingRoot(env)` → `<state>/flow-dev/terminal-staging`);
    - criar `packages/api/src/application/database/dao/terminalAttachmentDao.ts` e `packages/api/src/infra/database/dao/terminal/drizzleTerminalAttachmentDao.ts`;
    - criar `packages/api/src/application/services/terminal/terminalAttachmentService.ts` e `packages/api/src/application/services/terminal/terminalAttachmentErrors.ts`;
    - alterar `packages/api/src/infra/terminalComposition.ts`;
    - criar `packages/api/test/terminal-attachments.test.ts`.
  - **Testes:** V-12e, V-12f, V-12g, V-12k
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/terminal-attachments.test.ts` passa; `pnpm --dir packages/api typecheck` sem erros.
  - **Nota:**
    - O serviço confere a operadora com `WorkAuthorization.requireOperate` e o planejamento `approved`, e só então aplica `classifyAttachment`.
    - Depois calcula o `sha256` e chama `dao.stage`, que conta o staging da pessoa na tarefa: até 10 arquivos e 30 MB somados.
    - O arquivo só é gravado (`0600`, numa pasta `0700`) depois que a linha é aceita. Se a gravação falhar, a linha é removida.
- [x] **04.3 — Route handlers `/api/terminal-attachments`**
  - **Arquivos:**
    - criar `apps/web/src/app/api/terminal-attachments/route.ts` e `apps/web/src/app/api/terminal-attachments/[attachmentId]/route.ts`;
    - criar `apps/web/src/lib/http/terminalAttachmentRoute.ts`;
    - criar `packages/api/src/controllers/terminalAttachmentController.ts`;
    - criar `packages/api/test/terminal-attachment-routes.test.ts`.
  - **Testes:** V-12i
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/terminal-attachment-routes.test.ts` passa; `pnpm --dir apps/web typecheck` sem erros.
  - **Nota:**
    - espelhe `apps/web/src/app/api/task-images/route.ts` e `[imageId]/route.ts`: `sameOrigin`, depois `readBodyWithinLimit` (10 MB + 64 KB de folga do multipart), depois `sessionActor`, depois o controller;
    - siga o teste existente que importa route handlers pelo alias `@` (`packages/api/test/task-images.test.ts`);
    - o log OBS-04 fica no controller.
- [x] **04.4 — Imagens da Issue no `preflight`**
  - **Arquivos:**
    - criar `packages/api/src/application/services/terminal/issueImageSelection.ts` e `packages/api/src/application/services/terminal/issueImageSelection.test.ts`;
    - alterar `packages/api/src/controllers/terminalSessionController.ts` e `packages/api/src/infra/database/dao/tasks/drizzleTaskImageDao.ts` (se faltar leitura em lote por ids com `byte_size`);
    - criar `packages/api/test/terminal-issue-images.test.ts`.
  - **Testes:** V-13a, V-13b
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run src/application/services/terminal/issueImageSelection.test.ts` e `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/terminal-issue-images.test.ts` passam.
  - **Nota:**
    - os ids vêm de `imageReferenceIds(snapshot.bodyMarkdown)`, sem repetição, na ordem do texto, filtrados pelas `task_images` da tarefa;
    - o nome é o texto alternativo da imagem, ou `imagem-<n>.<ext>` se ele estiver vazio;
    - `preselected` é verdadeiro para as 10 primeiras.
- [x] **04.5 — `open` com anexos e imagens da Issue**
  - **Arquivos:**
    - alterar `packages/api/src/controllers/terminalSessionController.ts` e `packages/api/src/infra/database/dao/terminal/drizzleTerminalSessionDao.ts` (ligação na mesma transação da sessão);
    - criar `packages/api/src/application/services/terminal/sessionAttachmentDelivery.ts`;
    - criar `packages/api/test/terminal-open-attachments.test.ts`.
  - **Testes:** V-13c, V-13d, V-13e, V-13g, V-13h, V-11b
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/terminal-open-attachments.test.ts test/terminal-open.test.ts` passa.
  - **Nota:** a sequência (§16, passos 4 e 5) é:
    1. Antes da transação, o servidor valida que todos os `attachmentIds` estão em staging, são da pessoa e da tarefa (senão, `attachment_missing`) e que o total, com as imagens da Issue marcadas, cabe nos limites (senão, `attachment_limit`).
    2. Na transação, cria a sessão, liga os uploads (`session_id`) e cria linhas `origin = issue_image` para as imagens ainda existentes.
    3. Depois do `prepare`, move os uploads e escreve as imagens da Issue em `contexto/anexos/` com `safeAttachmentName`, na ordem: imagens da Issue primeiro, depois os uploads na ordem enviada.
    4. Por fim, chama `appendAttachmentsSection` com o nome original e o caminho absoluto de cada anexo.
- [x] **04.6 — Limpeza de 24 h e 7 dias, e expurgo da Issue**
  - **Arquivos:**
    - alterar `packages/api/src/application/services/terminal/terminalAttachmentService.ts` (`cleanup`) e `packages/api/src/controllers/terminalSessionController.ts` (chama `cleanup` no início de `preflight` e `open`, sem bloquear a resposta se a limpeza falhar);
    - alterar `packages/api/src/infra/database/dao/issue-deletion/deletionPurge.ts` (passos `task_terminal_attachments` e `task_terminal_sessions` antes de `tasks`);
    - alterar o fluxo de exclusão em `packages/api/src/application/services/issue-deletion/` e `packages/api/src/infra/issueDeletionComposition.ts` (remove as pastas das sessões e os arquivos em staging da tarefa antes do expurgo das linhas);
    - criar `packages/api/test/terminal-cleanup.test.ts`;
    - alterar `packages/api/test/issue-deletion-purge.test.ts`.
  - **Testes:** V-12j, V-13f, V-11a
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/terminal-cleanup.test.ts test/issue-deletion-purge.test.ts` e `pnpm --dir packages/api exec vitest run src/infra/database/dao/issue-deletion/deletionPurge.test.ts` passam.

## Detalhes de implementação
- **Padrão a espelhar:**
  - imagens do composer: `taskImageController.ts`, `taskImageRules.ts`, `drizzleTaskImageDao.ts`, `stagedTaskImages.ts`, `apps/web/src/app/api/task-images/` e `apps/web/src/lib/http/taskImageRoute.ts`;
  - a diferença é que aqui o conteúdo vai para disco, não para o banco (DEC-09).
- **Dedupe:** o unique parcial (`user_id`, `task_id`, `sha256`) com `session_id IS NULL` garante o "mantém o primeiro". O DAO traduz a violação para `"duplicate"`.
- **Limpeza:**
  - `staleStaged(now - 24h)` → remove o arquivo e a linha;
  - `staleSessions(now - 7d)` → `files_removed_at IS NULL AND last_signal_at < now - 7d`, depois `removeSessionDir`, depois `markFilesRemoved`.
- **Expurgo:** confira em `deletionPurge.test.ts` a regra que exige um passo para cada tabela com FK para `tasks`; as duas tabelas novas precisam aparecer antes de `tasks`.

### Arquivos relevantes
- `packages/api/src/controllers/taskImageController.ts` e `packages/api/src/application/services/tasks/taskImageRules.ts`: validação por assinatura e `imageReferenceIds`.
- `apps/web/src/app/api/task-images/route.ts` e `apps/web/src/lib/http/taskImageRoute.ts`: route handler multipart, mesma origem e sessão.
- `apps/web/src/features/issues/issue-composer/issueImageModel.ts`: padrões `flow-image:` e URL publicada, e texto alternativo.
- `packages/api/src/infra/database/dao/issue-deletion/deletionPurge.ts` e `deletionPurge.test.ts`: ordem do expurgo.
- `packages/api/test/task-images.test.ts` e `packages/api/test/issue-deletion-purge.test.ts`: testes de rota e de expurgo a espelhar.

### Arquivos afetados
- Os listados nas mini-tarefas.

### Decisões relacionadas
- DEC-09 (§17): anexos enviados antes da confirmação, guardados em disco; o banco guarda só os metadados.
- DEC-10 (§17): anexos citados por caminho absoluto no prompt.

## Premissas
- O multipart leva `projectId`, além de `taskId` e `file`, pela mesma decisão do usuário que incluiu `projectId` nas inputs tRPC (2026-11-22). Isso permite usar `WorkAuthorization.requireOperate` como nas outras rotas de tarefa.
- O nome das imagens da Issue vem do texto alternativo, ou `imagem-<n>.<ext>` (premissa de `_tasks.md`).

## Testes atribuídos
- [x] V-12a: PNG, JPEG, GIF, WebP e PDF com a assinatura correta, e um arquivo de cada extensão de texto da §7.6 em UTF-8 → aceitos, com o `contentType` certo.
- [x] V-12b: `.png` com bytes de ZIP, `.pdf` sem `%PDF` e `planilha.xlsx` → `attachment_type_rejected` (US-04.3).
- [x] V-12c: `.txt` com byte `0x00`, ou com UTF-8 inválido → `attachment_type_rejected`.
- [x] V-12d: 10.485.760 bytes → aceito; 10.485.761 → `attachment_too_large` ("Arquivo maior que 10 MB.").
- [x] V-12h: `safeAttachmentName(3, "../Relatório final/../x.PDF", "pdf")` → `03-relatorio-final-x.pdf`, só `[a-z0-9-.]`, sem `/` nem `..`; nome vazio depois de limpo → `03-anexo.pdf` (B-13).
- [x] V-12e: com 10 anexos em staging, o 11º → `attachment_limit` ("Limite de 10 arquivos por abertura."), e os 10 continuam (US-04.4).
- [x] V-12f: anexos somando 30 MB mais 1 byte → `attachment_limit` ("Os anexos passariam de 30 MB.") só para o que estoura.
- [x] V-12g: o mesmo conteúdo enviado duas vezes → `attachment_duplicate` ("Este arquivo já está anexado."), e a primeira linha continua.
- [x] V-12k: o arquivo em staging tem modo `0600`, a pasta `0700`, o nome gerado não contém o nome original, e o caminho fica fora do clone.
- [x] V-12i: POST sem sessão → `session_required`; com `Origin` de outro site → `origin_denied`; de quem não é a operadora → `operator_required`; DELETE de um anexo de outra pessoa → recusado; POST válido → `201` com `{ id, name, contentType, byteSize }`; DELETE válido → `204`, arquivo e linha removidos.
- [x] V-12j: anexo em staging com `created_at` de 25 h atrás → arquivo e linha removidos na próxima chamada de `preflight`; o de 23 h continua (REQ-035).
- [x] V-13a: corpo do snapshot com 3 imagens em ordem B, A, C (formatos `flow-image:` e URL publicada) → `issueImages` na ordem B, A, C, com nome, tipo e tamanho (US-04.1).
- [x] V-13b: Issue com 12 imagens → as 10 primeiras com `preselected: true`, as 2 últimas `false` (B-12).
- [x] V-13c: `open` com 2 uploads e 2 imagens da Issue → 4 arquivos em `contexto/anexos/` com nomes `NN-<seguro>.<ext>`, modo `0600`, conteúdo idêntico ao original.
- [x] V-13d: o prompt entregue ao lançador falso termina com `Anexos (leia antes de começar):` e 4 linhas com o nome original, o tipo e o caminho absoluto de cada arquivo (US-04.2).
- [x] V-13e: uma imagem da Issue marcada é apagada de `task_images` antes do `open` → a sessão abre com as demais, sem essa linha no prompt, e `unavailableIssueImages: 1` (B-15).
- [x] V-13g: 8 uploads + 3 imagens da Issue marcadas → `attachment_limit`, nada abre e o staging continua intacto.
- [x] V-13h: `attachmentIds` com o id de outra pessoa, de outra tarefa ou já ligado a uma sessão → `attachment_missing`, nada abre.
- [x] V-11b: depois do `open` com imagens da Issue, as linhas e o conteúdo de `task_images` da tarefa não mudaram (NM-07).
- [x] V-13f: sessão com `last_signal_at` de 8 dias atrás → a pasta é removida e `files_removed_at` preenchido; a de 6 dias continua (REQ-033, B-14).
- [x] V-11a: excluir a Issue → não restam linhas de `task_terminal_sessions` nem de `task_terminal_attachments` da tarefa, e as pastas da sessão e os arquivos em staging somem do disco (REQ-025).

## Critérios de sucesso
- Todas as mini-tarefas marcadas, cada uma com o "Pronto quando" executado.
- Todos os testes atribuídos implementados e passando.
- Um `.md` e um PNG enviados por `POST /api/terminal-attachments` chegam a `contexto/anexos/` no `open` e aparecem na seção "Anexos" do prompt entregue ao lançador falso.
- No fim da tarefa, a suíte completa passa:
  - `pnpm --dir packages/api test`;
  - `pnpm --dir packages/api test:integration`;
  - `pnpm --dir apps/web test`.
- `pnpm --dir packages/api typecheck`, `pnpm --dir apps/web typecheck` e `pnpm lint` sem erros; nenhuma regra do AGENTS.md violada.

## Registro de execução
<!-- The implementer appends one entry per mini-task: date, what was done, commands run with their result, deviations. Example:
- 2026-11-22 · 04.1 · regras dos anexos · `vitest run src/application/services/terminal/attachmentRules.test.ts` → 12 passed · sem desvios -->
- 2026-11-22 · 04.1 · regras dos anexos · `vitest run src/application/services/terminal/attachmentRules.test.ts` → 32 passed · o tipo vem da assinatura; uma extensão binária (png, jpg, gif, webp, pdf) que não bate com o conteúdo é recusada, e um arquivo de extensão de texto com conteúdo binário também; sem extensão conhecida, a assinatura decide
- 2026-11-22 · 04.2 · file store, DAO e serviço de envio · `vitest run --config vitest.integration.config.ts test/terminal-attachments.test.ts` → 7 passed; `pnpm --dir packages/api typecheck` sem erros · desvios: `writeStaged(userId, storedName, content)` recebe o nome gerado pelo serviço, porque a linha precisa existir antes da gravação; `stage` devolve `"limit_count"` ou `"limit_bytes"` em vez de só `"limit"`, para a mensagem certa; a entrega usa `copyToSession` (copia e só remove o staging depois do disparo) em vez de `moveToSession`, para que uma falha de disparo não perca os anexos; a trava do staging usa `pg_advisory_xact_lock`; o nome original perde caracteres de controle e é cortado em 255
- 2026-11-22 · 04.3 · route handlers · `vitest run --config vitest.integration.config.ts test/terminal-attachment-routes.test.ts` → 6 passed; `pnpm --dir apps/web typecheck` sem erros · erros no formato já usado por `task-images`: `{ error: { reason, message } }`; o log OBS-04 (`[terminal] attachment_rejected`, sem o nome) fica no serviço, não no controller; o teste mocka `server-only` pelo caminho de `apps/web/node_modules`
- 2026-11-22 · 04.4 · imagens da Issue no `preflight` · `vitest run src/application/services/terminal/issueImageSelection.test.ts` e `vitest run --config vitest.integration.config.ts test/terminal-issue-images.test.ts` → 5 e 3 passed · o corpo publicado traz a URL do `flow-dev-assets`, então o parser lê as duas formas (`flow-image:` e a URL), na ordem do texto; em vez de alterar `TaskImageDao`, criei `TerminalIssueImageDao` (`summaries` e `content` por tarefa)
- 2026-11-22 · 04.5 · `open` com anexos · `vitest run --config vitest.integration.config.ts test/terminal-open-attachments.test.ts test/terminal-open.test.ts` → 13 passed · validação antes da transação (`attachment_missing` e `attachment_limit`, este com `kind: total_size` para os 30 MB); a ligação dos anexos fica na mesma transação da sessão (`create(input, links)`); uma imagem da Issue que sumiu vira `unavailableIssueImages`; numa falha de disparo, `markLaunchFailed` devolve os uploads ao staging e apaga as linhas `issue_image`, então o mesmo `requestKey` e os mesmos ids funcionam na nova tentativa
- 2026-11-22 · 04.6 · limpeza e expurgo · `vitest run --config vitest.integration.config.ts test/terminal-cleanup.test.ts test/issue-deletion-purge.test.ts` → 4 passed; `vitest run src/infra/database/dao/issue-deletion/deletionPurge.test.ts` → 3 passed · a limpeza roda no início de `preflight` e `open` (erros engolidos); a exclusão da Issue chama `TerminalFilesPurger.purgeTask` antes de apagar as linhas (nova dependência opcional do `IssueDeletionWorker`, ligada em `issueDeletionComposition.ts`) e os passos `task_terminal_attachments` e `task_terminal_sessions` entram antes das decisões
- 2026-11-22 · fechamento · `pnpm --dir packages/api test` → 560 passed; `pnpm --dir packages/api test:integration` → 458 passed; `pnpm --dir apps/web test` → 288 passed; `pnpm --dir packages/api typecheck`, `pnpm --dir apps/web typecheck` e `pnpm lint` sem erros
