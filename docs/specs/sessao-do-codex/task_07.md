---
status: in_progress
title: "Validação e entrega"
type: test
complexity: high
---

# Task 07: Validação e entrega

## Visão geral
Provar as conexões com uma jornada Playwright pelo runtime Codex real contra servidor falso, medir os prazos e executar o smoke com Codex real. Fechar documentação, rollout e gates antes da única revisão final da feature.

<critical>
- LEIA `spec.md`, `_tasks.md`, `AGENTS.md`, as instruções locais aplicáveis e `.agents/rules/code-standards.md` antes de começar.
- FAÇA UMA MINI-TAREFA POR VEZ, na ordem. Só marque `[x]` depois de executar o “Pronto quando” e conferir o resultado.
- NÃO saia dos arquivos listados sem registrar o motivo no Registro de execução. Divida helpers e testes para respeitar 100 linhas por arquivo `.ts`, 30 linhas por função e até 3 parâmetros; não transforme uma mini-tarefa num diff maior que aproximadamente 200–300 linhas sem subdividi-la no plano.
- TESTES JUNTO COM O CÓDIGO: siga `.agents/skills/software-testing/SKILL.md` e `references/escolha-e-desenho.md`. Cenário → efeito específico esperado da spec → fronteira real. Sem asserções vagas, expectativas calculadas pela implementação ou mocks do comportamento sob teste. Controle relógio, concorrência e aleatoriedade.
- Ao começar, mude o status para `in_progress` aqui e no manifesto. Marque também cada teste atribuído somente com evidência. Use `completed` apenas após todas as mini-tarefas e critérios de sucesso; a revisão `spec-conformance` acontece uma vez na feature inteira, após as sete tarefas.
- Preserve alterações já presentes no workspace. Não faça commit, push, PR nem implemente sugestões fora do escopo.
</critical>

## Requisitos
- **NFR-18:** Mensagem/resposta DEVE chegar em até 2 s no p95 local, texto/pedido na tela em até 3 s; leitura publicada do preflight em até 200 ms, sem processo externo.
- **§9 — não muda:** Claude conserva comportamento salvo padrão da rota; Issue Author/Planejamento continuam isolados, ignore-user-config e read-only; sessões Codex usam login/config/regras/skills pessoais; sem escrita direta no clone, perfil ou GitHub fora das exceções aprovadas; histórico/tabelas/permissões compartilhados.
- **§4 — fora de escopo:** Não adicionar modo plano, subagentes visíveis, web/image/review/goals/memory, turn/steer, instalação/login pelo Flow Dev ou troca de agente durante sessão.
- **§20:** Rollout DEVE seguir spike → migration → tradutores → runtime falso → registro/catálogo → tela; reversão de código antes de rollback SQL e efeitos nos pedidos novos documentados.
- **§24:** Executar suites, três specs E2E afetados, typecheck/lint/build, smoke real e atualizar Spec D conforme definição de pronto.
- **§9.1:** Claude DEVE preservar o comportamento anterior, salvo padrão da rota.
- **§9.2:** Codex de Issue Author/Planejamento DEVE preservar isolamento, ignore-user-config e read-only.
- **§9.3:** Sessão Codex DEVE usar login, config.toml, regras e skills pessoais.
- **§9.4:** Flow Dev NÃO DEVE escrever diretamente no clone, ~/.codex ou GitHub, salvo Permitir sempre conforme contrato.
- **§9.5:** Conversa, pedidos, eventos, artefatos e leitura DEVEM continuar nos caminhos compartilhados.

## Interfaces
- **Consome:** aplicação, worker com `CodexAppServerRuntime`, `ScriptedCodexAppServer`, Postgres de teste, fixtures existentes e evidências das seis tarefas.
- **Produz:** `apps/web/e2e/codex-session.spec.ts`, fixtures Codex por clone/sessão, relatório de latência e `v52-smoke.md`; Spec D alinhada ao comportamento final.
- **Produz:** registro de comandos/resultados reais e limitações em cada mini-tarefa, sem declarar sucesso se teste estiver skipped ou ambiente ausente.
- `reviews/` será criado por spec-conformance após todas as tarefas completed; não há revisão individual nesta tarefa.

## Mini-tarefas

