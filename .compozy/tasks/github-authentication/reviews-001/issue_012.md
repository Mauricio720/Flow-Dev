---
provider: manual
pr:
round: 1
round_created_at: 2026-10-01T16:20:08Z
status: resolved
file: apps/web/src/features/access/access-management/index.tsx
line: 63
severity: high
author: claude-code
provider_ref:
---

# Issue 012: Mostre as atribuições atuais na gestão de acessos

## Review Comment

A tela renderiza identidade e botões de atribuir/remover, mas nunca consulta `access.userAssignments`, não exibe os projetos atualmente atribuídos nem atualiza atribuições após uma mutação. O DTO de usuário também não fornece a contagem de projetos descrita na TechSpec. Assim, o administrador não consegue inspecionar acessos existentes ou verificar se uma operação interrompida foi efetivada.

O botão Remover fica habilitado para todo usuário assim que qualquer projeto é selecionado, inclusive quando aquele usuário não possui nenhuma atribuição; IT-082 exige ação indisponível nesse estado. Um sucesso genérico de remove não informa se o alvo tinha acesso antes.

Carregue e exiba as atribuições por usuário, usando o endpoint paginado existente; atualize esse estado após assign/remove e ofereça refresh/reconsulta após falha incerta. Habilite remoção apenas para um par existente e apresente contagem/identidade coerentes. Verifique US-007.AC-2, IT-082, IT-136 e IT-137.

## Triage

 - Decision: `valid`
 - Notes: Root cause: the admin UI never queries or renders assignments. Fix: load assignment pages, show counts, refresh after mutations, and disable removal for absent pairs.
- Notes:
