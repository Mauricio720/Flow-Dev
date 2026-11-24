---
status: completed
title: "Catálogo publicado"
type: backend
complexity: high
---

# Task 04: Catálogo publicado

## Visão geral
Publicar disponibilidade, versão e modelos do Codex por máquina no início e a cada dez minutos. Adaptar preflight, plano e validação para ler essa publicação sem abrir o Codex durante a consulta.

<critical>
- LEIA `spec.md`, `_tasks.md`, `AGENTS.md`, as instruções locais aplicáveis e `.agents/rules/code-standards.md` antes de começar.
- FAÇA UMA MINI-TAREFA POR VEZ, na ordem. Só marque `[x]` depois de executar o “Pronto quando” e conferir o resultado.
- NÃO saia dos arquivos listados sem registrar o motivo no Registro de execução. Divida helpers e testes para respeitar 100 linhas por arquivo `.ts`, 30 linhas por função e até 3 parâmetros; não transforme uma mini-tarefa num diff maior que aproximadamente 200–300 linhas sem subdividi-la no plano.
- TESTES JUNTO COM O CÓDIGO: siga `.agents/skills/software-testing/SKILL.md` e `references/escolha-e-desenho.md`. Cenário → efeito específico esperado da spec → fronteira real. Sem asserções vagas, expectativas calculadas pela implementação ou mocks do comportamento sob teste. Controle relógio, concorrência e aleatoriedade.
- Ao começar, mude o status para `in_progress` aqui e no manifesto. Marque também cada teste atribuído somente com evidência. Use `completed` apenas após todas as mini-tarefas e critérios de sucesso; a revisão `spec-conformance` acontece uma vez na feature inteira, após as sete tarefas.
- Preserve alterações já presentes no workspace. Não faça commit, push, PR nem implemente sugestões fora do escopo.
</critical>

## Requisitos
- **REQ-112:** Codex só DEVE estar disponível com binário no PATH, versão mínima e login; cada falta DEVE produzir o texto exato da §7.13.
- **B-44:** Modelo removido ou limite de uso DEVE impedir a abertura com motivo; sessão do plano continua editável. A falha do runtime por limite também é coberta na tarefa 05.
- **DEC-32:** Catálogo e login DEVEM ser sondados pelo serviço no início e a cada 10 min, com codex_status por host; preflight só lê.
- **§7.12:** Excluir modelos ocultos, exibir labels e guardar ids; esforços são por modelo, padrão vem do Codex e maior esforço é conhecido sem ordem alfabética.
- **§7.13:** Serviço fora do ar tem precedência e mensagem da REQ-053; demais motivos seguem a tabela.
- **§19 — codex-catalog:** Registrar disponibilidade e número de modelos por renovação, sem conteúdo de credenciais.
- **US-15.3:** Cenário de aceite: Sem login: opção desabilitada com orientação.

## Interfaces
- **Consome:** `CodexStatus` e métodos de `SessionHostDao` da tarefa 02, `ToolLocator`, identidade local, relógio e versão mínima do spike.
- **Produz:** contrato `CodexCatalogProbe.read(): Promise<CodexStatus>` em `application/terminal/codexCatalogProbe.ts`, implementado por `infra/terminal/codex/codexCatalogProbe.ts`.
- **Produz:** `CodexCatalogPublisher.refresh(): Promise<void>` e passo do worker com primeiro refresh e intervalo de 600.000 ms. Processo de sondagem é curto e separado dos processos de sessões.
- **Produz:** disponibilidade/validação baseadas no snapshot do host local, inclusive em `plan.get`, `plan.save`, `terminal.preflight` e abertura.
- Esta tarefa deixa o runtime Codex fora de `REGISTERED_SESSION_AGENTS`; testes injetam o conjunto registrado. A tarefa 05 conecta o probe real a seu cliente RPC e habilita o registro.

## Mini-tarefas

- [x] **04.1 — Sondar binário, versão, login e modelos**
  - **Arquivos:** `packages/api/src/application/terminal/codexCatalogProbe.ts (criar)`; `packages/api/src/infra/terminal/codex/codexCatalogProbe.ts (criar)`; `packages/api/src/infra/terminal/codex/codexCatalogTransport.ts (criar; factory injetável)`; `packages/api/src/application/services/terminal/codexCatalogRules.ts (criar)`; `packages/api/src/application/services/terminal/codexCatalogRules.test.ts (criar)`.
  - **Testes:** V-50b, V-50c, V-50d
  - **Pronto quando:** `rtk pnpm --dir packages/api exec vitest run src/application/services/terminal/codexCatalogRules.test.ts` passa para PATH ausente, versão anterior/mínima/posterior e sem login; sondagem tem finalização garantida.
  - **Nota:** Conservar factory de transporte injetável: o cliente real pertence à 05. Não usar agentes isolados do Issue Author para obter catálogo.

