---
id: ISSUE-generate-after-context-limit
area: ISSUE
title: Revisar o draft após esgotar as consultas de contexto
persona: Marina
journey: J-issue-draft-generation
expected: Um draft válido continua disponível para revisão e após recarregar mesmo quando novas consultas de contexto atingem o limite.
entry_points: workspace de Issues do projeto
qa_status: untested
bug_ids:
fix_status:
retest_status:
fix_commits:
evidence:
last_report:
overlaps:
---

Reproduzir a intenção TEST-05 com consultas suficientes para atingir o limite de contexto. Conferir que atividades adicionais registradas, inclusive recusas por limite, não causam uma falha genérica de resultado inválido. Os testes automatizados cobrem a validação; a geração com o provedor real e a persistência visível ainda precisam de uma sessão na interface.
