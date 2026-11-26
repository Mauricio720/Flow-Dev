# Spec template

Use this structure for every spec. The headings are in Portuguese, the user's default; translate them when writing in another language and keep the IDs as they are.

**Omit, don't pad.** When a section does not apply, keep the heading with one line saying why (e.g. "Não se aplica: nenhuma integração externa"). That tells the reviewer it was considered rather than forgotten. For an L2 mini-spec, use `mini-spec-template.md` instead.

**Say each fact once.** Part 2 refers to Part 1 by ID ("implementa REQ-003"); it does not restate the rule. The matrix refers to IDs; it does not restate scenarios. Most excess length comes from repetition across sections. Budget: ~2.000–5.000 words for L3 and ~3.000–6.000 for L4. Over that, cut repetition, then propose splitting the feature.

---

```markdown
# Spec: <Nome da feature>

> **Status:** Rascunho | Em revisão | Aprovada | Implementada · **Data:** AAAA-MM-DD · **Nível:** L2 mini-spec | L3 spec-first | L4 ancorada
> **Contexto lido:** <arquivos/docs principais que embasaram a spec>

## Resumo para revisão

<!-- For a reviewer who will read only this. 6–10 lines total. -->
- **O que muda:** <2–3 linhas, do ponto de vista do usuário>
- **Por quê:** <o problema e quem sofre com ele>
- **Decisões principais:** <DEC-01 …, DEC-02 …, uma linha cada>
- **Riscos principais:** <1–3 riscos e a mitigação>
- **Como vamos verificar:** <níveis de teste e o cenário ponta a ponta mais importante>
- **Pendências:** <Q-01 …, ou "nenhuma">

---

# Parte 1 — Produto (o quê e por quê)

<!-- No technology here: no frameworks, tables, endpoints or file names. Describe behavior in domain language so this part stays valid if the stack changes. -->

## 1. Contexto e problema
<!-- Objective background facts plus the problem from the user's point of view. Link to what exists today (screens, flows, files) rather than re-describing it. -->

## 2. Usuários e papéis
<!-- Each persona or role touched, and what they need. Include secondary roles (admin, support) when the feature affects them. -->

## 3. Objetivos
<!-- Observable outcomes: what users can do after this ships that they could not before, and what the system guarantees. Not KPIs. -->

## 4. Fora de escopo
<!-- Things that could reasonably be goals but were chosen not to be, each with a reason. "O sistema não deve travar" is not a non-goal. -->

## 5. Histórias de usuário

### US-01 — <título curto> (P1)
Como <papel>, quero <capacidade>, para <benefício>.
- **Por que P1:** <valor>
- **Teste independente:** <como verificar só esta história entregando valor>
- **Cenários de aceite:**
  1. **Dado** <estado>, **quando** <ação>, **então** <resultado observável>
  2. …

<!-- Order by priority. Each P1 story should be shippable alone (the MVP). -->

## 6. Requisitos funcionais
<!-- EARS, one verifiable behavior per ID. See requirements-writing.md. -->
- **REQ-001** (US-01): QUANDO <gatilho>, o sistema DEVE <resposta>.
- **REQ-002** (US-01): SE <condição indesejada>, ENTÃO o sistema DEVE <resposta>.
- **REQ-003** (US-02): ENQUANTO <estado>, o sistema DEVE <resposta>.

## 7. Regras de negócio
<!-- Precise domain rules: invariants ("uma reserva pertence a exatamente um cliente"), validations and the message the user sees, permissions per role, states and allowed transitions, calculations, limits and defaults with exact values. A small table works well for permissions and for states. -->

## 8. Casos de borda e erros
<!-- Result of the edge-case sweep. Keep only cases that are plausible for this feature. If a case is really a requirement, write it as an EARS REQ in section 6 (SE … ENTÃO …) and don't repeat it here. This table is for the remaining cases. Give each an ID (B-01) so the matrix can reference it. -->
| ID | Situação | Comportamento esperado | Ref. |
|---|---|---|---|

## 9. Comportamento que não muda
<!-- Required when changing an existing system. What must keep working exactly as today. -->
- QUANDO <condição>, o sistema DEVE CONTINUAR A <comportamento atual>.

## 10. Requisitos não funcionais
<!-- Only those that matter for this feature, each quantified or tied to observable behavior. -->
- **NFR-01** (desempenho): <ex.: a lista de 500 itens carrega em até 1 s no p95>
- **NFR-02** (segurança/privacidade): …
- **NFR-03** (acessibilidade): …

## 11. Premissas e dependências
<!-- What you assumed (especially in non-interactive mode), and what this depends on: other features, external services, decisions owned by others. -->

---

# Parte 2 — Técnica (como)

## 12. Visão geral da solução
<!-- 1–2 paragraphs: the approach, and why it fits the codebase. Optional mermaid diagram when there are 3 or more interacting components. -->

## 13. Componentes e responsabilidades
| Componente | Responsabilidade | Local | Novo/Alterado |
|---|---|---|---|

## 14. Modelo de dados
<!-- Entities, fields with types and constraints, relationships, indexes that matter. Migration of existing data: what happens to rows that exist today. Link to the schema file instead of copying it whole. -->

## 15. Interfaces e contratos
<!-- APIs, procedures, events, CLI. For each: name, input, output, errors. Keep each sketch to ~20 lines, in the project's language. Show the contract other code depends on, not the implementation. -->

## 16. Fluxos principais
<!-- Step-by-step for the 1–3 most important flows, including where permission checks and validation happen. -->

## 17. Decisões técnicas
### DEC-01 — <título>
- **Decisão:** <o que foi escolhido>
- **Alternativas consideradas:** <opção B — por que não>; <opção C — por que não>
- **Consequências:** <o que fica mais fácil/difícil; o que foi abrido mão>

## 18. Segurança, privacidade e permissões
<!-- Where authorization is enforced (close to the data, not only in the UI), what data is sensitive, abuse cases. -->

## 19. Observabilidade
<!-- Logs, metrics and alerts needed to operate the feature. "Não se aplica" is fine for small internal features. -->

## 20. Migração, rollout e reversão
<!-- Order of deployment, feature flags, backfill, how to roll back safely, what happens to data written by the new version if you roll back. -->

## 21. Riscos técnicos
| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|

---

# Parte 3 — Verificação

## 22. Estratégia de testes
<!-- Based on the project's testing skill (e.g. `software-testing`). State: the frameworks and harnesses already in the project; which boundaries are exercised for real for this feature (database, HTTP, external providers, UI) and what is replaced by doubles, and why; how variable inputs are controlled (clock, randomness, IDs, concurrency); the 1–3 critical end-to-end journeys; and a "Sem prova automática" line naming the important risks no automated test proves (real model behavior, real external accounts), so the user checks them in their own manual test after the feature is done. Do not plan manual smokes, manual spikes or opt-in runs against real services: the user does all manual testing after every task. No fixed ratio between levels. -->

## 23. Matriz de verificação
<!-- Compact: one row per requirement group or story, not one row per scenario. Every REQ, every story scenario and every edge case (B-xx) must be traceable to a row through the "Cobre" column. Name the test cases in a few words; spec-to-tasks turns them into concrete tests later. A typical L3 feature lands at 8–15 rows. -->
<!-- Automated tests only: no row is a manual smoke, manual spike or run against real accounts. -->
<!-- Each row is a risk card from the testing skill. "Falha que detecta" is the plausible wrong implementation the row must catch. "Fronteira real" names what is exercised for real and what is a double. The expected results in "Casos" come from the requirements (the oracle), never from the code. -->
| ID | Cobre | Falha que detecta | Fronteira real | Casos (resumo) |
|---|---|---|---|---|
| V-01 | US-01 (cen. 1–3), REQ-001–003, B-02 | comentário salvo sem autor; lista fora de ordem; não membro consegue ler | serviço + Postgres de teste real; sem dublê | cria; lista em ordem; recusa sem acesso (FORBIDDEN) |
| V-02 | US-01–02 ponta a ponta | partes não conectadas na tela | UI + API + banco de teste | membro comenta, outro vê, autor edita e exclui |

## 24. Definição de pronto
<!-- Real automated commands from the project (e.g. `pnpm --dir packages/api test`, `pnpm typecheck`), never a manual smoke; the e2e scenario that proves the P1 stories; no [PRECISA ESCLARECER] left; spec updated with what changed during implementation. -->

---

## Questões em aberto
<!-- Ordered by how much the answer would change the design. -->
- **Q-01:** <pergunta> — **Sugestão:** <resposta recomendada> — **Impacto se ficar em aberto:** <o que bloqueia>

## Sugestões fora do escopo
<!-- Good ideas you noticed that the user did NOT ask for. They are not requirements until the user accepts them. "Nenhuma" if none. -->
- <sugestão> — <por que pode valer a pena>

## Histórico
- AAAA-MM-DD — Criação da spec.
```
