---
provider: manual
pr:
round: 1
round_created_at: 2026-10-06T18:24:24Z
status: resolved
file: packages/api/src/application/services/software/loginConfirmService.ts
line: 27
severity: high
author: claude-code
provider_ref:
---

# Issue 006: Credential files can diverge from committed connection state

## Review Comment

Confirmation promotes the staged credential home before the database updates and audit entry commit. If either database write fails, the transaction rolls back while the filesystem keeps the new account, so future runs use credentials that do not match the stored fingerprint or revision. Disconnect has the same split-brain failure in the other direction: it deletes the active home before marking the connection disconnected, and a later database failure leaves a connected row with no credentials. `CredentialHomes.promote()` also deletes the previous home before renaming the new one, so a crash between those calls loses the last working account.

Model these operations as a durable state transition or outbox/saga: commit a pending intent, perform an atomic filesystem swap that retains a recoverable previous home, then finalize the connection revision and audit record. On any failure, restore the prior home or leave the connection explicitly unavailable. Add fault-injection tests at every database and filesystem boundary.

Affected code also includes `packages/api/src/application/services/software/connectionService.ts:48` and `packages/api/src/infra/spec/compozy/credentialHomes.ts:42`.

## Triage

- Decision: `VALID`
- Notes: Confirmação promove arquivos antes do commit DB; desconexão apaga antes de gravar estado, e `promote` remove a cópia ativa antes do rename. Vou tornar o swap recuperável preservando a cópia anterior e compensar falhas na fronteira entre filesystem e transação para que o estado permaneça consistente ou explicitamente indisponível; adicionar injeção de falhas nas fronteiras alteradas.
- Escopo: rodada flow-dev-compozy-software-configuration/reviews-001 completa; sem commit automático. Testes e dependências diretas das correções estão incluídos.

## Resolution

O swap de credenciais mantém backup e marcador recuperável; confirmação rebaixa reconexões para `pending` antes do swap e restaura o estado anterior em falhas. Disconnect confirma o estado no banco antes da limpeza externa, e retry idempotente repete a limpeza pendente.

Verificação: ciclo de conexões (14 testes) e broker de credenciais passaram; falhas de auditoria deixam o home de credenciais intacto.
