---
provider: manual
pr:
round: 1
round_created_at: 2026-10-06T10:34:24Z
status: resolved
file: packages/api/src/application/services/spec/specRedaction.ts
line: 3
severity: medium
author: claude-code
provider_ref:
---

# Issue 016: Redação de eventos cobre só prefixos fixos e ignora tokens

## Review Comment

A redação aplicada antes de persistir eventos e interações tem lacunas em relação ao que o TechSpec exige ("Drop ... authorization headers, absolute host paths and secret values before persistence"; "Never expose tokens ... host paths ... in DTOs").

1. **Caminhos absolutos.** `ABSOLUTE_PATH` só reconhece caminhos sob `home|root|srv|var|tmp|opt|usr|etc|mnt|Users`. Um `SPEC_WORKSPACE_ROOT` em `/data/...`, `/workspaces/...` ou `/run/user/...` não casa com a expressão, então nem a relativização por `workspaceRoot` nem a omissão acontecem e o caminho do host é gravado e servido. O filtro de `safeSource` em `normalizeSpecEvent.ts:47` só descarta o que começa com `/`.
2. **Segredos em texto.** Valores só são omitidos quando a **chave** do objeto casa com `SECRET_KEY` ou quando o texto contém `authorization:`/`bearer <token>`. Um token impresso em saída de ferramenta (`ghp_...`, `github_pat_...`, `sk-ant-...`, `AKIA...`, `KEY=valor` de um `.env`) passa intacto para `task_spec_events.payload` e para qualquer leitor do projeto via `taskSpec.event`.
3. **Campos fora da redação.** `toolCallId` e `tool` são lidos de `event.content` bruto, não de `safeContent` (`normalizeSpecEvent.ts:48`). As `choices` de uma pergunta (`specInteractionRules.ts:31`) e o `runtimeWinner` gravado em `interactions.response` (`specWorkerInteractions.ts:40`) também não passam por `redactText`.

As leituras de eventos e interações pendentes exigem apenas `requireRead`, então o conteúdo chega a leitores não autores.

Correção sugerida:

- Tratar como caminho de host qualquer caminho absoluto que não comece com os alvos de mount do contêiner (`/workspace/`, `/tmp/`); relativizar primeiro os que estiverem sob `workspaceRoot`.
- Acrescentar padrões de valor para formatos conhecidos de token e para atribuições `NOME_SECRETO=valor`.
- Ler `toolCallId`/`tool` de `safeContent` e aplicar `redactText` a `choices` e `runtimeWinner`.
- Testes para raiz fora da lista atual e para token em texto livre.

## Triage

- Decision: `VALID`
- Notes: Event redaction did not cover arbitrary absolute paths or common token values, and metadata read raw content. Redaction is extended and event metadata now uses the redacted value.
