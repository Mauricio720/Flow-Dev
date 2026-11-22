---
status: completed
title: Anexos no diálogo de abertura
type: frontend
complexity: medium
---

# Task 06: Anexos no diálogo de abertura

## Visão geral
Acrescenta ao diálogo "Abrir no terminal" a seção "Anexos". Nela a pessoa operadora:
- escolhe ou arrasta imagens, PDFs e textos;
- acompanha o envio de cada arquivo e tenta de novo só o que falhou;
- vê as imagens da Issue já marcadas e pode desmarcá-las.

A confirmação envia os ids dos anexos e das imagens marcadas, e o diálogo mostra uma prévia da seção "Anexos" do prompt.

<critical>
- LEIA a spec (`spec.md`, US-04, REQ-027 a REQ-032, §7.3 (seção Anexos), §7.5, §7.6, §15 "Anexos", B-12, B-15, NFR-05) e as regras do projeto (AGENTS.md/CLAUDE.md, `.agents/rules/code-standards.md`, `apps/web/AGENTS.md`, `apps/web/DESIGN.md`) antes de começar. Leia a skill `nextjs-folder-structure`.
- FAÇA UMA MINI-TAREFA POR VEZ, na ordem. Só marque `[x]` depois de rodar o "Pronto quando" dela e ver passar.
- NÃO saia dos arquivos listados sem registrar o motivo no Registro de execução. Nada fora do escopo da spec.
- TESTES JUNTO COM O CÓDIGO: cada mini-tarefa implementa os testes atribuídos a ela.
- Ao começar, mude `status` para `in_progress` (aqui e em `_tasks.md`). Mude para `completed` só quando todas as mini-tarefas estiverem marcadas e os critérios de sucesso tiverem sido comprovados por comando. A revisão contra a spec acontece uma vez, depois de todas as tarefas: não a espere aqui, mas não marque nada que não tenha prova, porque ela vai conferir.
</critical>

## Requisitos
- REQ-027: O diálogo de abertura DEVE permitir anexar arquivos dos tipos da §7.6, por seleção e por arrastar e soltar.
- REQ-028 (UI): QUANDO o diálogo abrir, o sistema DEVE listar as imagens da Issue como anexos já marcados, na ordem do corpo, e a pessoa pode desmarcá-las.
- REQ-030 (UI): o diálogo mostra a recusa do anexo que estoura um limite, com o limite nomeado (mensagem do servidor). Ele também impede localmente o 11º arquivo, com "Limite de 10 arquivos por abertura.".
- REQ-031 (UI): a confirmação envia `attachmentIds` (uploads concluídos) e `issueImageIds` (imagens marcadas); o diálogo mostra a prévia da seção "Anexos".
- REQ-032: ENQUANTO um anexo estiver sendo enviado, o diálogo DEVE mostrar o progresso dele e impedir a confirmação; SE o envio falhar, ENTÃO o diálogo DEVE oferecer "Tentar de novo" só para esse anexo.
- US-04 (1–4): cenários de aceite.
- B-12 (UI): Issue com mais de 10 imagens → as 10 primeiras marcadas, com o aviso "N imagens da Issue ficaram desmarcadas pelo limite.".
- B-15 (UI): `unavailableIssueImages > 0` na resposta do `open` → aviso "1 imagem da Issue não está mais disponível." (no plural: "N imagens da Issue não estão mais disponíveis.").
- NFR-05 (anexos): o seletor tem rótulo; o progresso e os erros dos anexos são anunciados (`aria-live`); a área de soltar também funciona pelo teclado, pelo botão de seleção.

## Interfaces
- **Consome (task_04):**
  - `POST /api/terminal-attachments` (multipart `projectId`, `taskId`, `file`) → `201 { id, name, contentType, byteSize }`, ou erro `{ reason, message }`;
  - `DELETE /api/terminal-attachments/:attachmentId` → `204`;
  - `preflight.issueImages: Array<{ id; name; contentType; byteSize; preselected }>`;
  - `open` → `{ sessionId; unavailableIssueImages }`.
- **Consome (task_05):**
  - `TerminalLaunchDialog`, com o slot `attachments` e a propriedade `confirmBlocked`;
  - `useTerminalLaunch(...).confirm({ attachmentIds, issueImageIds })`;
  - `terminalCopy.ts`.
- **Produz:**
  - `AttachmentPicker` (`apps/web/src/features/issues/assigned-work/components/AttachmentPicker.tsx`);
  - hook `useTerminalAttachments({ projectId, taskId, issueImages })`, que devolve `{ items, add(files: File[]), retry(localId), remove(localId), toggleIssueImage(id), uploading: boolean, attachmentIds: string[], issueImageIds: string[], notices }`;
  - `apps/web/src/features/issues/assigned-work/terminalAttachmentClient.ts`: `uploadTerminalAttachment({ projectId, taskId, file, onProgress })` com `XMLHttpRequest`, para ter progresso, e `deleteTerminalAttachment(id)`.

