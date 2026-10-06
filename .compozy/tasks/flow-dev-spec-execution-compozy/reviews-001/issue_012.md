---
provider: manual
pr:
round: 1
round_created_at: 2026-10-06T10:34:24Z
status: resolved
file: packages/api/src/controllers/specWorkerController.ts
line: 26
severity: medium
author: claude-code
provider_ref:
---

# Issue 012: Heartbeat do worker ignora falhas e perda de lease

## Review Comment

O heartbeat é disparado assim:

```ts
const heartbeat = setInterval(() => void this.deps.dao.heartbeat(claim, this.deps.clock()), HEARTBEAT_INTERVAL_MS);
```

Dois problemas:

1. **Rejeição não tratada.** `heartbeat` faz um `UPDATE` no banco. Uma falha transitória de conexão rejeita a promise, que foi descartada com `void`. No Node atual, uma rejeição não tratada encerra o processo, então um soluço do banco derruba o worker no meio de um dispatch ou de uma promoção de arquivos.
2. **Resultado ignorado.** `heartbeat` devolve `false` quando o fence já não é o do claim (lease perdido). O worker segue executando efeitos externos: clone, `podman run`, envio de prompt, renomeação de arquivos no checkout canônico. As escritas no banco são protegidas pelo fence, mas as de filesystem e de runtime não são.

Há ainda um caso sem heartbeat nenhum: `applyNextApproval` e `applyNextRestore` rodam antes do `setInterval`. Uma restauração que promova muitos arquivos por mais de 30 s perde o lease do comando e pode ser reclamada em paralelo.

Correção sugerida:

- Tratar a promise do heartbeat (`.catch` com log estruturado) e, quando o resultado for `false` ou houver falhas consecutivas, sinalizar cancelamento por um `AbortSignal` propagado para `handle`.
- Checar o sinal antes de cada efeito externo em `dispatchAttempt` e na promoção.
- Estender o heartbeat (ou um equivalente para comandos) às aplicações de aprovação e restauração.

## Triage

- Decision: `VALID`
- Notes: Heartbeat rejections were detached from the worker and lease loss was ignored. The worker observes both conditions before completing its claim.
