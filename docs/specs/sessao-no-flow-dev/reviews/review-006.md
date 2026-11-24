# Revalidação das correções da review-005

> **Data:** 2026-11-23 · **Escopo:** somente os cinco achados da review-005 e as duas divergências documentais listadas nela. Os demais requisitos continuam cobertos pela revisão integral `review-005.md`.
> **Veredito do delta:** **CORRIGIDO** — não encontrei bloqueantes ou importantes restantes nos caminhos revalidados.
> A dispensa expressa de V-30a/b, V-32g e V-31 manual em `task_07.md` continua preservada.

| Achado anterior | Revalidação | Evidência |
|---|---|---|
| B-1 — pedido sobrevive ao encerramento e aceita resposta tardia | Corrigido | `SessionRequestGate` serializa abertura/registro com cancelamento; DAOs bloqueiam a linha da sessão e recusam inserções/respostas se houver controle pendente ou estado final; controller verifica atividade. Testes cobrem barreiras antes do INSERT e antes do registro, controle persistido e resposta após encerramento. |
| B-2 — Stop deixa pedido sem interrupção disponível | Corrigido | O worker interrompe sessões `waiting` quando ainda há pedido pendente; a conversa mostra Interromper nesse caso. Os testes cobrem Stop→pergunta, pergunta→Stop e waiting sem pedido (B-30). |
| B-3 — retomada passa por end solicitado antes do claim | Corrigido | `claimResume` exige `end_requested_at IS NULL` no `UPDATE`. O teste lista a sessão, persiste end antes do claim, comprova claim nulo e termina/captura no ciclo seguinte sem `resume`. |
| B-4 — cartões de texto igual compartilham rádio e id | Corrigido | `useId` mais índice cria nomes de grupo e ids únicos por cartão/pergunta. RTL monta dois cartões iguais, ativa opções por teclado, envia o valor marcado e verifica rótulos de “Outra” independentes. |
| I-1 — ensaio não cobria emissão, pergunta e resposta | Corrigido com limite declarado | O ensaio mede 20 sessões concorrentes, persistência observada no Postgres, primeira resposta da timeline a cada texto/pergunta e persistência de resposta até resolução no runtime. O relatório não chama a resposta tRPC de tela renderizada. |
| Divergências em PRODUCT.md e DESIGN.md | Corrigidas | Produto descreve sessão local iniciada separadamente após aprovação; design registra cartões de pergunta e aprovação como exceções de ação na conversa. |

## Verificação

| Comando | Resultado |
|---|---|
| `rtk pnpm --dir packages/api test` | 101 arquivos · 664 testes passam |
| `rtk pnpm --dir packages/api test:integration` | 115 arquivos passam, 2 ignorados · 630 testes passam, 5 ignorados; PostgreSQL descartável, sem `TEST_DATABASE_URL` |
| `rtk pnpm --dir apps/web test` | 85 arquivos · 421 testes passam |
| `rtk proxy pnpm typecheck` | API e web passam |
| `rtk pnpm lint` | passa |
| `rtk pnpm build` | passa; 17 páginas. Mantém dois avisos de tracing em `agentInstructions.ts`, arquivo fora deste delta |
| `rtk pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts --silent=false test/session-latency.test.ts` | passa · entrada p95 1.243 ms; texto: persistência observada p95 315 ms, timeline p95 349 ms; pergunta: 318 ms e 349 ms; resposta persistida→runtime p95 656 ms. Amostra e máximos em `latency-report.md` |
| Testes focados de broker, controles/DAO e cartões | 3 unitários API, 13 integração API e 22 testes web passam |
| `rtk git diff --check` e checker de tasks | passam · 7 tarefas e 26/26 mini-tarefas concluídas |

A latência observada termina na primeira resposta da timeline obtida pelo caller interno; não inclui rede do navegador nem renderização React. O benchmark documenta esse limite. Nenhuma execução manual/E2E dispensada é apresentada como aprovada.

Esta revalidação cobre o delta da review-005, sem reexecutar uma auditoria integral da feature. A review-005 permanece no histórico com seu veredito original.