## Mini-tarefas

- [x] **06.1 — `AttachmentPicker` com envio, progresso e nova tentativa**
  - **Arquivos:**
    - criar `apps/web/src/features/issues/assigned-work/components/AttachmentPicker.tsx` e `apps/web/src/features/issues/assigned-work/components/AttachmentItem.tsx`;
    - criar `apps/web/src/features/issues/assigned-work/hooks/useTerminalAttachments.ts`, `apps/web/src/features/issues/assigned-work/terminalAttachmentClient.ts` e `apps/web/src/features/issues/assigned-work/terminalAttachmentModel.ts` (estado puro dos itens);
    - alterar `apps/web/src/features/issues/assigned-work/terminalCopy.ts`;
    - criar `apps/web/src/features/issues/assigned-work/components/AttachmentPicker.test.tsx`.
  - **Testes:** V-14a, V-14b, V-14d, V-14f
  - **Pronto quando:** `pnpm --dir apps/web exec vitest run src/features/issues/assigned-work/components/AttachmentPicker.test.tsx` passa.
  - **Nota:**
    - o envio começa assim que o arquivo é escolhido (DEC-09);
    - remover um item já enviado chama `DELETE`;
    - o `accept` do `<input type="file">` lista os tipos da §7.6, mas a validação real é do servidor;
    - o teste troca `terminalAttachmentClient` por um mock que emite progresso e falha.
- [x] **06.2 — Integração no diálogo: imagens da Issue, bloqueio, prévia e avisos**
  - **Arquivos:**
    - alterar `apps/web/src/features/issues/assigned-work/components/TerminalLaunchDialog.tsx` e `apps/web/src/features/issues/assigned-work/hooks/useTerminalLaunch.ts`;
    - criar `apps/web/src/features/issues/assigned-work/components/AttachmentsPreview.tsx`;
    - alterar `apps/web/src/features/issues/assigned-work/terminalCopy.ts`;
    - criar `apps/web/src/features/issues/assigned-work/components/TerminalLaunchAttachments.test.tsx`.
  - **Testes:** V-14c, V-14e, V-14g, V-14h, V-14i
  - **Pronto quando:** `pnpm --dir apps/web exec vitest run src/features/issues/assigned-work/components/TerminalLaunchAttachments.test.tsx src/features/issues/assigned-work/components/TerminalLaunchDialog.test.tsx src/features/issues/assigned-work/components/TerminalLaunchConfirm.test.tsx` passa; `pnpm --dir apps/web typecheck` sem erros.
  - **Nota:**
    - a prévia mostra `Anexos (leia antes de começar):` e uma linha por anexo, com nome e tipo; o caminho final só existe depois da confirmação, então a prévia escreve "(caminho definido ao abrir)";
    - a prévia fica fora do campo editável e não conta no contador (§7.3).

## Detalhes de implementação
- **Padrões a espelhar:**
  - imagens no composer: `apps/web/src/features/issues/issue-composer/` (`issueImageModel.ts` e os componentes de upload de imagem), para estados de envio e mensagens;
  - `role="status"` e `role="alert"` em `PlanningActions.tsx`.
- **Estado dos itens** (`terminalAttachmentModel.ts`): `{ localId, name, byteSize, state: "uploading" | "uploaded" | "failed" | "rejected", progress, serverId?, message? }`. Item `rejected` (tipo, tamanho, duplicata, limite) mostra a mensagem do servidor e não oferece "Tentar de novo"; só `failed` (rede ou 5xx) oferece.
- **Imagens da Issue:** checkbox por imagem, com rótulo "<nome> (<tamanho>)", marcado conforme `preselected`. O limite local de 10 arquivos conta as imagens marcadas mais os uploads ativos.

### Arquivos relevantes
- `apps/web/src/features/issues/assigned-work/components/TerminalLaunchDialog.tsx` (task_05): onde o picker entra.
- `apps/web/src/features/issues/issue-composer/issueImageModel.ts`: modelo de imagem com estados.
- `apps/web/src/app/api/terminal-attachments/route.ts` (task_04): contrato de resposta.

### Arquivos afetados
- Os listados nas mini-tarefas.

### Decisões relacionadas
- DEC-09 (§17): envio arquivo a arquivo antes da confirmação, com progresso e nova tentativa por arquivo.
- DEC-10 (§17): os anexos são citados por caminho no prompt; a prévia mostra a seção.

