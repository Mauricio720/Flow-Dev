---
status: completed
title: "Interface de escolha e pedidos"
type: frontend
complexity: high
---

# Task 06: Interface de escolha e pedidos

## Visão geral
Estender a interface existente para escolha de agente na rota e para perguntas/aprovações do Codex. Reutilizar a mesma conversa e histórico, exibindo somente decisões oferecidas e respeitando leitura e privacidade.

<critical>
- LEIA `spec.md`, `_tasks.md`, `AGENTS.md`, as instruções locais aplicáveis e `.agents/rules/code-standards.md` antes de começar.
- FAÇA UMA MINI-TAREFA POR VEZ, na ordem. Só marque `[x]` depois de executar o “Pronto quando” e conferir o resultado.
- NÃO saia dos arquivos listados sem registrar o motivo no Registro de execução. Divida helpers e testes para respeitar 100 linhas por arquivo `.ts`, 30 linhas por função e até 3 parâmetros; não transforme uma mini-tarefa num diff maior que aproximadamente 200–300 linhas sem subdividi-la no plano.
- TESTES JUNTO COM O CÓDIGO: siga `.agents/skills/software-testing/SKILL.md` e `references/escolha-e-desenho.md`. Cenário → efeito específico esperado da spec → fronteira real. Sem asserções vagas, expectativas calculadas pela implementação ou mocks do comportamento sob teste. Controle relógio, concorrência e aleatoriedade.
- Ao começar, mude o status para `in_progress` aqui e no manifesto. Marque também cada teste atribuído somente com evidência. Use `completed` apenas após todas as mini-tarefas e critérios de sucesso; a revisão `spec-conformance` acontece uma vez na feature inteira, após as sete tarefas.
- Preserve alterações já presentes no workspace. Não faça commit, push, PR nem implemente sugestões fora do escopo.
</critical>

## Requisitos
- **REQ-121:** Comando DEVE mostrar comando inteiro, motivo e regra proposta; botões oferecidos incluem permitir, nesta sessão, recusar e sempre com aviso de máquina quando houver regra.
- **REQ-122:** Pedido de arquivos DEVE mostrar cada caminho/tipo e diff, com permitir/nesta sessão/recusar conforme oferta.
- **REQ-126:** Diálogo da rota DEVE oferecer agente, modelo e esforço, inicialmente Claude Code · Opus · Máximo; confirmação DEVE enviar a escolha.
- **REQ-127:** Troca para Codex DEVE selecionar o modelo padrão publicado e o maior esforço suportado desse modelo.
- **US-17:** Provar botões, escopo nesta sessão versus máquina e diff de arquivos; persistência e tradução pertencem às tarefas 02/03/05.
- **US-19:** Provar o padrão editável e troca para Codex acionando a spec-writer com prompt correspondente.
- **§15 — consumidores:** Inferir os contratos do tRPC; não copiar tipos de API nem importar runtime backend no cliente.
- **US-17.1:** Cenário de aceite: Comando com motivo e quatro botões conforme oferta.
- **US-17.4:** Cenário de aceite: Perguntar tudo mostra diff e botões de arquivo.
- **US-19.1:** Cenário de aceite: Rota inicia escolha Claude/Opus/Máximo editável.
- **US-19.2:** Cenário de aceite: Troca Codex seleciona padrão e invoca spec-writer.

## Interfaces
- **Consome:** `RouterInputs/RouterOutputs` por `terminalContract.ts` e `sessionContract.ts`, snapshot com metadados por modelo e timeline com `offers/alwaysScope/secret/allowOther`.
- **Produz:** `AgentChoiceField` usando labels do catálogo e ids no payload, esforços filtrados pelo modelo e escolha padrão Codex obtida de `isDefault` mais maior esforço suportado.
- **Produz:** `openPurposeOf(...)` incluindo `{ kind: "route", choice }`; `useTerminalLaunch` deixa de retornar escolha nula na rota. Plano continua mostrando a escolha fixa.
- **Produz:** `PermissionRequestCard` renderizando por offers e kind; perguntas secretas usam input oculto acessível e exibem só o marcador no histórico. Não criar tela/conversa específica Codex.

