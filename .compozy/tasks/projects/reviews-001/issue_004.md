---
provider: manual
pr:
round: 1
round_created_at: 2026-10-01T19:19:57Z
status: resolved
file: packages/api/src/application/services/projects/repositoryAccessService.ts
line: 17
severity: high
author: claude-code
provider_ref:
---

# Issue 004: Consultar acesso público quando a visibilidade salva é privada

## Review Comment

Um projeto salvo como privado que passa a público continua exigindo OAuth para um membro sem token. `requireRead` lança antes de consultar o GitHub e `ConnectionStateService.check` retorna `authorization_needed` pela mesma visibilidade antiga. Como nenhum desses caminhos consulta a identidade atual, o próprio usuário não consegue recuperar a conexão pública. A sondagem confirmou zero chamadas ao gateway, mesmo com uma resposta pública válida para ID 202 disponível. Além disso, `context` repete a decisão com o registro anterior à atualização.

Depois de verificar a atribuição Flow Dev, tente a consulta pública sem token independentemente da visibilidade persistida, compare obrigatoriamente o ID retornado e só conceda acesso se for o repositório vinculado. Um 404 deve continuar produzindo orientação de autorização sem afirmar exclusão. Use a identidade atual confirmada no contexto. Implemente IT-069, que especifica exatamente a transição privado→público e a recusa de ID diferente.

## Triage

- Decision: `VALID`
- Notes: A visibilidade salva impede a tentativa pública antes da consulta. Remover essa decisão histórica, consultar publicamente sem token, recusar ID diferente e traduzir 404 anônimo em necessidade de autorização. Contexto usará identidade atual.
- Escopo: rodada projects/reviews-001 completa; sem commit automático. Testes e dependências diretas das correções estão incluídos.
- Resolução: Visibilidade salva não bloqueia consulta pública; ID é comparado antes de conceder acesso, 404 pede autorização e contexto usa identidade confirmada. Teste cobre privado→público e ID substituto.

