---
provider: manual
pr:
round: 1
round_created_at: 2026-10-02T18:02:34Z
status: resolved
file: packages/api/src/infra/transcription/audioValidator.ts
line: 45
severity: critical
author: claude-code
provider_ref:
---

# Issue 001: Trate erros do stdin do ffprobe sem encerrar o servidor

## Review Comment

Um upload autenticado de áudio inválido pode encerrar o processo Node inteiro. `child.once("error", ...)` trata erros do processo filho, mas não o evento `error` do stream `child.stdin`. Quando ffprobe rejeita o arquivo antes de consumir todos os bytes, `child.stdin.end(audio)` emite `EPIPE` sem listener; isso escapa do `try/catch` do controller.

Reproduzi com a classe real: `new AudioValidator().inspect(new Uint8Array(10 * 1024 * 1024), "audio/webm")`, em um processo isolado. Resultado: `Unhandled 'error' event`, `Error: write EPIPE`, exit code 1. O tamanho é permitido pelo limite da aplicação. Um único upload pode derrubar o worker HTTP que atende outros usuários.

Trate explicitamente erros de stdin, finalize o subprocesso e limpe o timer em todos os caminhos, convertendo a falha em `invalid_audio`. Acrescente uma regressão com ffprobe real e entrada inválida suficientemente grande para provocar fechamento antecipado do pipe. Isso atende UT-041/042 e o requisito de falhas recuperáveis do ditado.

## Triage

- Decision: `VALID`
- Root cause: `probeAudio` only observes process and close events; `child.stdin` can emit an unhandled `EPIPE` after ffprobe exits early.
- Fix approach: settle the probe once from every process, stdin, timeout, and close path, always clear the timer and terminate a still-running child on stdin failure.