## Mini-tarefas

- [x] **06.1 — Usar metadados por modelo nos seletores**
  - **Arquivos:** `apps/web/src/features/issues/assigned-work/components/AgentChoiceField.tsx`; `apps/web/src/features/issues/assigned-work/components/AgentSelect.tsx`; `apps/web/src/features/issues/assigned-work/agentChoiceCopy.ts`; `apps/web/src/features/issues/assigned-work/launchPurposeModel.ts`; `apps/web/src/features/issues/assigned-work/components/AgentChoiceField.test.tsx`; `apps/web/src/features/issues/assigned-work/planEditorModel.ts (somente defaults de escolha)`; `apps/web/src/features/issues/assigned-work/planEditorModel.test.ts`.
  - **Testes:** V-51f, V-51g
  - **Pronto quando:** `rtk pnpm --dir apps/web exec vitest run src/features/issues/assigned-work/components/AgentChoiceField.test.tsx src/features/issues/assigned-work/planEditorModel.test.ts` passa.
  - **Nota:** Não escolher efforts[0] como máximo nem ordenar ids alfabeticamente. Manter valores salvos para mostrar erro de modelo removido sem substituição silenciosa.

- [x] **06.2 — Permitir escolha também na sessão da rota**
  - **Arquivos:** `apps/web/src/features/issues/assigned-work/components/LaunchChoiceSection.tsx`; `apps/web/src/features/issues/assigned-work/components/TerminalLaunchBody.tsx`; `apps/web/src/features/issues/assigned-work/components/TerminalLaunchDialog.tsx`; `apps/web/src/features/issues/assigned-work/hooks/useTerminalLaunch.ts`; `apps/web/src/features/issues/assigned-work/hooks/useLaunchPreflight.ts`; `apps/web/src/features/issues/assigned-work/hooks/useTerminalSender.ts`; `apps/web/src/features/issues/assigned-work/launchPurposeModel.ts`; `apps/web/src/features/issues/assigned-work/components/TerminalLaunchChoice.test.tsx (criar)`.
  - **Testes:** V-51e
  - **Pronto quando:** `rtk pnpm --dir apps/web exec vitest run src/features/issues/assigned-work/components/TerminalLaunchChoice.test.tsx src/features/issues/assigned-work/components/TerminalLaunchPlanItem.test.tsx` passa com confirmação e payload observado pela fronteira cliente.
  - **Nota:** Tech Spec/PRD usam spec-writer; Execução direta usa direct-executor. Ao trocar agente, ajustar a invocação sem apagar edições livres do prompt; o contrato de preview deve refletir escolha sem sondagem externa.

- [x] **06.3 — Exibir escopos e conteúdos das aprovações oferecidas**
  - **Arquivos:** `apps/web/src/features/issues/assigned-work/components/PermissionRequestCard.tsx`; `apps/web/src/features/issues/assigned-work/components/PermissionSummary.tsx`; `apps/web/src/features/issues/assigned-work/components/PermissionDenyForm.tsx`; `apps/web/src/features/issues/assigned-work/sessionCopy.ts`; `apps/web/src/features/issues/assigned-work/components/PermissionRequestCard.test.tsx`.
  - **Testes:** V-51a, V-51b, V-51c
  - **Pronto quando:** `rtk pnpm --dir apps/web exec vitest run src/features/issues/assigned-work/components/PermissionRequestCard.test.tsx` passa para comando, arquivos/grantRoot, permissões extras e legado Claude.
  - **Nota:** Botão sempre do Codex diz Permitir sempre (todas as sessões do Codex nesta máquina), regra visível; Claude mantém escopo do projeto. Rótulos acessíveis devem identificar o agente correto.

