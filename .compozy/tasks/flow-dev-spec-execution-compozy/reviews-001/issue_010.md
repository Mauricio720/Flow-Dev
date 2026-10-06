---
provider: manual
pr:
round: 1
round_created_at: 2026-10-06T10:34:24Z
status: resolved
file: apps/web/src/features/issues/issue-composer/spec/specReads.ts
line: 12
severity: medium
author: claude-code
provider_ref:
---

# Issue 010: Primeira página de eventos traz os mais antigos e cursor inválido

## Review Comment

`readLatestEvents` chama `taskSpec.events` com `before: undefined`. No controller, `direction: input.before ? "before" : "after"` vira `"after"`, e sem cursor `readSpecEvents` usa `sequence > 0` em ordem crescente. A chamada devolve os **100 eventos mais antigos**, não os mais recentes.

Em seguida `createSpecReader` grava `after: latest` (o cursor do snapshot, que aponta para o último evento) e `older: page.nextCursor`. Para uma execução com mais de 100 eventos, o que é comum em uma sessão de agente:

- A atividade mostra os eventos 1–100 e depois só os que chegarem a partir de agora. O intervalo entre o evento 100 e o cursor do snapshot nunca é carregado.
- O cursor guardado em `older` foi emitido com `direction: "after"`. `loadOlder` o envia como `before`, `decodeTaskCursor` rejeita por direção divergente (`invalid_cursor`) e o `.catch(() => null)` engole o erro. O botão de carregar anteriores não faz nada.

O TechSpec pede histórico paginado coerente e "one coherent timeline" (E2E-003).

Correção sugerida:

- Dar ao servidor um modo explícito para a página mais recente: aceitar `before` igual ao cursor do snapshot (`eventCursor`) ou um parâmetro `latest`, devolvendo os últimos N em ordem crescente e um cursor `before` para continuar.
- No cliente, usar `readOlderEvents(target, snapshot.eventCursor)` reemitido com direção `before`, ou o novo modo, na primeira carga; guardar em `older` apenas cursores de direção `before`.
- Não engolir o erro de `loadOlder`: propagar para o estado de falha.
- Teste de hook com 250 eventos: primeira carga mostra 151–250 e "carregar anteriores" traz 51–150.

## Triage

- Decision: `VALID`
- Notes: The initial event request used the forward cursor direction and could not provide a valid older cursor. The transport now has an explicit latest mode that returns a backward cursor, and the client uses it.
