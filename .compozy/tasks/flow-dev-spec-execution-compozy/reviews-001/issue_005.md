---
provider: manual
pr:
round: 1
round_created_at: 2026-10-06T10:34:24Z
status: valid
file: packages/api/src/infra/spec/podmanLauncher.ts
line: 35
severity: high
author: claude-code
provider_ref:
---

# Issue 005: Contêineres da Spec nunca são encerrados e o redispatch colide

## Review Comment

`PodmanRuntimeLauncher.stop` não tem nenhum chamador em código de produção. O contêiner é criado com `podman run --detach --rm --name flow-spec-<attemptId>` e só sai quando o daemon interno encerra. Nenhum caminho terminal remove o contêiner: `settle` com `failed`/`canceled`, `finalization.complete`, `superviseStop`, `checkEntitlement` com acesso revogado.

Consequências:

- Cada tentativa concluída deixa um contêiner de 2 vCPU / 4 GiB vivo, com o diretório `candidate/` montado em escrita e egress para o provedor. O limite de "2 concurrent attempts per runner" passa a valer só no banco.
- Uma tentativa cancelada ou com acesso revogado continua com um agente potencialmente ativo; a parada verificada depende apenas da sessão, não do contêiner.
- O socket em `<root>/.runtime/<attemptId>/` e os diretórios de scratch nunca são limpos.

O redispatch agrava o problema. `dispatchAttempt` reexecuta `prepareExecution` inteiro em três situações: prompt com `queue_full` (`specDispatch.ts:54`), reclaim de uma tentativa em `dispatching` após queda do worker, e `suspended` por acesso incerto. Em todas elas `buildCandidateWorkspace` faz `rm(paths.base, { recursive: true })` por baixo de um contêiner possivelmente vivo (`candidateWorkspace.ts:12`), e `podman run` falha por nome duplicado. O erro vira `workspace_unavailable` e a tentativa é marcada `failed`, embora a sessão original possa estar rodando.

Correção sugerida:

- Chamar `launcher.stop(attemptId)` em toda liquidação terminal (falha, cancelamento verificado, conclusão após `review_ready`, acesso revogado) e remover o diretório de runtime.
- Tornar `launcher.start` idempotente: se o contêiner `flow-spec-<attemptId>` já existir e o socket responder, reutilizar; não recriar o candidato quando `claim.runtimeSessionId` já estiver vinculado.
- Adicionar uma varredura de órfãos na inicialização do worker (contêineres `flow-spec-*` sem tentativa supervisionada).

## Triage

- Decision: `VALID`
- Notes: The launcher lifecycle had no terminal stop call or redispatch reuse. Terminal stop paths now remove the container and runtime directory, startup reuses a live socket, and dispatch avoids recreating a bound session. Orphan sweeping remains a deployment-operation follow-up.
