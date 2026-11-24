---
schema_version: "compozy.tasks/v2"
workflow: autenticacao-multiplos-metodos
graph:
  nodes:
    - id: task_01
      file: task_01.md
    - id: task_02
      file: task_02.md
    - id: task_03
      file: task_03.md
    - id: task_04
      file: task_04.md
    - id: task_05
      file: task_05.md
    - id: task_06
      file: task_06.md
    - id: task_07
      file: task_07.md
    - id: task_08
      file: task_08.md
    - id: task_09
      file: task_09.md
  edges:
    - from: task_03
      to: task_04
    - from: task_03
      to: task_05
    - from: task_03
      to: task_06
    - from: task_05
      to: task_07
    - from: task_06
      to: task_07
    - from: task_01
      to: task_08
    - from: task_02
      to: task_08
    - from: task_04
      to: task_08
    - from: task_06
      to: task_08
    - from: task_07
      to: task_09
    - from: task_08
      to: task_09
---

# Tarefas: Autenticação com vários métodos de entrada

> **Spec:** [spec.md](spec.md) · **Data:** 2026-11-23 · **Total:** 9 tarefas, 33 mini-tarefas

## Objetivo
Entrar no Flow Dev com GitHub, Google ou email e senha, vincular métodos à mesma conta e usar o produto sem GitHub dentro dos limites da spec.

## Estado
| Tarefa | Tipo | Complexidade | Depende de | Mini-tarefas | Status |
|---|---|---|---|---|---|
| [01 — Acesso a dados para usuários sem GitHub](task_01.md) | backend | high | — | 4/4 | completed |
| [02 — Autorização de repositório exige GitHub vinculado](task_02.md) | backend | high | — | 0/3 | in_progress |
| [03 — Google, política OAuth, rota e limites](task_03.md) | backend | high | — | 0/5 | pending |
| [04 — Vínculo explícito de métodos](task_04.md) | backend | medium | 03 | 0/3 | pending |
| [05 — Email e senha com Resend](task_05.md) | backend | high | 03 | 0/5 | pending |
| [06 — Tela de login: métodos e erros por provedor](task_06.md) | frontend | medium | 03 | 0/3 | pending |
| [07 — Formulário de email e senha, verificação e redefinição](task_07.md) | frontend | medium | 05, 06 | 0/4 | pending |
| [08 — Conta: métodos vinculados e aviso de GitHub](task_08.md) | frontend | medium | 01, 02, 04, 06 | 0/3 | pending |
| [09 — Jornadas ponta a ponta e smoke](task_09.md) | test | medium | 07, 08 | 0/3 | pending |

**Ondas:** 1 = 01, 02, 03 (em paralelo, arquivos disjuntos) · 2 = 04, 05, 06 (em paralelo depois de 03) · 3 = 07 e 08 · 4 = 09.

## Como executar (controle)
Veja o progresso e a próxima mini-tarefa liberada a qualquer momento: `python3 -I .agents/skills/spec-to-tasks/scripts/tasks_status.py docs/specs/autenticacao-multiplos-metodos`.

1. **Escolha** a próxima tarefa liberada: `pending`, e todas as de que ela depende estão `completed`.
2. **Implemente** numa sessão nova: "implemente a mini-tarefa 02.1 de `task_02.md`" (ou a tarefa inteira). O implementador:
   - muda o `status` para `in_progress`;
   - marca `[x]` em cada mini-tarefa só depois de rodar o "Pronto quando" dela;
   - anota no "Registro de execução" os comandos e o resultado.
3. **Feche a tarefa:** ela passa a `completed` quando todas as mini-tarefas estão marcadas e os critérios de sucesso foram comprovados por comando. Repita a partir do passo 1 até todas as tarefas estarem `completed`.
4. **Revisão final, uma vez, depois de todas as tarefas:** "revise a feature contra a spec" com **spec-conformance**. O veredito vai para `reviews/` e para a seção "Revisão final".
5. **Se REPROVADO:** o prompt de correção vira uma rodada de correções; depois, nova revisão final.

Esta pasta foi gerada sem a etapa de aprovação prévia do plano, porque o pedido foi "pode gerar".

## Revisão final