- [x] **06.4 — Ocultar respostas secretas e respeitar Outra permitida**
  - **Arquivos:** `apps/web/src/features/issues/assigned-work/components/QuestionField.tsx`; `apps/web/src/features/issues/assigned-work/components/QuestionRequestCard.tsx`; `apps/web/src/features/issues/assigned-work/components/QuestionSummary.tsx`; `apps/web/src/features/issues/assigned-work/questionAnswerModel.ts`; `apps/web/src/features/issues/assigned-work/hooks/useSessionActions.ts`; `apps/web/src/features/issues/assigned-work/components/QuestionRequestCard.test.tsx`; `apps/web/src/features/issues/assigned-work/components/QuestionRequestCard.concurrent.test.tsx`.
  - **Testes:** V-51d, V-51i
  - **Pronto quando:** `rtk pnpm --dir apps/web exec vitest run src/features/issues/assigned-work/components/QuestionRequestCard.test.tsx src/features/issues/assigned-work/components/QuestionRequestCard.concurrent.test.tsx` passa com campo oculto e resposta redigida no histórico.
  - **Nota:** Limpar estado de segredo após entrega/cancelamento e não guardar em storage/telemetria. Não exibir o valor digitado durante optimistic UI; usar o transporte confirmado pela 01/02.

- [x] **06.5 — Preservar leitura, histórico e controles nos três propósitos**
  - **Arquivos:** `apps/web/src/features/issues/assigned-work/components/SessionEntry.tsx`; `apps/web/src/features/issues/assigned-work/components/SessionConversation.tsx`; `apps/web/src/features/issues/assigned-work/components/ExecutionHistory.tsx`; `apps/web/src/features/issues/assigned-work/components/SessionControls.tsx`; `apps/web/src/features/issues/assigned-work/sessionCopy.ts`; `apps/web/src/features/issues/assigned-work/components/CodexSessionReadOnly.test.tsx (criar)`; `apps/web/src/test/execution.ts`; `apps/web/src/test/terminal.ts`.
  - **Testes:** V-51h
  - **Pronto quando:** `rtk pnpm --dir apps/web exec vitest run src/features/issues/assigned-work/components/CodexSessionReadOnly.test.tsx src/features/issues/assigned-work/components/ExecutionHistory.test.tsx src/features/issues/assigned-work/components/SessionControls.test.tsx` passa; `rtk pnpm --dir apps/web typecheck` passa.
  - **Nota:** Escolha, estados e textos neutros devem aparecer também no histórico; não colocar controles para membro, ex-operadora ou sessão encerrada. Usar os componentes existentes, sem reorganização visual fora do escopo.

## Detalhes de implementação
Leia apps/web/AGENTS.md, PRODUCT.md, DESIGN.md, nextjs-folder-structure e trpc-nextjs. Para React, aplique vercel-react-best-practices às mudanças. Antes de escrever código Next, consulte o guia relevante em apps/web/node_modules/next/dist/docs/. Feature permanece em issues/assigned-work; inferir contratos do backend. Testes afirmam texto, acessibilidade e payload público, não classes CSS/estrutura privada.

### Arquivos relevantes
- `apps/web/src/features/issues/assigned-work/components/LaunchChoiceSection.tsx`: hoje omite toda escolha em route.
- `apps/web/src/features/issues/assigned-work/hooks/useTerminalLaunch.ts`: hoje route força choice=null.
- `apps/web/src/features/issues/assigned-work/launchPurposeModel.ts`: hoje openPurposeOf não inclui rota.
- `apps/web/src/features/issues/assigned-work/components/AgentChoiceField.tsx`: hoje usa esforços globais e primeira opção.
- `apps/web/src/features/issues/assigned-work/components/PermissionRequestCard.tsx`: hoje botões Claude fixos.
- `apps/web/src/features/issues/assigned-work/components/QuestionField.tsx`: hoje Outra sempre visível e textarea expõe valor.

### Arquivos afetados
Os caminhos de alteração estão em cada mini-tarefa; os marcados “criar” ainda não existem. Helpers adicionais pertencem ao mesmo diretório da responsabilidade e devem ser registrados antes da edição. Não usar uma renomeação geral para acomodar a feature.

### Decisões relacionadas
DEC-30: reutilizar timeline e histórico; DEC-24 da Spec D preserva escolha fixa por sessão. Interface em português com os textos literais da spec e tokens do DESIGN.md.