## Premissas
- O texto "(caminho definido ao abrir)" na prévia e a forma plural do aviso da B-15 não estão na spec; ficam registrados para a revisão final.

## Testes atribuídos
- [x] V-14a: escolher `fluxo-login.pdf` pelo botão rotulado e soltar `erro.log` na área → os dois são enviados, cada um numa chamada (REQ-027).
- [x] V-14b: durante o envio, cada item mostra o progresso em `aria-live`, e ao concluir mostra nome e tamanho.
- [x] V-14d: um envio falha por rede → só esse item mostra "Tentar de novo"; clicar reenvia só ele; um item recusado por tipo não oferece "Tentar de novo" (REQ-032).
- [x] V-14f: `planilha.xlsx` recusado → "Tipo não aceito. Envie imagens (PNG, JPEG, GIF, WebP), PDF ou arquivos de texto." anunciado em `role="alert"`, e os demais continuam; com 10 itens, o 11º é recusado localmente com "Limite de 10 arquivos por abertura." (US-04.3, US-04.4).
- [x] V-14c: com um anexo em `uploading`, o botão de confirmação fica desabilitado; ao concluir, volta a habilitar (REQ-032).
- [x] V-14e: preflight com 2 imagens da Issue → "Anexos" lista as 2 marcadas, com nome e tamanho; desmarcar uma tira o id de `issueImageIds` enviado no `open` (US-04.1, REQ-028).
- [x] V-14g: preflight com 12 imagens, 10 `preselected` → aviso "2 imagens da Issue ficaram desmarcadas pelo limite." (B-12).
- [x] V-14h: com 2 imagens marcadas e 2 uploads → a prévia mostra `Anexos (leia antes de começar):` e 4 linhas; o contador do prompt não muda; `open` recebe os 2 `attachmentIds` e os 2 `issueImageIds` (US-04.2, REQ-031).
- [x] V-14i: `open` devolve `unavailableIssueImages: 1` → "1 imagem da Issue não está mais disponível." aparece na tela depois de abrir (B-15).

## Critérios de sucesso
- Todas as mini-tarefas marcadas, cada uma com o "Pronto quando" executado.
- Todos os testes atribuídos implementados e passando.
- No diálogo, a operadora anexa um PDF e um log, vê o progresso, desmarca uma imagem da Issue, vê a prévia e confirma com os ids certos.
- No fim da tarefa, `pnpm --dir apps/web test` passa.
- `pnpm --dir apps/web typecheck` e `pnpm lint` sem erros; nenhuma regra do AGENTS.md violada.

## Registro de execução
<!-- The implementer appends one entry per mini-task: date, what was done, commands run with their result, deviations. Example:
- 2026-11-22 · 06.1 · picker e envio · `vitest run src/features/issues/assigned-work/components/AttachmentPicker.test.tsx` → 6 passed · sem desvios -->
- 2026-11-22 · 06.1 · `AttachmentPicker` com envio, progresso e nova tentativa · `vitest run src/features/issues/assigned-work/components/AttachmentPicker.test.tsx` → 6 passed · o estado dos itens vive em `terminalAttachmentModel.ts`; o hook se divide em `useAttachmentUploads.ts`, `useIssueImageSelection.ts` e `useTerminalAttachments.ts` (cada função com até 30 linhas); `terminalAttachmentClient.ts` usa `XMLHttpRequest` para o progresso e `UploadError` com `kind` `rejected` (4xx, sem nova tentativa) ou `failed` (rede ou 5xx); o `accept` do input lista as extensões porque o `userEvent` filtra por ele; o teste solta os arquivos recusados pela área, já que o seletor nativo também filtra
- 2026-11-22 · 06.2 · integração no diálogo · `vitest run src/features/issues/assigned-work/components/TerminalLaunchAttachments.test.tsx src/features/issues/assigned-work/components/TerminalLaunchDialog.test.tsx src/features/issues/assigned-work/components/TerminalLaunchConfirm.test.tsx` → 20 passed; `pnpm --dir apps/web typecheck` sem erros · o diálogo monta o picker e a prévia sozinho (as props `attachments` e `confirmBlocked` previstas na 05 deixaram de existir, porque o hook de anexos precisa das imagens do preflight); o aviso de imagem indisponível mora em `TerminalLaunchAction`, para sobreviver ao fechamento do diálogo; os textos da prévia ("caminho definido ao abrir") e do plural da B-15 seguem a proposta da tarefa
- 2026-11-22 · fechamento · `pnpm --dir apps/web test` → 320 passed; `pnpm --dir apps/web typecheck` e `pnpm lint` sem erros
