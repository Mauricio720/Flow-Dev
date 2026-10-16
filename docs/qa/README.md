# QA do Flow Dev

Esta árvore guarda jornadas e cenários de uso real do Flow Dev. Os relatórios de sessão registram evidências e veredictos; os arquivos de cenário guardam apenas o estado mais recente.

## Áreas

- `FLOW`: planejamento, especificação, implementação, Review, QA e Pull Request de uma Issue.
- `ISSUE`: criação e edição de Issues.
- `WORK`: fila e acompanhamento de trabalho atribuído.

## Pontos de entrada

- Aplicação web local: `http://localhost:3000`.
- Inicie o ambiente documentado no README da raiz com `pnpm dev` e use uma conta/repositório de QA próprios.
- Não use dados de produção nem altere o banco diretamente durante uma sessão.

## Evidências

Capturas ficam em `docs/qa/evidence/<data>-<escopo>/` e são ignoradas pelo Git. Relatórios referenciam os caminhos; não inclua tokens, credenciais ou logs brutos.

## Ciclo planejado

O ciclo `deterministic-execution` cobre o fluxo da Issue com execução determinística e seus caminhos de retomada e prontidão. Os cenários permanecem `untested` até sessões reais com personas na interface pública.

## Mapeamento conservador de falhas

O relatório da skill de execução não define `Fail` entre os seis estados da matriz, embora use esse nome nas regras de fechamento. Enquanto a skill mantiver esse enum, uma falha não corrigida na sessão fica como `Blocked (human decision)` na matriz, com o bug e a decisão necessária descritos na linha e no relatório. O cenário correspondente permanece `qa_status: fail`, ligado a um bug `open` e `fix_status: pending`. Nunca converta essa falha em `Pass` ou `Skipped`. Use `Fixed` só depois da correção governada e de reteste aprovado; registre então `qa_status: pass`, `fix_status: fixed` e `retest_status: pass`.
