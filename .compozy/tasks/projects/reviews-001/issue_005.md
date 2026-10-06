---
provider: manual
pr:
round: 1
round_created_at: 2026-10-01T19:19:57Z
status: resolved
file: packages/api/src/application/github/repositoryAuthorizationService.ts
line: 36
severity: high
author: claude-code
provider_ref:
---

# Issue 005: Serializar a renovação de token no armazenamento persistente

## Review Comment

`refreshLocks` pertence a cada instância do serviço. A composição de produção cria instâncias distintas e múltiplos processos também não compartilham esse Map. Ambos podem ler a mesma credencial expirada e gastar o mesmo refresh token simultaneamente; o store Drizzle apenas faz upsert e não possui bloqueio/CAS de renovação. Uma sondagem com duas instâncias e um store compartilhado confirmou duas chamadas de refresh. Com tokens rotativos, isso pode causar uma falha de renovação ou permitir que uma resposta atrasada sobrescreva a credencial mais recente.

Implemente a serialização por usuário no PostgreSQL, com bloqueio de linha ou mecanismo equivalente, releitura da credencial após adquirir o bloqueio e substituição atômica dos tokens. Coordene também a gravação de uma nova autorização para evitar sobrescrita por refresh antigo. O teste deve usar duas instâncias sobre armazenamento durável; o atual UT-024 só demonstra deduplicação na mesma instância. A TechSpec exige bloqueio por linha e atualização atômica.

## Triage

- Decision: `VALID`
- Notes: O Map pertence à instância e o store só executa upsert. Introduzir operação de exclusão mútua no contrato/store, usar bloqueio PostgreSQL por usuário e reler dentro da transação; gravações de autorização usarão o mesmo bloqueio. Extensão mínima: contrato e implementação em memória para manter equivalência nos testes.
- Escopo: rodada projects/reviews-001 completa; sem commit automático. Testes e dependências diretas das correções estão incluídos.
- Resolução: Store PostgreSQL serializa por advisory lock transacional, relê a credencial e persiste tokens dentro do mesmo bloqueio; consentimento usa o mesmo caminho. Duas instâncias com PostgreSQL fizeram só um refresh e ciphertext permaneceu cifrado.

