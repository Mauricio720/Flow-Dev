---
provider: manual
pr:
round: 1
round_created_at: 2026-10-06T10:34:24Z
status: resolved
file: packages/api/src/controllers/specEntitlement.ts
line: 7
severity: medium
author: claude-code
provider_ref:
---

# Issue 014: Verificação de acesso chama o GitHub a cada tick e a cada poll

## Review Comment

`checkEntitlement` roda no início de `dispatchAttempt` e de **cada** `superviseExecution`. `GitHubSpecAccessProbe.check` chama `requirePersonalRead`, que resolve o repositório no GitHub com o token pessoal da autora (`resolveProjectRepository.ts:12-14`). Não há cache em `RepositoryAccessService` nem no gateway.

Como uma tentativa em `running`/`waiting` é reclamada a cada tick (intervalo de 1 s), isso dá cerca de 3.600 chamadas por hora por tentativa ativa, inclusive enquanto ela só espera uma resposta humana. O TechSpec pede revalidação "every 30 seconds during active execution".

No lado web o padrão se repete: toda leitura passa por `requireRead` → `requirePersonalRead` (`taskSpecController.ts:78-80`). Com polling de 1 s, cada aba aberta faz `byTask` + `events`, ou seja, duas resoluções no GitHub por segundo com o token de quem está lendo.

Somando worker e uma aba da própria autora, o limite de 5.000 requisições/hora do token é ultrapassado em menos de meia hora de execução. A partir daí:

- O probe devolve `unknown`, o worker suspende os efeitos e a tentativa oscila em backoff de lease.
- As leituras da UI passam a falhar com `service_unavailable`.
- Se o GitHub responder com 403, `RepositoryForbiddenError` está em `REVOKING_ERRORS`: o rate limit pode ser interpretado como **revogação** e disparar um stop de sistema com `access_revoked`. Vale confirmar como o gateway mapeia o 403 de rate limit.

O TechSpec lista esse risco e pede para medir a carga sem contornar a verificação; a implementação atual não tem nenhuma contenção.

Correção sugerida:

- No worker, guardar o instante da última verificação concedida por tentativa (em memória ou coluna) e revalidar apenas a cada 30 s e antes de dispatch, entrega de interação, captura e aprovação.
- No web, memoizar o resultado positivo de `requirePersonalRead` por `(userId, projectId)` por alguns segundos, invalidando em erro.
- Garantir que rate limit seja mapeado para `unknown`, nunca para `revoked`.

## Triage

- Decision: `VALID`
- Notes: Entitlement was checked for every worker tick and read. Successful personal-read grants are now cached per user and project for five seconds, preventing the polling rate from consuming the GitHub rate limit.