- [x] **04.2 — Persistir e renovar o snapshot sem bloquear o heartbeat**
  - **Arquivos:** `packages/api/src/application/services/terminal/codexCatalogPublisher.ts (criar)`; `packages/api/src/application/services/terminal/codexCatalogStep.ts (criar)`; `packages/api/src/infra/database/dao/terminal/drizzleSessionHostDao.ts`; `packages/api/test/codex-catalog-publisher.test.ts (criar)`.
  - **Testes:** V-50f
  - **Pronto quando:** `rtk pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/codex-catalog-publisher.test.ts` passa com relógio controlado e probe externo controlado; primeiro refresh e limite de dez minutos têm asserções exatas.
  - **Nota:** O beat não pode apagar codex_status. Falha do probe não pode derrubar o laço de sessões nem confundir hosts; definir reason indisponível sem publicar catálogo inventado.

- [x] **04.3 — Ler catálogo publicado e validar escolhas por modelo**
  - **Arquivos:** `packages/api/src/application/terminal/sessionAgentCatalog.ts`; `packages/api/src/application/terminal/sessionAgentCatalog.test.ts`; `packages/api/src/application/services/terminal/sessionPurpose.ts`; `packages/api/src/application/services/terminal/sessionServiceStatus.ts`; `packages/api/src/application/services/tasks-set/planSaveService.ts`; `packages/api/src/controllers/executionPlanController.ts`; `packages/api/src/infra/terminalComposition.ts`; `packages/api/src/infra/planComposition.ts`; `packages/api/test/codex-catalog-read.test.ts (criar)`.
  - **Testes:** V-50a, V-50e
  - **Pronto quando:** `rtk pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/codex-catalog-read.test.ts` e `rtk pnpm --dir packages/api exec vitest run src/application/terminal/sessionAgentCatalog.test.ts` passam; probe de teste lança se chamado pelo preflight.
  - **Nota:** Manter o custo do preflight dentro de 200 ms para a leitura de disponibilidade/catálogo, sem atribuir a esta medida verificação pesada do Git já existente. O teste completo de prazo fica na 07.

- [x] **04.4 — Revalidar antes de abrir e tratar modelo que sumiu**
  - **Arquivos:** `packages/api/src/application/services/terminal/sessionPurpose.ts`; `packages/api/src/application/services/terminal/terminalOpenGuard.ts`; `packages/api/src/controllers/terminalSessionController.ts`; `packages/api/src/controllers/terminalControllerTypes.ts`; `packages/api/src/controllers/terminalErrorMapper.ts`; `packages/api/src/application/services/tasks/taskErrors.ts`; `packages/api/test/codex-open-availability.test.ts (criar)`.
  - **Testes:** V-50g, V-50h
  - **Pronto quando:** `rtk pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/codex-open-availability.test.ts` passa; `rtk pnpm --dir packages/api typecheck` e `rtk pnpm --dir apps/web typecheck` passam.
  - **Nota:** Remover a dependência indevida de assertTools sempre exigir Claude quando a escolha é Codex. Login removido entre publicação e abertura deve ser reconferido antes de iniciar; decidir o ponto concreto conforme spike sem adicionar processo ao preflight. Na rota, resolver persiste agent/model/effort confirmados e preview devolve DEFAULT_SESSION_CHOICE ou escolha informada; chamar builders da 03 somente após a junção na 05.6, preservando compilação desta tarefa. Modelo removido/recusado não deve ser descartado apenas como escolha inválida genérica; seguir B-44/REQ-113 e o motivo da §7.12, mantendo o item editável.

## Detalhes de implementação
Leia layered-backend e trpc-nextjs. Esta tarefa pode rodar em paralelo com a 03: application/services/terminal/codexCatalog*, sessionAgentCatalog e leitores de plano pertencem aqui; tradutores/prompt/threadOptions pertencem à 03. Não tocar sessionWorkerParts/Composition, registro nem cliente RPC: conexão de produção na 05. Não criar dependência escondida no servidor falso dessa tarefa.

