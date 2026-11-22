# Writing requirements that can be implemented and verified

## Contents
1. EARS patterns (Portuguese form)
2. Rules for a good requirement
3. User stories and Given/When/Then
4. Edge-case sweep
5. Quantifying non-functional requirements
6. Vague words to replace
7. Business rules checklist

---

## 1. EARS patterns

EARS (Easy Approach to Requirements Syntax, Rolls-Royce, 2009) constrains natural language just enough to remove the usual ambiguity. Its clauses always appear in the same order, following temporal logic: precondition, trigger, system, response. Kiro uses it for `requirements.md`, and Airbus, NASA, Bosch and Siemens use it as well. In Portuguese, keep the keywords in capitals so they stand out:

| Pattern | Form | Example |
|---|---|---|
| Ubiquitous (always active) | O sistema DEVE <resposta>. | O sistema DEVE registrar o autor de cada comentário. |
| Event-driven | QUANDO <gatilho>, o sistema DEVE <resposta>. | QUANDO o usuário enviar um comentário, o sistema DEVE exibi-lo no fim da lista sem recarregar a página. |
| State-driven | ENQUANTO <estado>, o sistema DEVE <resposta>. | ENQUANTO a issue estiver arquivada, o sistema DEVE impedir novos comentários. |
| Optional feature | ONDE <recurso existe>, o sistema DEVE <resposta>. | ONDE o projeto tiver integração com GitHub, o sistema DEVE espelhar o comentário na issue vinculada. |
| Unwanted behavior | SE <condição indesejada>, ENTÃO o sistema DEVE <resposta>. | SE o envio falhar por perda de conexão, ENTÃO o sistema DEVE manter o texto digitado e oferecer "tentar de novo". |
| Complex | ENQUANTO <estado>, QUANDO <gatilho>, o sistema DEVE <resposta>. | ENQUANTO o usuário não tiver acesso ao projeto, QUANDO ele abrir o link de um comentário, o sistema DEVE mostrar "sem acesso" sem revelar o conteúdo. |
| Unchanged behavior (Kiro bugfix) | QUANDO <condição>, o sistema DEVE CONTINUAR A <comportamento atual>. | QUANDO um administrador abrir qualquer projeto, o sistema DEVE CONTINUAR A exibir todas as issues. |

## 2. Rules for a good requirement

- **One verifiable behavior per ID.** "o sistema DEVE validar e salvar e notificar" is three requirements. Splitting them lets each have its own test and its own task owner.
- **Name the actor or trigger and the observable result.** "O sistema DEVE lidar com erros" has neither.
- **Describe behavior, not implementation.** Part 1 says "o comentário aparece para todos os membros do projeto em até 5 s". Part 2 decides between polling and websockets.
- **Exact values.** Write "máximo 5.000 caracteres", not "um limite razoável"; "expira após 7 dias sem uso", not "expira depois de um tempo".
- **No "e/ou", "etc.", "quando possível", "se necessário".** Each one hides a decision.
- **Positive and checkable.** Prefer "SE …, ENTÃO o sistema DEVE recusar com a mensagem X" over "o sistema não deve aceitar entradas ruins".
- **Traceable.** Every REQ points to a story (US-xx) and appears in the verification matrix.

Bad → good:
- "O sistema deve ser rápido ao carregar comentários." → "NFR-01: QUANDO a issue abrir, o sistema DEVE exibir os 50 comentários mais recentes em até 1 s no p95 com até 1.000 comentários."
- "Usuários podem editar comentários." → "REQ-004: QUANDO o autor editar o próprio comentário em até 15 min após o envio, o sistema DEVE salvar a nova versão e marcá-lo como 'editado'." + "REQ-005: SE outro usuário tentar editar o comentário, ENTÃO o sistema DEVE recusar com 'apenas o autor pode editar'."

## 3. User stories and Given/When/Then

