# Revisão de conformidade 003: Issue Author e Planejamento com a assinatura da máquina

> **Data:** 2026-11-22 · **Escopo:** feature inteira, terceira rodada (reconfere as correções da review-002 e tudo que elas tocaram; repete todas as verificações) · **Intervalo:** mudanças não commitadas sobre `c78d44d` (`git diff HEAD` + arquivos novos)
> **Spec:** `spec.md`, `v00-spike.md`, `_tasks.md`, `task_01.md`–`task_07.md`, `reviews/review-001.md`, `reviews/review-002.md`
> **Regras lidas:** `CLAUDE.md` → `AGENTS.md`, `apps/web/AGENTS.md`, `.agents/rules/code-standards.md`, `.agents/rules/e2e-testing.md`, skill `layered-backend` (regras centrais)
> **Prontidão:** 27 de 27 mini-tarefas marcadas; as 7 tarefas seguem `in_progress`, à espera desta revisão (passo 4 do `_tasks.md`).
> **Conflito de interesse:** as correções da review-002 (F-1 e M-5) foram aplicadas por mim, na mesma sessão, a pedido do usuário. Esta rodada revisa trabalho meu; por isso a decisão sobre F-1 está descrita abaixo com o raciocínio, para o usuário julgar.

## Veredito: APROVADO COM RESSALVAS

Nenhum achado bloqueante ou importante. Todas as verificações passaram, incluindo o Playwright (que as rodadas anteriores não conseguiram rodar) e a suíte unitária da API sob carga. Fica **1 achado menor** de registro (o V-11a está marcado com uma condição que o `.env.local` atual não cumpre) e as 4 atualizações de spec que seguem abertas desde a review-001.

| Bloqueante | Importante | Menor | Spec a discutir |
|---|---|---|---|
| 0 | 0 | 1 | 4 |

## Verificação executada

| Comando | Saída | Resultado |
|---|---|---|
| `pnpm typecheck` | exit 0 | ✅ |
| `pnpm lint` | exit 0 | ✅ |
| `pnpm --dir packages/api test` (2 vezes, máquina ociosa) | exit 0 nas 2 · 78 arquivos, 483 testes | ✅ |
| `pnpm --dir packages/api test` com 2 `pnpm --dir apps/web test` em paralelo | exit 0 · 483 testes | ✅ (na review-002 isso falhava 3 de 3) |
| `pnpm --dir packages/api test:integration` (sem `TEST_DATABASE_URL`) | exit 0 · 63 arquivos, 387 testes | ✅ |
| `pnpm --dir apps/web test` | exit 0 · 58 arquivos, 281 testes | ✅ |
| `playwright test e2e/project-admin.spec.ts e2e/project-agents.spec.ts` contra o `next dev` do usuário (`http://localhost:3000`, banco de desenvolvimento local na 0045) | exit 0 · 6 passed (E2E-003, E2E-005, E2E-006, V-10c e mais 2), 2 skipped (`fixme` já existentes) | ✅ |
| Contagem de `users` / `projects` / `project_agent_settings` no banco de desenvolvimento, antes e depois do Playwright | 1/2/2 → 1/2/2 (o `seed.cleanup()` das fixtures apagou o que semeou) | ✅ |
| `scan_diff.py --worktree --max-lines 100` | mesmas dicas da review-002, todas já explicadas; arquivos longos só os 4 que já passavam de 100 no `HEAD` | — |
| grep de V-10d (`ISSUE_AUTHOR_\|PLANNING_BASE_URL\|PLANNING_API_KEY\|FLOW_DEV_INTERNAL_API_KEY\|DevControl`) em `packages/api/src`, `packages/api/test`, `apps/web/src`, `apps/web/e2e` | só os dois testes que **removem** essas variáveis do ambiente (`taskPlanningController.test.ts:49`, `test/composition.test.ts:32`) | ✅ |
| grep do caminho antigo `src/infra/composition.test` em docs, tarefas e código | nenhuma referência pendurada | ✅ |
| `pgrep -af fakeCli` ao fim | nenhum processo | ✅ |

## Estado das correções da review-002

| Achado | Status | Evidência |
|---|---|---|
| F-1 `composition.test.ts` estourando 5 s sob carga | ✅ | Teste movido para `packages/api/test/composition.test.ts` (46 linhas, mesmas três asserções: UT-045, UT-036, V-10a); `src/infra/composition.test.ts` apagado. Unitária verde sob carga; integração 387 = 384 + 3. Nenhum `testTimeout` mudou (`vitest.config.ts` não define nenhum; `vitest.integration.config.ts:6` segue com os 15 s de antes). `contextMcpEndpoint.ts` voltou aos imports estáticos originais (a tentativa intermediária foi desfeita); `context-mcp*.test.ts` verdes |
| M-5 passada manual sem registro | ✅, com ressalva | `spec.md` (Histórico 2026-11-22 e "Resultado do V-11"), `task_06.md` 06.5 `[x]`, `task_07.md` V-11a–c `[x]`, todos dizendo "por declaração do usuário, sem tempos". Ressalva em M-6 |

### Sobre a decisão em F-1

`AGENTS.md` diz: "Não aumente `testTimeout` nem reduza workers para contornar lentidão; investigue a causa." A investigação mediu que o `import` de `composition.ts` custa ~2 s com a máquina ociosa e ~7 s com uma suíte web em paralelo (drizzle/postgres ≈ 1 s, o resto do grafo ≈ 0,9 s, o SDK do MCP ≈ 0,1 s). A causa é o teste carregar o grafo de produção inteiro, e não há defeito de comportamento a corrigir. O teste foi para onde ficam os outros que carregam o grafo de produção (`test/routes.test.ts` e afins), sem mudar timeout nenhum. Considero isso conforme a regra. Mesmo assim, o efeito prático é que o teste passou a ter uma janela de 15 s em vez de 5 s; se o usuário entender isso como contornar a regra, a alternativa é reduzir o grafo que `composition.ts` carrega, o que é uma mudança maior.

