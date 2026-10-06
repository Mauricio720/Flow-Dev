---
provider: manual
pr:
round: 1
round_created_at: 2026-10-02T18:02:34Z
status: resolved
file: packages/api/src/application/services/tasks/sourceRules.ts
line: 24
severity: high
author: claude-code
provider_ref:
---

# Issue 007: Valide repositório e commit da referência de arquivo

## Review Comment

Para `project-file`, a associação verifica apenas path, linha e a existência de algum commitSha na evidência. O repositório e a URL da referência, incluindo seu commit, não são comparados com a evidência. Assim, uma referência `src/cart.ts:10` apontando para `https://github.com/evil/other/blob/wrong/src/cart.ts#L10` é aceita contra evidência de `acme/repo` em outro commit, desde que path e intervalo coincidam.

Confirmei que `buildManualEvidenceBindings` aceita essa referência estrangeira. Em uma edição de referência com statement inalterado, a busca do binding anterior usa apenas fieldPath/evidenceId/claimHash; pode conservar a classificação retrieved/historical apesar da troca de destino. O renderer permite URLs HTTPS do GitHub e publicará o link incorreto. O problema também afeta a validação de fontes geradas que usa a mesma função.

Valide a identidade do repositório, caminho, commit e intervalo extraídos da URL canônica em conjunto com a evidência; vincule a identidade da fonte ao hash/binding preservado. Rejeite destinos conflitantes antes de salvar ou atribuir verificação. Cubra referências com mesmo path/linha em outro repositório ou commit. Requisitos: US-008.EC-1/5/9, UT-027 e ADR-007.

## Triage

- Decision: `VALID`
- Root cause: project-file matching checks only path and line range, not the repository and commit encoded by its GitHub URL; preserved bindings likewise omit source identity.
- Fix approach: require canonical GitHub file URL identity to match evidence and include it in binding preservation.