## Restrições globais
- Seguir `.agents/rules/code-standards.md`: sem comentários, arquivo com até 100 linhas, função com até 30, no máximo 3 parâmetros, sem linhas em branco dentro de funções, sem números ou textos mágicos.
- Texto de interface em português do Brasil.
- Verificação proporcional: durante o trabalho, só os testes afetados (`pnpm --dir <pacote> exec vitest run <arquivo>`) e o typecheck do pacote; suíte completa por pacote uma vez, ao final. Não definir `TEST_DATABASE_URL`. Não aumentar `testTimeout`.
- `apps/web`: ler o guia relevante em `node_modules/next/dist/docs/` antes de criar rota ou página (esta versão do Next.js tem mudanças incompatíveis).
- Colocação de arquivos: skills `nextjs-folder-structure` (frontend), `layered-backend` (backend) e `trpc-nextjs` (procedimentos).
- Testes seguem `.agents/skills/software-testing/SKILL.md`: oráculo vindo da spec, Postgres real onde SQL ou restrições são o risco, dublês só para Google, Resend e GitHub.
- Nenhum segredo no código; variáveis novas: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `RESEND_API_KEY`, `EMAIL_FROM`.

## Premissas e bloqueios
Nenhum bloqueio. Premissas seguidas: Q-05 a Q-08 como sugeridas na spec; a spec §14 prevê nenhuma migração (confirmar na tarefa 05); o Resend SDK aceita apontar a URL base por variável de ambiente para o servidor falso do e2e (confirmar na tarefa 09).

## Matriz de cobertura
| ID da spec | Descrição curta | Tarefa · mini-tarefa |
|---|---|---|
| REQ-001 a REQ-003 | tela de login com métodos, erros por provedor, formulário condicional | 06 · 06.1–06.3 |
| REQ-004, V-07c, B-07 | destino pedido e sanitização | 03 · 03.5 |
| REQ-005 a REQ-008, V-01a–e, B-08 | Google | 03 · 03.1–03.3 |
| REQ-009 a REQ-015 | cadastro, verificação, entrada por email | 05 · 05.2–05.4 |
| REQ-016, REQ-017 | recuperação de senha | 05 · 05.5 |
| REQ-018, REQ-019, REQ-022, V-03a–d | acesso a dados sem GitHub, busca de admin, não admin | 01 · 01.1–01.4 |
| REQ-020, REQ-021, V-04a–c | repositório exige vínculo | 02 · 02.1–02.3 |
| REQ-020 (interface), REQ-025, V-12 | aviso e tela de conta | 08 · 08.1–08.3 |
| REQ-023, REQ-024, REQ-026, REQ-006, V-02a–e, B-05 | vínculo explícito | 04 · 04.1–04.3 |
| V-02f, B-06 | contas separadas com email real | 05 · 05.2 |
| NFR-01, NFR-02, NFR-06, B-02, B-03, B-09, V-05a–g, V-06a–d | segurança e falhas de email/senha | 05 · 05.1–05.5 |
| NFR-03, NFR-04, B-04, V-07a, V-07b | limites e política OAuth | 03 · 03.4, 03.5 |
| NFR-05, V-09d | acessibilidade do formulário | 07 · 07.1 |
| V-09a–c, V-09e, B-01 | testes de UI da tela de login | 06 · 06.1–06.3 |
| §9 (não muda), V-08a, V-08c | GitHub, caminhos desativados | 03 · 03.5 |
| §9 (não muda), V-08b | admin por GitHub | 01 · 01.4 |
| V-10a, V-10b | jornadas P1 | 09 · 09.1, 09.2 |
| V-11 | smoke Google real | 09 · 09.3 |

## Foco de revisão
1. Usuário só Google em `access.me`, na lista de projetos e na busca de admin → sem `NOT_FOUND` → testes em 01.
2. Usuário sem GitHub inicia a autorização de repositório → recusado antes de guardar credencial → teste em 02.
3. Google com email igual ao de outro usuário sem vínculo → recusa, nada vinculado → teste em 04.
4. Cadastro com email já existente → mesma resposta de email novo → teste em 05.
5. Erro de provedor sem o parâmetro `provedor` → mensagem genérica que não cita provedor → teste em 06.
