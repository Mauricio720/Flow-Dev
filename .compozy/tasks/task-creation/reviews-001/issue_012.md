---
provider: manual
pr:
round: 1
round_created_at: 2026-10-02T18:02:34Z
status: resolved
file: packages/api/test/task-dictation-routes.test.ts
line: 9
severity: medium
author: claude-code
provider_ref:
---

# Issue 012: Exercite a integração real nos testes HTTP de ditado

## Review Comment

A tarefa 04 marca IT-047 até IT-068 como concluídos, mas este arquivo substitui `createProductionTranscriptionController` por mocks de preflight/transcribe. IT-047 e IT-056 exigem explicitamente HTTP/controller reais no catálogo; o teste de upload envia quatro bytes artificiais e recebe a resposta preparada. Os casos de permissão, lease, capacidade e provedor injetam o erro esperado no mock, portanto não demonstram que o estado real produz a rejeição.

Os testes unitários separados do controller e os fixtures de codecs são úteis, mas não validam essa composição HTTP → controller → lease/validator/gateway. A execução de 136 testes de integração passou nesta revisão sem cobrir o encerramento do processo pelo áudio inválido.

Implemente os casos contratuais com a rota, controller, DAO e validação reais sobre PostgreSQL descartável, substituindo somente fronteiras externas necessárias por um servidor HTTP controlado. Use gravações reais e condições reais de autoria, expiração e indisponibilidade para causar os erros. Mantenha testes de tradução HTTP como testes unitários adicionais e registre separadamente os gates ainda não executados. Requisitos: seção Tests da tarefa 04 e definições IT-047/056 de _tests.md.

## Triage

- Decision: `VALID`
- Root cause: the HTTP tests substitute the controller and thereby do not exercise real lease, access, and audio-validation composition.
- Fix approach: add isolated route integration coverage with the real controller and disposable PostgreSQL, replacing only the external transcription provider boundary.
