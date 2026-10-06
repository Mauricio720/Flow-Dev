---
provider: manual
pr:
round: 1
round_created_at: 2026-10-01T19:19:57Z
status: resolved
file: packages/api/src/application/services/projects/connectionStateService.ts
line: 20
severity: high
author: claude-code
provider_ref:
---

# Issue 006: Derivar o estado de arquivo da verificação atual do GitHub

## Review Comment

O estado salvo `archived` retorna antes de ler a credencial ou consultar o GitHub, com `checkedAt` novo. Assim, um repositório desarquivado permanece arquivado e um membro sem acesso pode receber uma indicação que afirma que a leitura continua disponível. No sentido inverso, quando a resposta atual contém `archived:true`, o método salva os metadados e devolve `available`. As sondagens confirmaram ambos: zero consultas no ramo salvo e `available` para a resposta recém-arquivada.

Trate o arquivo salvo apenas como metadado histórico. Verifique a autorização pessoal e a identidade atual, e retorne `archived` somente quando a resposta acessível atual indicar arquivo; caso contrário, devolva o estado de acesso ou falha apropriado. Cubra archive/unarchive e perda de acesso em um projeto arquivado. PRD US-007.EC-9 e IT-045 exigem arquivo atual e leitura permitida, sem falsa disponibilidade.

## Triage

- Decision: `VALID`
- Notes: O ramo archived retorna sem consulta e o sucesso sempre vira available. Derivar archived apenas da resposta atual acessível e cobrir archive, unarchive e perda de acesso.
- Escopo: rodada projects/reviews-001 completa; sem commit automático. Testes e dependências diretas das correções estão incluídos.
- Resolução: Estado archived deriva apenas da resposta atual após autorização e validação da identidade. Integração confirmou estado arquivado atual e leitura do contexto; lógica conserva available ao desarquivar e traduz acesso perdido por projeto.

