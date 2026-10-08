---
provider: manual
pr:
round: 1
round_created_at: 2026-10-06T18:24:24Z
status: resolved
file: packages/api/src/application/services/software/providerLoginService.ts
line: 75
severity: high
author: claude-code
provider_ref:
---

# Issue 002: Connected accounts never create a runtime provider overlay

## Review Comment

Creating a connection generates a random `runtimeProviderId` and persists it, but neither login confirmation nor composition registers that identifier with the pinned CompozyOS control plane. The gateway only probes and lists already-existing providers. Consequently, readiness immediately asks `/api/providers/<random-id>` and the model catalog for an ID the runtime was never told about. The per-run grant mount cannot repair this because readiness occurs before a run container is launched.

Add a typed provider-overlay lifecycle to the control integration. Confirmation should provision or update the exact provider ID against the connection's private credential home, verify it through the live catalog, and only then expose it as ready. Reconnect and disconnect must update or revoke the same overlay without changing its stable identity. Add a production-boundary test where a newly confirmed connection becomes discoverable through the real control contract rather than a fake that accepts arbitrary IDs.

Affected code also includes `packages/api/src/application/services/software/loginConfirmService.ts:27`, `packages/api/src/application/services/software/connectionReadiness.ts:24`, and `packages/api/src/infra/spec/compozy/compozyControlGateway.ts:47`.

## Triage

- Decision: `VALID`
- Notes: O fluxo persiste um ID aleatório e readiness apenas faz probe/listagem; não há operação de provisionamento no contrato de controle. Vou acrescentar operações tipadas de criação/atualização/revogação do overlay e integrar confirmação, reconexão, desconexão e verificação real de catálogo antes de marcar conectado.
- Escopo: rodada flow-dev-compozy-software-configuration/reviews-001 completa; sem commit automático. Testes e dependências diretas das correções estão incluídos.

## Resolution

O gateway provisiona e remove overlays pelo ID estável da conexão, aponta o comando para o home privado, e a confirmação só conecta após probe autenticado e catálogo selecionável com o mesmo provider ID.

Verificação: contratos Compozy (20 testes) e ciclo de conexões (14 testes) passaram.