## Premissas
Os metadados e transporte secreto das tarefas anteriores já estão funcionais. Esta tarefa não decide persistência nem amplia permissões. Se a spec aprovada e a API divergirem, registrar antes de ajustar oráculo de testes.

## Testes atribuídos
Cada ID abaixo tem um único dono no plano; grupos da matriz da spec foram expandidos em casos concretos. IDs IT-50x são complementos deste plano, não novos requisitos de produto.

- [x] **V-51f** (06.1): Selecionar Codex com modelo padrão diferente do primeiro da lista → seleciona id padrão e maior esforço suportado; trocar modelo filtra esforços, exibe label e envia id, tanto na geração quanto no plano · RTL com catálogo controlado, seletor real.
- [x] **V-51g** (06.1): Codex indisponível por serviço, PATH, versão ou login e modelo salvo removido → opção desabilitada com texto exato; escolha salva não é trocada silenciosamente · RTL, metadata de API controlada.
- [x] **V-51e** (06.2): Abrir diálogo da rota → Claude Code · Opus · Máximo editáveis; trocar para Codex em Tech Spec/PRD/Execução direta e confirmar → purpose route leva choice correta e prompt/skill compatíveis, preservando texto editado · RTL com cliente externo substituído.
- [x] **V-51a** (06.3): Pedido de comando Codex com regra e quatro ofertas → comando/motivo/regra e quatro botões visíveis, aviso de máquina explícito; clique envia allow_session; Claude mantém seus botões/textos · RTL.
- [x] **V-51b** (06.3): Pedido de arquivos criar/editar/remover/mover com diff cortado e grantRoot externo → tipos/caminhos/diff/marcador visíveis, somente ofertas do payload, grantRoot sem nesta sessão · RTL.
- [x] **V-51c** (06.3): Pedido extra de rede ou pasta → Pedir permissão, motivo e só Permitir/Recusar; motivo opcional tem limite 2.000 · RTL.
- [x] **V-51d** (06.4): Pergunta secreta recebe texto e é enviada/cancelada → campo tipo password, nenhuma renderização do valor, histórico mostra (resposta oculta) e estado local limpo · RTL, transporte na fronteira controlado.
- [x] **V-51i** (06.4): Pergunta Codex com opções/descritivos e Outra permitida/proibida, inclusive aberta sem opções → escolha única, Outra só quando permitida e envio desabilitado enquanto faltar resposta; labels e conteúdo acessíveis por teclado · RTL.
- [x] **V-51h** (06.5): Membro/ex-operadora lê sessão ativa ou encerrada de rota/geração/plano → vê conteúdo e agente/modelo/esforço, sem enviar/responder/interromper/encerrar; operadora autorizada conserva controles e histórico legível · RTL.

## Verificação da tarefa
- Comandos de shell usam `rtk`, conforme `/home/mauricio/.codex/RTK.md`.
- Durante a implementação, rode só os arquivos afetados. Em `packages/api/test/`, use `rtk pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts <arquivo>`; em `packages/api/src/`, omita `--config`.
- Agrupe as edições antes do typecheck. Se alterar contratos consumidos pela web, confira também `rtk pnpm --dir apps/web typecheck`.
- No fechamento de uma tarefa que alterou a API, rode `rtk pnpm --dir packages/api test` e `rtk pnpm --dir packages/api test:integration` uma vez. Para a web, `rtk pnpm --dir apps/web test` uma vez. Repita somente falhas; depois confirme com a suíte completa.
- Não defina `TEST_DATABASE_URL` localmente. A integração provisiona Postgres descartável; requer `pg_config`, `initdb` e `pg_ctl`. Não aumente timeouts nem reduza workers para esconder lentidão.
- `packages/api/package.json` não tem script de lint. `rtk pnpm lint` é o comando do monorepo. Build e Playwright ficam na tarefa 07, que cobre o fluxo visível alterado; se uma mini-tarefa mudar rotas ou configuração de build, execute o gate pertinente nela e registre a razão.

