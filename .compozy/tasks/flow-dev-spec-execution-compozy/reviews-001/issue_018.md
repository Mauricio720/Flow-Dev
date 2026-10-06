---
provider: manual
pr:
round: 1
round_created_at: 2026-10-06T10:34:24Z
status: valid
file: packages/api/src/application/services/spec/specLimits.ts
line: 20
severity: medium
author: claude-code
provider_ref:
---

# Issue 018: Limites do TechSpec declarados mas não aplicados (watchdog, quota)

## Review Comment

Vários limites da seção "Limits and performance budgets" do TechSpec existem como constante ou argumento, mas nenhum código os aplica:

- **Watchdog de trabalho ativo (2 horas).** Não há nenhuma verificação de tempo de execução no worker. Uma tentativa em `running` sem eventos novos é supervisionada para sempre e ocupa um dos dois slots do runner. O TechSpec pede "verified stop with a resource-limit reason".
- **Projeção por tentativa (64 MiB).** `SPEC_ATTEMPT_PROJECTION_MAX_BYTES` não tem uso. `ingestEvents` grava eventos sem contabilizar o total; um agente em laço cresce `task_spec_events` sem teto.
- **Quota de candidato/scratch (2 GiB).** `containerPlan.ts` limita só o `tmpfs` de `/tmp`. Os bind mounts de `candidate/` e `/var/lib/compozy` escrevem direto no disco do host, sem quota.
- **Isolamento verificável.** `isolationEnforceable` (`specConfigurationProbe.ts:12-16`) verifica apenas se o Podman é rootless. A rede `flow-spec-egress`, da qual depende toda a política de egress, não é verificada nem criada em lugar nenhum do repositório. O TechSpec manda recusar a inicialização quando o isolamento não puder ser garantido.
- **Estado do workspace.** `task_spec_workspaces.state` nunca é escrito: um `artifact_conflict` detectado não marca o checkout como `conflicted`, embora `assertWorkspaceBound` dependa de `state === "ready"`.
- **Alertas e métricas.** Não há emissão para stop incerto acima de 60 s, finalização acima de 60 s, lacuna de replay ou espaço em disco.

Correção sugerida:

- Guardar o início do trabalho ativo (descontando o tempo em `waiting`) e, em `superviseExecution`, solicitar stop com `resource_limit` ao exceder o orçamento.
- Somar o tamanho dos payloads por tentativa e parar com motivo de capacidade ao atingir o teto.
- Usar volume com quota (ou `--storage-opt size=`) para candidato e scratch.
- Estender o probe para verificar a existência da rede `flow-spec-egress` e do secret do provedor.
- Marcar o workspace como `conflicted` quando `artifact_conflict` for registrado.
- Remover as constantes que continuarem sem uso.

## Triage

- Decision: `VALID`
- Notes: The named lifecycle, projection, storage, isolation and observability budgets are not all enforced. They require runtime/platform work beyond the localized remediation completed here.