- Format: "Como <papel>, quero <capacidade>, para <benefício>". The benefit is the part that stops the agent optimizing for the wrong thing.
- **INVEST** (Agile Alliance): Independent, Negotiable, Valuable, Estimable, Small, Testable. In practice, each P1 story should be shippable alone, and every story should have scenarios that can fail.
- **Not every requirement is a user story.** "Como sistema, quero armazenar X no banco" is not a story (Marmelab calls this "faux agile"). Put technical needs in Part 2 or as a REQ.
- **Given/When/Then** (Dado/Quando/Então) describes a scenario: initial state → action → observable outcome. Use concrete data ("Dado uma issue com 3 comentários de Ana") instead of abstractions. Specification by example is effectively few-shot prompting for the agent.
- Usually 2–5 scenarios per story: the main path, the most likely failure, and one boundary.

## 4. Edge-case sweep

Run each class below against each story and keep only the cases that are plausible for this feature. Write each kept case as situation → expected behavior. The point is to decide behavior *before* the agent does it by accident. It is not a license to invent exotic scenarios.

| Class | Questions |
|---|---|
| Empty / zero | No data yet? First use? Empty input? |
| One / many / limit | Exactly at the limit? One over? Very large lists (pagination)? |
| Invalid input | Wrong format, too long, special characters, emoji, HTML/script injection |
| Duplicates | Double submit, double click, retry after timeout, same item twice |
| Concurrency | Two users editing at once, two tabs open, stale data |
| Permissions | No access, access removed mid-flow, another tenant's data, direct URL to a hidden resource |
| Target state | The parent was deleted, archived or moved; the referenced user was removed |
| External failure | Integration down, slow, partial response; retries and idempotency |
| Partial failure | Step 2 of 3 fails: what is left behind, and how does it recover? |
| Time | Time zones, expiry, scheduled jobs, ordering by timestamp, clock skew |
| Existing data | Rows created before this feature: defaults, backfill, legacy formats |
| Rollback | What happens to data written by the new version if the release is reverted? |

## 5. Quantifying non-functional requirements

Only include NFRs that matter for this feature, and make each one testable:

- **Performance:** a metric, a percentile, a load and a data size. "p95 < 300 ms para 50 req/s com 10 mil registros."
- **Security / privacy:** who may see or do what, where it is enforced, what is logged, what must never be exposed. "Autorização verificada no acesso aos dados, não só na interface."
- **Accessibility:** a standard or concrete behavior. "Navegável por teclado; foco visível; rótulos em todos os campos (WCAG 2.1 AA)."
- **Reliability:** behavior under failure. "SE o provedor de e-mail falhar, ENTÃO o sistema DEVE tentar de novo 3 vezes com espera exponencial e registrar a falha."
- **Observability:** the events or metrics an operator needs to answer "is it working?".

## 6. Vague words to replace

When one of these shows up, replace it with a number, a concrete behavior or an explicit decision:

rápido, lento, fácil, simples, intuitivo, amigável, robusto, seguro, escalável, eficiente, flexível, moderno, adequado, apropriado, razoável, suficiente, grande, pequeno, vários, alguns, muitos, normalmente, geralmente, quando possível, se necessário, etc., e/ou, suportar (suportar como?), gerenciar (gerenciar = criar, editar, excluir?), tratar erros (quais erros? qual resposta?), melhorar, otimizar.

## 7. Business rules checklist

For section 7 of the spec, check whether the feature needs:

- **Invariants:** facts that must always hold ("um comentário pertence a exatamente uma issue").
- **Validations,** with the message the user sees.
- **Permissions per role:** a table of role × action.
- **States and transitions:** which states exist, who moves an item between them, and when. A small table or list of `estado → estado (quem, condição)`.
- **Calculations, limits and defaults,** with exact values.
- **Deletion semantics:** hard or soft delete; what happens to dependent items; audit trail.
- **Notifications:** who is notified, through which channel, and when. Only if the feature involves notifications.