## Critérios de sucesso
- Todas as mini-tarefas e testes atribuídos marcados apenas depois de comprovados.
- Nove casos passam; rota começa em Claude/Opus/Máximo e troca Codex corretamente.
- Botões seguem offers, escopo de máquina fica claro, segredo não aparece em texto/timeline.
- Acesso por teclado e modo leitura preservados; suíte web, typecheck e lint pertinentes passam.
- Respeitar as regras de código, camadas e autorização do projeto; registrar qualquer gate indisponível sem declarar sucesso.

## Registro de execução
<!-- Acrescentar data, mini-tarefa, mudança, comandos/resultados, desvios e limitações. Sem evidência de implementação na criação deste plano. -->

- 2026-11-24 · 06.1 · Seletores agora consomem labels, modelo padrão e esforços por modelo do catálogo publicado; ao escolher Codex usam o modelo isDefault e o maior esforço oferecido, filtram esforços por modelo e preservam id removido com mensagem de recuperação. Payload de plano mantém id/esforço selecionados. Evidência: `rtk pnpm --dir apps/web exec vitest run src/features/issues/assigned-work/components/AgentChoiceField.test.tsx src/features/issues/assigned-work/planEditorModel.test.ts` — 2 arquivos/17 testes passaram.
- 2026-11-24 · 06.2 · O diálogo de rota permite editar agente/modelo/esforço, envia purpose route com a escolha no preview e na abertura, e mantém prompt livre ao trocar de agente. Preview é recarregado localmente com a escolha e o fluxo existente interpreta o comando spec-writer para Codex. Evidência: `rtk pnpm --dir apps/web exec vitest run src/features/issues/assigned-work/components/TerminalLaunchChoice.test.tsx src/features/issues/assigned-work/components/TerminalLaunchPlanItem.test.tsx` — 2 arquivos/4 testes passaram.
- 2026-11-24 · 06.3 · Cartões de aprovação renderizam apenas decisões oferecidas que têm dados obrigatórios, exibem regra e escopo máquina, diff/caminhos e motivo, e enviam allow_session sem persistência global. Rótulo acessível identifica Codex/Claude Code. Modificações auxiliares fora da lista: `SessionEntry.tsx` e `SessionConversation.tsx` passam o agente da sessão ao cartão para nome acessível, requisito não possível pelo contrato da entrada isolada. Evidência: `rtk pnpm --dir apps/web exec vitest run src/features/issues/assigned-work/components/PermissionRequestCard.test.tsx` — 1 arquivo/10 testes passou.
- 2026-11-24 · 06.4 · Campo secreto usa input type=password, não envia o valor à timeline, limpa estado local após resposta bem-sucedida/cancelamento e histórico sempre mostra `(resposta oculta)` mesmo que um DTO legado traga texto. “Outra” respeita allowOther, inclusive pergunta aberta sem opções. `useSessionActions.ts` não precisou de mudança: o cliente já encaminha a resposta à mutação sem cache ou otimização local; API usa o transporte aprovado por pg_notify. Evidência: `rtk pnpm --dir apps/web exec vitest run src/features/issues/assigned-work/components/QuestionRequestCard.test.tsx src/features/issues/assigned-work/components/QuestionRequestCard.concurrent.test.tsx` — 2 arquivos/13 testes passaram.
- 2026-11-24 · 06.5 · Conversa, rótulo do agente, compositor, perguntas e aprovações identificam Codex; histórico exibe agente/modelo/esforço. Membro e sessão encerrada mantêm leitura sem ações; operadora conserva compositor e controles. Mensagens de encerramento, indisponibilidade e vazio agora usam linguagem neutra. `executionCopy.ts` e `terminalCopy.ts` também foram ajustados fora dos caminhos listados para retirar rótulos que atribuíam a sessão ao Claude após a escolha do Codex. Fixtures `execution.ts` ganharam sessão Codex; `terminal.ts` usa a indisponibilidade real de catálogo ainda não publicado. Evidência: 6 arquivos/39 testes focados passaram; suíte Web final — 101 arquivos/519 testes passou; `rtk pnpm --dir apps/web typecheck` e `rtk pnpm lint` passaram; `rtk git diff --check -- apps/web/src/features/issues/assigned-work docs/specs/sessao-do-codex` passou sem erros de whitespace.
