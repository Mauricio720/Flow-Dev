---
provider: manual
pr:
round: 1
round_created_at: 2026-10-01T19:19:57Z
status: resolved
file: packages/api/src/application/services/projects/repositoryAccessService.ts
line: 18
severity: high
author: claude-code
provider_ref:
---

# Issue 003: Resolver projetos pelo node ID após rename ou transferência

## Review Comment

A leitura do projeto e `ConnectionStateService.check` resolvem somente o owner/name salvo. O `nodeId` persistido nunca é usado nesses fluxos. Se ID 202 mudar de `acme/old` para `acme/new` e outro repositório assumir `acme/old`, a checagem retorna identity mismatch e nunca reencontra 202, embora o usuário ainda tenha acesso a ele. A comparação de IDs evita substituir o código, mas o projeto fica irrecuperável pelo fluxo de verificação. A sondagem confirmou que `requireRead` falha sem chamar `github.resolve`, mesmo quando esse método consegue resolver o node original.

Com token pessoal, resolva o node ID estável, confira o ID numérico persistido e atualize owner/name somente após essa confirmação. Mantenha a resolução pública por caminho como alternativa validada quando não houver token. Aplique a mesma lógica aos estados e ao contexto. Cubra rename/transfer com reutilização do caminho antigo; PRD US-007.AC-1, ADR-005/006 e IT-037 exigem continuidade. O mecanismo de consulta por node ID é documentado em [GitHub Docs](https://docs.github.com/en/graphql/guides/using-global-node-ids).

## Triage

- Decision: `VALID`
- Notes: Os dois serviços ignoram nodeId ao consultar a identidade. Compartilhar resolução por nodeId com token, validar ID numérico e só então atualizar rótulos; manter consulta pública validada sem token.
- Escopo: rodada projects/reviews-001 completa; sem commit automático. Testes e dependências diretas das correções estão incluídos.
- Resolução: Leitura e contexto consultam node ID com token, validam databaseId e atualizam o rótulo; fallback público verifica ID. Integração cobre rename e reutilização do caminho antigo sem trocar o projeto.