- [ ] **07.1 — Percorrer conversa, pergunta e aprovação pela interface**
  - **Arquivos:** `apps/web/e2e/codex-session.spec.ts (criar)`; `apps/web/e2e/fixtures/codexSessionScript.ts (criar)`; `apps/web/e2e/fixtures/session.ts`; `apps/web/e2e/fixtures/workSeed.ts`; `apps/web/e2e/sessionWorkerSetup.ts`; `apps/web/playwright.config.ts`; `packages/api/test/support/scriptedCodexAppServer.ts (somente extensões do roteiro necessárias)`.
  - **Testes:** V-53a, V-53b
  - **Pronto quando:** `rtk pnpm --dir apps/web test:e2e e2e/codex-session.spec.ts` passa com ambiente descartável configurado; comprovar que Codex passou pelo cliente RPC e processo falso, não por ScriptedSessionRuntime.
  - **Nota:** Leia .agents/rules/e2e-testing.md. Worker usa NODE_ENV=test; webServer de pnpm dev não herda essa condição automaticamente. Fake só no worker de teste; catálogo chega pelo banco. Isolar roteiro por clone e remover dados/processos próprios.

- [ ] **07.2 — Medir prazos e conferir os comportamentos preservados**
  - **Arquivos:** `packages/api/test/codex-session-latency.test.ts (criar)`; `packages/api/test/codex-session-regression.test.ts (criar)`; `packages/api/test/session-latency-support.ts`; `packages/api/test/session-plans-regression.test.ts`; `apps/web/e2e/session-conversation.spec.ts`; `apps/web/e2e/task-plan.spec.ts`; `docs/specs/sessao-do-codex/latency-report.md (criar)`.
  - **Testes:** IT-508, IT-509
  - **Pronto quando:** `rtk pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/codex-session-latency.test.ts test/codex-session-regression.test.ts` e `rtk pnpm --dir apps/web test:e2e e2e/session-conversation.spec.ts e2e/task-plan.spec.ts` passam; relatório registra amostras, fronteiras, p95 e prazos observados.
  - **Nota:** Sem sleeps fixos para validar comportamento nem expectativa de latência derivada de relógio falso. Não confundir tempo do Codex para pensar com transporte de mensagem concluída. Exercitar casos existentes das Specs B–D alterados sem duplicar regras já cobertas.

- [ ] **07.3 — Executar smoke com Codex real pela UI**
  - **Arquivos:** `docs/specs/sessao-do-codex/v52-smoke.md (criar)`.
  - **Testes:** V-52a, V-52b, V-52c
  - **Pronto quando:** Executar os três roteiros manualmente pela UI em projeto/clone de teste e registrar versão, escolhas, passos, resultados e evidência sanitizada. Sem Codex/login/browser disponível, manter este passo pendente e relatar o impedimento.
  - **Nota:** Usar a skill qa-execution para execução real pela interface, se aplicável, sem ampliar o ciclo nem alterar escopo. Os testes com falso servidor não autorizam marcar o smoke real como realizado.

- [ ] **07.4 — Alinhar documentação, rollout e comprovar gates finais**
  - **Arquivos:** `docs/specs/tarefas-e-plano-de-execucao/spec.md (apenas §7.4, §9 e referências Codex obsoletas do contrato)`; `docs/specs/sessao-do-codex/spec.md (apenas decisões confirmadas e numeração real da migration)`; `apps/web/PRODUCT.md (estado implementado do Codex)`; `docs/specs/sessao-do-codex/_tasks.md`; `docs/specs/sessao-do-codex/task_07.md`.
  - **Testes:** evidências documentais e gates dos casos já atribuídos; nenhum caso novo.
  - **Pronto quando:** `rtk pnpm --dir packages/api test`, `rtk pnpm --dir packages/api test:integration`, `rtk pnpm --dir apps/web test`, `rtk pnpm typecheck`, `rtk pnpm lint` e `rtk pnpm build` passam; `rtk python3 -I .agents/skills/spec-to-tasks/scripts/tasks_status.py docs/specs/sessao-do-codex` passa. Registrar o resultado da jornada da 07.1/07.2 sem repetir E2E já verde.
  - **Nota:** As suites completas da tarefa 07 rodam uma vez aqui, depois das alterações. Prova deste passo é documental e de gates; não é etapa de escrever testes atrasados. Atualizar Spec D não autoriza marcar seu smoke/pendências como concluídos.