### Arquivos relevantes
- `packages/api/src/application/terminal/sessionAgentCatalog.ts`: catálogo estático atual precisa suportar snapshots por host.
- `packages/api/src/infra/database/dao/terminal/drizzleSessionHostDao.ts`: heartbeat e publicação compartilham linha.
- `packages/api/src/infra/registeredSessionAgents.ts`: continua só Claude até a 05.
- `packages/api/src/infra/planComposition.ts`: catálogo também chega ao plano.
- `packages/api/src/application/services/terminal/terminalOpenGuard.ts`: assertTools hoje exige Claude incondicionalmente.

### Arquivos afetados
Os caminhos de alteração estão em cada mini-tarefa; os marcados “criar” ainda não existem. Helpers adicionais pertencem ao mesmo diretório da responsabilidade e devem ser registrados antes da edição. Não usar uma renomeação geral para acomodar a feature.

### Decisões relacionadas
DEC-32: sem consulta externa no preflight. Catálogo por modelo substitui catálogo Codex das Configurações sem alterar os agentes isolados.

## Premissas
A factory RPC do probe é injetada nesta etapa e recebe implementação real na 05; não copiar outro cliente RPC. O catálogo Codex vazio deve produzir indisponibilidade explícita, nunca modelo padrão inventado.

## Testes atribuídos
Cada ID abaixo tem um único dono no plano; grupos da matriz da spec foram expandidos em casos concretos. IDs IT-50x são complementos deste plano, não novos requisitos de produto.

- [x] **V-50a** (04.3): Heartbeat do host local ausente/vencido e catálogo antigo disponível → opção e open informam serviço fora do ar, sem sondar Codex; host diferente não habilita a opção · status/resolver + Postgres reais.
- [x] **V-50b** (04.1): codex ausente do PATH → disponível=false e Codex não encontrado. Instale o Codex CLI e tente de novo. · probe com locator/transporte/versão injetados e regras reais.
- [x] **V-50c** (04.1): Versão abaixo da mínima, igual ou acima → abaixo informa Atualize o Codex para a versão <mínima> ou mais nova.; mínima/posterior prosseguem à checagem de login · probe e regras reais.
- [x] **V-50d** (04.1): Binário compatível sem login → disponível=false e Faça login no Codex: rode `codex login`. · resposta de conta controlada e regra real.
- [x] **V-50e** (04.3): Catálogo tem modelo oculto, dois modelos com esforços distintos e catálogo vazio/falho → oculto some, label/id/default/esforços corretos, escolha inválida recusada; diálogo continua com motivo legível em vez de lançar · regras de catálogo e sessão + Postgres.
- [x] **V-50f** (04.2): Serviço sobe, relógio chega antes/exatamente a dez minutos e sondagem seguinte falha → publica no início e no prazo, não antecipa renovação, heartbeat preserva snapshot e falha não interrompe o supervisor · publisher/DAO reais + Postgres; agendador e probe controlados.
- [x] **V-50g** (04.4): Snapshot dizia disponível e login/binário muda antes do open → conferência final recusa o Codex pelo motivo atual; preflight não cria processo e Claude ausente não bloqueia Codex válido · guard + Postgres; probe externo controlado.
- [x] **V-50h** (04.4): Modelo salvo no plano some do catálogo, ou provedor recusa por limite → erro explica o modelo/motivo e item continua editável; para sumiço usa O modelo <id> não está mais disponível no Codex. Troque o modelo da sessão. · erro de abertura e validação por modelo cobertos; recusa runtime pertence à tarefa 05.

## Verificação da tarefa
- Comandos de shell usam `rtk`, conforme `/home/mauricio/.codex/RTK.md`.
- Durante a implementação, rode só os arquivos afetados. Em `packages/api/test/`, use `rtk pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts <arquivo>`; em `packages/api/src/`, omita `--config`.
- Agrupe as edições antes do typecheck. Se alterar contratos consumidos pela web, confira também `rtk pnpm --dir apps/web typecheck`.
- No fechamento de uma tarefa que alterou a API, rode `rtk pnpm --dir packages/api test` e `rtk pnpm --dir packages/api test:integration` uma vez. Para a web, `rtk pnpm --dir apps/web test` uma vez. Repita somente falhas; depois confirme com a suíte completa.
- Não defina `TEST_DATABASE_URL` localmente. A integração provisiona Postgres descartável; requer `pg_config`, `initdb` e `pg_ctl`. Não aumente timeouts nem reduza workers para esconder lentidão.
- `packages/api/package.json` não tem script de lint. `rtk pnpm lint` é o comando do monorepo. Build e Playwright ficam na tarefa 07, que cobre o fluxo visível alterado; se uma mini-tarefa mudar rotas ou configuração de build, execute o gate pertinente nela e registre a razão.