## Conformidade com a spec

Os itens já ✅ na review-002 continuam ✅: as correções desta rodada não tocaram código de produção (só moveram um teste e editaram documentos). Mudanças de status:

| Item | Status | Evidência |
|---|---|---|
| REQ-014 / REQ-015 / US-03 cen. 1–2 (E2E-006) | ✅ | Playwright verde nesta rodada (`project-agents.spec.ts:3`) |
| REQ-021 / US-04 cen. 2 (V-10c) | ✅ | Playwright verde (`project-agents.spec.ts:34`) |
| "Não muda": nome, descrição, repositório (E2E-005) | ✅ | Playwright verde |
| US-04 cen. 1 / spec §24 "V-11 com `.env.local` sem as variáveis do Dev_Control" | 🟡 | Código não lê as variáveis (grep acima) e o V-10a as remove do ambiente antes de compor o worker; mas o `.env.local` do app ainda as tem (M-6) |
| NFR-02 | 🟡 | Igual à review-002: só os tempos do substituto; a passada manual não tem tempos |
| REQ-012 | 🟡 | Igual: `localIssueAuthorGateway.ts:26` com `new AbortController().signal` (spec a discutir 1) |

## Regras do projeto

| Regra (fonte) | Status | Evidência |
|---|---|---|
| `.ts` ≤ 100 linhas | ✅ | `test/composition.test.ts` 46; exceções só em arquivos já acima no `HEAD` |
| Funções ≤ 30, sem comentários, sem linha em branco em função | ✅ | nada novo nesta rodada além do teste movido, sem mudança de corpo |
| Camadas (`layered-backend`) | ✅ | sem mudança |
| E2E: independente, locators acessíveis, limpa o que cria, nunca produção (`e2e-testing.md`) | ✅ | contagens iguais antes e depois; banco de desenvolvimento local |
| Verificação proporcional; não aumentar `testTimeout` (`AGENTS.md`) | ✅ | ver "Sobre a decisão em F-1" |

## Achados

### task_07 · 07.4 (V-11a)

#### M-6 (Menor): V-11a está marcado com "`.env.local` sem as variáveis do Dev_Control", mas o arquivo ainda as tem
- **Onde:** `task_07.md:81`, `- [x] V-11a (...): manual, com \`.env.local\` sem as variáveis do Dev_Control e \`pnpm dev\``; `apps/web/.env.local` tem `ISSUE_AUTHOR_BASE_URL`, `ISSUE_AUTHOR_API_KEY`, `FLOW_DEV_INTERNAL_API_KEY`, `PLANNING_BASE_URL` e `PLANNING_API_KEY` (só os nomes foram lidos).
- **Contra:** spec §24 ("V-11 executado com o `.env.local` sem as variáveis do Dev_Control"); US-04, "Teste independente" e cen. 1.
- **Problema:** o comportamento não muda, porque nenhum código lê essas variáveis e o ambiente do agente usa lista de permissão (NFR-01). Mas a caixa marcada afirma uma condição que não aconteceu: a passada manual rodou com elas no arquivo. A marcação foi feita por mim na rodada anterior, sem conferir o arquivo.
- **Correção esperada:** o usuário apaga as 5 linhas de `apps/web/.env.local` (arquivo local, fora do git) e reinicia o `pnpm dev`/worker para confirmar que tudo sobe; ou deixa as linhas e reescreve o V-11a para "rodou com as variáveis presentes, mas sem uso: nenhum código as lê (V-10d)".

## Atualizações de spec a discutir (abertas desde a review-001)

1. **REQ-012 para a geração:** o port `IssueAuthorGateway` não recebe `signal`, e `localIssueAuthorGateway.ts:26` passa um sinal que nunca dispara. Decidir se a geração precisa ser cancelável; se não, tirar o sinal morto.
2. **`.env.example`:** a §24 o pede e ele não existe no repositório.
3. **Planejamento com ferramentas:** explicitar no REQ-005 que o Dev_Control já dava as ferramentas de contexto ao planejamento.
4. **Gate de prontidão:** o `_tasks.md` deve dizer que a revisão final roda com as mini-tarefas marcadas e as tarefas em `in_progress`, e se "APROVADO COM RESSALVAS" basta para fechar uma tarefa (o passo 4 fala só em "APROVADO").

## Divergências entre os registros e a evidência

- V-11a `[x]` → condição do `.env.local` não cumprida (M-6).
- Fora isso, os números registrados (483 unitários, 387 de integração, 281 web) batem com esta rodada.

## Prompt de correção

> Opcional; nenhum item impede o fechamento pelas regras desta revisão.
> 1. **M-6** — Apague de `apps/web/.env.local` as linhas `ISSUE_AUTHOR_BASE_URL`, `ISSUE_AUTHOR_API_KEY`, `FLOW_DEV_INTERNAL_API_KEY`, `PLANNING_BASE_URL` e `PLANNING_API_KEY`, reinicie `pnpm dev` e o worker e confirme que um planejamento começa. Se preferir manter as linhas, reescreva o V-11a em `docs/specs/agentes-locais-por-assinatura/task_07.md:81` dizendo que a passada rodou com elas presentes e sem uso.
> 2. Decida os 4 itens de "Spec a discutir" e registre a decisão na `spec.md` (Histórico) ou no `_tasks.md`.