## Detalhes de implementação
Leia software-testing e regras E2E. Configuração exige E2E_DATABASE_URL e E2E_AUTH_SECRET de ambiente descartável; nunca usar produção. Playwright pode retornar sucesso com skips: registrar contagens e não aceitar skip como comprovação. O worker falso é autorizado apenas em NODE_ENV=test, isolado do Claude real e do perfil pessoal. Não executar Codex real na suíte automática.

### Arquivos relevantes
- `apps/web/playwright.config.ts`: webServer e setup existentes.
- `apps/web/e2e/sessionWorkerSetup.ts`: inicia worker com NODE_ENV=test e aguarda heartbeat.
- `apps/web/e2e/fixtures/environment.ts`: pré-condições E2E e motivo de skip.
- `apps/web/e2e/session-conversation.spec.ts`: jornada de conversa existente.
- `apps/web/e2e/task-plan.spec.ts`: geração/plano existente.
- `packages/api/src/infra/agents/codexArguments.ts`: configuração isolada a preservar.

### Arquivos afetados
Os caminhos de alteração estão em cada mini-tarefa; os marcados “criar” ainda não existem. Helpers adicionais pertencem ao mesmo diretório da responsabilidade e devem ser registrados antes da edição. Não usar uma renomeação geral para acomodar a feature.

### Decisões relacionadas
Rollout/reversão seguem §20; Spec D passa a apontar catálogo da §7.12 da Spec E e substituição da regra da rota pela escolha. Nenhuma revisão spec-conformance é executada antes de concluir todas as tarefas.

## Premissas
O ambiente E2E e login real podem precisar de preparação externa; isso não bloqueia gerar tarefas, mas impede afirmar definição de pronto satisfeita. Não completar o smoke só com resultado do servidor falso. A Spec D tem validação final própria ainda pendente no estado observado.

## Testes atribuídos
Cada ID abaixo tem um único dono no plano; grupos da matriz da spec foram expandidos em casos concretos. IDs IT-50x são complementos deste plano, não novos requisitos de produto.

- [ ] **V-53a** (07.1): Operadora inicia Codex, vê texto, responde pergunta, permite comando nesta sessão e encerra → fluxo visível completo com estados, retorno do agente e conversa final em leitura · Playwright + web + worker/RPC + processo falso + Postgres de teste.
- [ ] **V-53b** (07.1): Outro membro abre a mesma tarefa enquanto Codex pede resposta → lê conversa/pedidos sem controles; tentativa pública de mutação não opera sessão · Playwright com usuário de teste independente + autorização real.
- [ ] **IT-508** (07.2): Amostras locais de envio/resposta, mensagem concluída/pedido e preflight → p95 entrega ≤2 s, reflexo na UI ≤3 s, disponibilidade/catálogo ≤200 ms sem iniciar processo; abertura ≤10 s e interrupção ≤5 s dos cenários de aceite · worker/Postgres + relógio real; UI real no spec Codex, registrar limites do que foi medido.
- [ ] **IT-509** (07.2): Rodar fluxos existentes Claude e agentes isolados após habilitar Codex → conversa/captura/segunda sessão/permissões intactas; argumentos Codex do Issue Author/Planejamento continuam ignore-user-config e read-only, sem escrita direta pelo Flow Dev; sessão Codex respeita perfil pessoal em ambiente isolado · suites existentes, filesystem/Postgres reais e fornecedor controlado.
- [ ] **V-52a** (07.3): Abrir Tech Spec com spec-writer no Codex real, responder perguntas (ou texto, conforme flag) e continuar → conversa e spec capturada com versão corretas · UI + CLI real + projeto de teste.
- [ ] **V-52b** (07.3): Iniciar sessão do plano com Codex real no modelo/esforço escolhidos → executa a tarefa designada e captura status/artefatos, mantendo a escolha visível · UI + CLI/clone reais.
- [ ] **V-52c** (07.3): Reiniciar serviço durante sessão real com histórico/pedido e enviar Pode seguir → Interrompida, pedido Cancelada e mesma conversa retomada com escolhas; falha exibe alternativa prevista · UI + processos/CLI reais.