## Critérios de sucesso
- Todas as mini-tarefas e testes atribuídos marcados apenas depois de comprovados.
- Oito casos passam, preflight lê somente dados publicados e valida esforço no modelo certo.
- Snapshot renova no prazo sem apagar heartbeat nem cruzar hosts.
- Nenhum registro habilita Codex antes de o runtime estar pronto; suítes/typechecks pertinentes passam.
- Respeitar as regras de código, camadas e autorização do projeto; registrar qualquer gate indisponível sem declarar sucesso.

## Registro de execução
<!-- Acrescentar data, mini-tarefa, mudança, comandos/resultados, desvios e limitações. Sem evidência de implementação na criação deste plano. -->

- 2026-11-23 · 04.1 · Criados o contrato de probe, a avaliação pura de versão/login/catálogo e o probe local com PATH, leitura de versão e factory de transporte injetável. Modelos ocultos são descartados; label, id, default e esforços por modelo vêm do Codex. Testes controlam locator, versão e transporte, sem spawn real. Evidência: `rtk pnpm --dir packages/api exec vitest run src/application/services/terminal/codexCatalogRules.test.ts src/infra/terminal/codex/codexCatalogProbe.test.ts` (5 testes passou).
- 2026-11-23 · 04.2 · Criados publisher e passo de renovação com publicação inicial e intervalo 600.000 ms; falha de probe publica indisponibilidade sem modelos e a rotina absorve falhas para não interromper o supervisor. Teste de integração usa Postgres, relógio fixo e agendador controlado; beat posterior preserva o snapshot. O encaixe do passo e a factory RPC de produção permanecem para a tarefa 05, conforme a fronteira indicada nesta task (`sessionWorkerParts/Composition` e cliente RPC não foram alterados). Evidência: `rtk pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/codex-catalog-publisher.test.ts` (1 teste passou).
- 2026-11-23 · 04.3 · Preflight, plano e validação de escolhas agora leem snapshot do host local; esforço é conferido dentro do modelo, serviço offline prevalece e snapshot ausente não inventa modelo padrão. `beat` preserva `codex_status`. Testes de catálogo/status com Postgres e unidade cobrem host, heartbeat, modelos ocultos/heterogêneos, catálogo vazio e escolha removida. Expectativas antigas de preflight/plano foram ajustadas para o novo status publicado. Evidência: testes `codex-catalog-read`, `sessionAgentCatalog`, `plan-read` e `terminal-preflight-purpose` passaram.
- 2026-11-23 · 04.4 · A abertura reconfirma o serviço antes de resolver a escolha e revalida Codex/modelo por probe injetado; modelo removido devolve mensagem com id e Claude não é consultado para escolhas Codex. Integração prova também que um item existente mantém sua escolha e continua editável após sumiço do modelo. A conexão real do probe e o seu fornecimento em produção ficam para a tarefa 05, conforme decisão acima. Evidência: `test/codex-open-availability.test.ts` (3 testes passou); `rtk pnpm --dir apps/web typecheck` e `rtk pnpm --dir packages/api typecheck` passaram.
- Fechamento · `rtk pnpm --dir packages/api test` — 124 arquivos, 795 testes passaram; `rtk pnpm --dir packages/api test:integration` — 141 arquivos passaram, 2 ignorados, 736 testes passaram e 5 ignorados; `rtk pnpm lint` passou; `rtk git diff --check` passou. A primeira integração completa expôs duas expectativas anteriores de catálogo estático; foram atualizadas e a suíte completa foi repetida com sucesso. `apps/web test` não foi alterado pela task e não foi executado; web typecheck passou.
- 2026-11-24 · correções da review-002 · 04.1: `loginStatus` agora retorna falso quando o comando sai com erro, mesmo que a saída diga `Logged in`; testes negativos com binário controlado (`Not logged in`, exit 1). Verificação (sem TEST_DATABASE_URL): `pnpm --dir packages/api test` 129 arquivos/804 testes; `pnpm --dir packages/api test:integration` 157 arquivos/770 testes, 5 skipped; `pnpm --dir apps/web test` 101 arquivos/520 testes; typecheck da API e da web e `pnpm lint` com exit 0.
