---
provider: manual
pr:
round: 1
round_created_at: 2026-10-06T10:34:24Z
status: resolved
file: packages/api/src/controllers/specDispatch.ts
line: 44
severity: high
author: claude-code
provider_ref:
---

# Issue 006: Workspace do runtime usa caminho do host inexistente no contêiner

## Review Comment

`bindRuntime` registra o workspace do Compozy com `workspaceRoot: candidate.candidatePath`, que é o caminho no **host** (`<SPEC_WORKSPACE_ROOT>/<repo>/<task>/attempts/<id>/candidate`). O daemon roda dentro do contêiner, onde esse diretório está montado em `/workspace/candidate` (`containerPlan.ts:19-23`). O `root_dir` enviado em `POST /api/workspaces` não existe no filesystem do daemon.

Além disso, três partes do fluxo assumem layouts diferentes para a mesma raiz:

- O prompt (`specPrompt.ts:22`) manda escrever em `candidate/`, ler `repository/` e `inputs/`. Isso só faz sentido se a raiz for `/workspace`.
- O `root_dir` aponta para o próprio diretório do candidato, onde `repository/` e `inputs/` não existem.
- `isStageWritable` (`specPermissionBoundary.ts:23-30`) só aceita caminhos sem prefixo (`_prd.md`, `adrs/adr-001.md`). Um pedido de escrita em `candidate/_prd.md` ou `/workspace/candidate/_prd.md` é classificado como `permission_out_of_scope`, então `allow_once` seria recusado para toda escrita legítima do estágio.

Os testes passam porque usam transporte falso. Com o daemon real, o registro do workspace falha ou o agente opera em um diretório que não é o montado, e a autora não consegue autorizar escritas válidas.

Correção sugerida:

- Definir uma constante única para a raiz dentro do contêiner (`/workspace`) e usá-la em `containerPlan`, em `runtime.create` e no prompt.
- Em `parsePermissionTarget`/`classifyPermission`, normalizar o caminho relativo à raiz do contêiner e remover o prefixo `candidate/` antes de aplicar `isStageWritable`; negar qualquer alvo fora de `candidate/`.
- Cobrir com teste que monte o plano do contêiner e verifique que o `root_dir` enviado é um alvo de mount, e com casos de permissão para `candidate/_prd.md` e `repository/x.ts`.

## Triage

- Decision: `VALID`
- Notes: Runtime workspace registration used an unavailable host path. It now uses the mounted /workspace root, and permission paths normalize candidate prefixes while rejecting other mounts.