## Verificação da tarefa
- Comandos de shell usam `rtk`, conforme `/home/mauricio/.codex/RTK.md`.
- Durante a implementação, rode só os arquivos afetados. Em `packages/api/test/`, use `rtk pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts <arquivo>`; em `packages/api/src/`, omita `--config`.
- Agrupe as edições antes do typecheck. Se alterar contratos consumidos pela web, confira também `rtk pnpm --dir apps/web typecheck`.
- No fechamento de uma tarefa que alterou a API, rode `rtk pnpm --dir packages/api test` e `rtk pnpm --dir packages/api test:integration` uma vez. Para a web, `rtk pnpm --dir apps/web test` uma vez. Repita somente falhas; depois confirme com a suíte completa.
- Não defina `TEST_DATABASE_URL` localmente. A integração provisiona Postgres descartável; requer `pg_config`, `initdb` e `pg_ctl`. Não aumente timeouts nem reduza workers para esconder lentidão.
- `packages/api/package.json` não tem script de lint. `rtk pnpm lint` é o comando do monorepo. Build e Playwright ficam na tarefa 07, que cobre o fluxo visível alterado; se uma mini-tarefa mudar rotas ou configuração de build, execute o gate pertinente nela e registre a razão.

## Critérios de sucesso
- Todas as mini-tarefas e testes atribuídos marcados apenas depois de comprovados.
- Sete casos comprovados, sem skips aceitos como sucesso, e prazos medidos com limites claros.
- Suites, typecheck/lint/build e três specs E2E verdes; smoke real registrado uma vez.
- Spec D e PRODUCT descrevem o comportamento implementado; ordem de rollback preserva dados e não promete retomada sem runtime.
- Após completed das sete tarefas, solicitar spec-conformance na feature inteira e registrar veredito no manifesto.
- Respeitar as regras de código, camadas e autorização do projeto; registrar qualquer gate indisponível sem declarar sucesso.

## Registro de execução
<!-- Acrescentar data, mini-tarefa, mudança, comandos/resultados, desvios e limitações. Sem evidência de implementação na criação deste plano. -->
- 2026-11-24 · 07.1 · Verificação de pré-condições: `E2E_DATABASE_URL` e `E2E_AUTH_SECRET` ausentes. Não iniciei Playwright nem carreguei `.env.local`, porque não há evidência de que a base ali configurada seja descartável. V-53a/V-53b e o critério desta mini-tarefa seguem pendentes; nenhum skip foi contado como sucesso.
- 2026-11-24 · 07.2 · `rtk pnpm --dir packages/api test:integration` passou com 153 arquivos, 757 testes aprovados e 5 skips de cenários que exigem Claude real ou leitura como root. A regressão de plano mediu p95 de leitura em 161 ms e salvamento em 336 ms para 30 tarefas/20 amostras (NFR-15). Isso não comprova a latência Codex da IT-508; não há relatório Codex nem E2E desta mini-tarefa, então IT-508/IT-509 continuam pendentes.
- 2026-11-24 · 07.3 · `codex --version` informou 0.159.3 e `codex login status` confirmou login ChatGPT. A UI não foi iniciada sem banco descartável configurado; V-52a/V-52b/V-52c e o smoke real seguem pendentes conforme o critério da tarefa.
- 2026-11-24 · 07.4 · Documentação alinhada: Spec D agora descreve a escolha na rota, o contrato Codex disponível por máquina e remove a dependência obsoleta de implementação da Spec E; PRODUCT descreve a disponibilidade local. Spec E §10 registra que o conteúdo secreto não é persistido e que só `(resposta oculta)` é gravado após receber/validar o `pg_notify` aprovado (DEC-17 da Spec C). Evidências: `rtk pnpm --dir packages/api test` — 124 arquivos/795 testes passaram; `rtk pnpm --dir apps/web test` — 101 arquivos/519 passaram; `rtk pnpm --dir packages/api test:integration` — 153 arquivos/757 passaram e 5 skips descritos acima; `rtk pnpm lint` passou; `rtk pnpm --dir packages/api run typecheck` e `rtk pnpm --dir apps/web run typecheck` passaram. O wrapper `rtk pnpm typecheck` falhou ao resolver `tsc`, mas os dois typechecks diretos passaram. `rtk pnpm build` passou; o Turbopack emitiu dois avisos de acesso dinâmico ao filesystem em `packages/api/src/infra/agents/agentInstructions.ts`. E2E não executado por falta de variáveis de ambiente descartável. Como 07.1–07.3 e as evidências E2E continuam pendentes, 07.4 e a tarefa 07 permanecem incompletas.
