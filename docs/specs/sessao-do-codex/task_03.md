---
status: completed
title: "Tradutores e prompts"
type: backend
complexity: high
---

# Task 03: Tradutores e prompts

## Visão geral
Traduzir o protocolo confirmado para hooks, textos, pedidos e resultados da porta neutra. Concentrar as diferenças do Codex em módulos puros, incluindo prompts e políticas, sem conectar processos nem habilitar o agente.

<critical>
- LEIA `spec.md`, `_tasks.md`, `AGENTS.md`, as instruções locais aplicáveis e `.agents/rules/code-standards.md` antes de começar.
- FAÇA UMA MINI-TAREFA POR VEZ, na ordem. Só marque `[x]` depois de executar o “Pronto quando” e conferir o resultado.
- NÃO saia dos arquivos listados sem registrar o motivo no Registro de execução. Divida helpers e testes para respeitar 100 linhas por arquivo `.ts`, 30 linhas por função e até 3 parâmetros; não transforme uma mini-tarefa num diff maior que aproximadamente 200–300 linhas sem subdividi-la no plano.
- TESTES JUNTO COM O CÓDIGO: siga `.agents/skills/software-testing/SKILL.md` e `references/escolha-e-desenho.md`. Cenário → efeito específico esperado da spec → fronteira real. Sem asserções vagas, expectativas calculadas pela implementação ou mocks do comportamento sob teste. Controle relógio, concorrência e aleatoriedade.
- Ao começar, mude o status para `in_progress` aqui e no manifesto. Marque também cada teste atribuído somente com evidência. Use `completed` apenas após todas as mini-tarefas e critérios de sucesso; a revisão `spec-conformance` acontece uma vez na feature inteira, após as sete tarefas.
- Preserve alterações já presentes no workspace. Não faça commit, push, PR nem implemente sugestões fora do escopo.
</critical>

## Requisitos
- **REQ-114:** Mostrar e guardar somente mensagens completas principais, intermediárias e finais; NÃO guardar raciocínio, stdout de comandos, diffs aplicados sem pedido ou atividade de subagentes.
- **REQ-115:** Emitir os eventos da Spec B com os mesmos resumos e limites para início, prompt, cada caminho, comandos, skill, espera e encerramento.
- **REQ-116:** Ativar skill por entrada explícita ou leitura observável confirmada no spike; captura DEVE respeitar as Specs B/D.
- **REQ-117:** Perguntas DEVEM ser de escolha única, com Outra apenas quando permitida, e devolver rótulo/texto com o id original.
- **REQ-120:** Traduzir os três modos para as políticas confirmadas; manter a escolha durante a sessão.
- **REQ-123:** Allow_always DEVE devolver somente a regra original proposta pelo Codex; allow_session NÃO DEVE persistir configuração.
- **US-16:** Cobrir os três cenários: opções/descritivos, Outra e alternativa textual; a conexão da alternativa textual pertence ao runtime.
- **B-43:** GrantRoot DEVE mostrar o caminho fora do clone e não oferecer aprovação por sessão.
- **B-46:** Ignorar textos/eventos de subagentes, mantendo pedidos que cheguem à sessão principal encaminháveis.
- **B-47:** Perguntas continuam funcionando em Tudo liberado.
- **B-48:** Acionamento explícito DEVE usar a skill do Flow Dev pelo caminho, mesmo havendo homônima no clone.
- **DEC-30:** Traduzir para o vocabulário interno existente, sem reescrever broker/resumidor ou criar histórico paralelo.
- **DEC-31:** Usar raiz extra e entrada skill com nome/caminho, sem instalação no perfil pessoal.
- **§7.15:** Rotas, geração e mensagens iniciadas por $skill DEVEM acionar a skill; exibição usa [skill], mantendo o restante do texto.
- **§7.16 — conteúdo:** Formatar comando/motivo/regra, caminhos/tipos/diffs e permissões extras com os limites da Spec C.
- **US-16.1:** Cenário de aceite: Pergunta com opções, descritivos e Outra.
- **US-16.2:** Cenário de aceite: Outra entrega texto exato ao Codex.

## Interfaces
- **Consome:** extensões de `RuntimePermissionRequest/Result`, `QuestionPayload`, `PermissionPayload` e `CodexStatus` da tarefa 02; exemplos sanitizados de `v45-spike.md`.
- **Produz:** `codexItemTranslator` e `codexRequestTranslator` em `application/services/terminal/codex/`; retornos usam `HookPayload` e os contratos de pedido/resultado existentes, incluindo ids e ofertas efetivas.
- **Produz:** `codexThreadOptions` em `infra/terminal/codex/`, com opções de start/resume equivalentes para modelo, esforço, sandbox, aprovação e flag.
- **Produz:** montagem de entradas text/skill e texto de exibição, reutilizando `FLOW_DEV_SKILLS`. Claude mantém `/flow-dev:...`; Codex usa a entrada tipada e não recebe esse prefixo.
- Tipos gerados do protocolo ficam em infra; os tradutores de application recebem projeções estruturais mínimas definidas junto deles, sem import de infra. O runtime faz a ponte tipada. Não copiar o protocolo inteiro para application.

## Mini-tarefas

- [x] **03.1 — Filtrar mensagens completas da conversa principal**
  - **Arquivos:** `packages/api/src/application/services/terminal/codex/codexItemTranslator.ts (criar)`; `packages/api/src/application/services/terminal/codex/codexItemInput.ts (criar)`; `packages/api/src/application/services/terminal/codex/codexAssistantText.test.ts (criar)`.
  - **Testes:** V-46a, V-46b
  - **Pronto quando:** `rtk pnpm --dir packages/api exec vitest run src/application/services/terminal/codex/codexAssistantText.test.ts` passa com fixtures do protocolo confirmado.
  - **Nota:** Consumir item concluído, sem duplicar deltas/completed. Não filtrar pedidos pela mesma regra que esconde texto de subagentes.

- [x] **03.2 — Traduzir hooks por caminho, comando e skill**
  - **Arquivos:** `packages/api/src/application/services/terminal/codex/codexHookTranslator.ts (criar)`; `packages/api/src/application/services/terminal/codex/codexSkillActivity.ts (criar)`; `packages/api/src/application/services/terminal/codex/codexHookTranslator.test.ts (criar)`; `packages/api/src/application/services/terminal/hookToolEvents.ts`; `packages/api/src/application/services/terminal/hookEventSummarizer.ts (somente se extensão compatível for necessária)`.
  - **Testes:** V-46d, V-46e, V-46f, V-46g
  - **Pronto quando:** `rtk pnpm --dir packages/api exec vitest run src/application/services/terminal/codex/codexHookTranslator.test.ts src/application/services/terminal/hookEventSummarizer.test.ts` passa.
  - **Nota:** Provar também os payloads com o resumidor real. Em move, conservar os caminhos necessários ao evento; não guardar o diff aplicado ou stdout.

- [x] **03.3 — Traduzir perguntas com ids, opções e texto livre**
  - **Arquivos:** `packages/api/src/application/services/terminal/codex/codexRequestTranslator.ts (criar)`; `packages/api/src/application/services/terminal/codex/codexQuestionTranslator.ts (criar)`; `packages/api/src/application/services/terminal/codex/codexQuestionTranslator.test.ts (criar)`.
  - **Testes:** V-46c, V-47g
  - **Pronto quando:** `rtk pnpm --dir packages/api exec vitest run src/application/services/terminal/codex/codexQuestionTranslator.test.ts` passa com ids distintos para perguntas de mesmo texto, opções/descritivos, secret e Outra permitida/proibida.
  - **Nota:** Perguntas abertas/secretas sem opções não podem ficar sem forma de resposta. Seguir o contrato real observado no spike; a resposta original vem pelo transporte da tarefa 02.

- [x] **03.4 — Traduzir aprovações sem ampliar escopos**
  - **Arquivos:** `packages/api/src/application/services/terminal/codex/codexRequestTranslator.ts`; `packages/api/src/application/services/terminal/codex/codexApprovalTranslator.ts (criar)`; `packages/api/src/application/services/terminal/codex/codexApprovalResult.ts (criar)`; `packages/api/src/application/services/terminal/codex/codexApprovalTranslator.test.ts (criar)`; `packages/api/src/application/services/terminal/codex/codexApprovalResult.test.ts (criar)`; `packages/api/src/application/services/terminal/permissionRuleText.ts`.
  - **Testes:** V-47a, V-47b, V-47c, V-47d, V-47e, V-47f
  - **Pronto quando:** `rtk pnpm --dir packages/api exec vitest run src/application/services/terminal/codex/codexApprovalTranslator.test.ts src/application/services/terminal/codex/codexApprovalResult.test.ts` passa para cada resposta concreta e pedido especial.
  - **Nota:** O motivo da recusa é texto da próxima vez, uma única vez, sem perder mensagens já enfileiradas. Não mandar um campo inexistente ao protocolo para aparentar suporte.

- [x] **03.5 — Fixar políticas, entradas de skill e prompts por agente**
  - **Arquivos:** `packages/api/src/infra/terminal/codex/codexThreadOptions.ts (criar)`; `packages/api/src/infra/terminal/codex/codexThreadOptions.test.ts (criar)`; `packages/api/src/application/services/terminal/codex/codexTurnInput.ts (criar)`; `packages/api/src/application/services/terminal/terminalPromptCopy.ts`; `packages/api/src/application/services/terminal/terminalPromptBuilder.ts`; `packages/api/src/application/services/terminal/taskPlanPrompts.ts`; `packages/api/src/application/services/terminal/codex/codexPrompt.test.ts (criar)`.
  - **Testes:** V-46h, V-48a, V-48b, V-48c, V-48d
  - **Pronto quando:** `rtk pnpm --dir packages/api exec vitest run src/infra/terminal/codex/codexThreadOptions.test.ts src/application/services/terminal/codex/codexPrompt.test.ts src/application/services/terminal/taskPlanPrompts.test.ts` passa; `rtk pnpm --dir packages/api typecheck` passa.
  - **Nota:** Fixar os nomes exatos de campos conforme v45-spike.md. Um prompt do plano sem skill explícita continua sendo execução, sem acionar spec-to-tasks por engano. Mudanças nas assinaturas de builder devem preservar defaults dos chamadores até a tarefa 05. Asserções de captura completa com Postgres pertencem ao V-54a da 05.6; estes casos validam tradução e pipeline puro, sem fingir persistência.

## Detalhes de implementação
Leia layered-backend; trpc-nextjs se tocar contratos consumidos. Reutilize os hooks e limites existentes; nunca importe gerados de infra em application. Cada caso usa fixtures mínimas sanitizadas obtidas no spike. Os arquivos propostos são novos, a criar respeitando 100 linhas; separar testes por responsabilidade quando necessário.

### Arquivos relevantes
- `packages/api/src/application/services/terminal/hookEventSummarizer.ts`: oráculo de formato da Spec B.
- `packages/api/src/application/services/terminal/hookToolEvents.ts`: reconhecimento de ferramentas e caminhos.
- `packages/api/src/application/services/terminal/terminalEventIngestion.ts`: ativação e captura existentes.
- `packages/api/src/application/services/terminal/planCaptureRule.ts`: captura das sessões do plano sem skill.
- `packages/api/src/infra/terminal/fileSessionContextBuilder.ts`: copia skills e referências para contexto/skills.
- `packages/api/src/application/terminal/sessionContext.ts`: FLOW_DEV_SKILLS e paths reais.

### Arquivos afetados
Os caminhos de alteração estão em cada mini-tarefa; os marcados “criar” ainda não existem. Helpers adicionais pertencem ao mesmo diretório da responsabilidade e devem ser registrados antes da edição. Não usar uma renomeação geral para acomodar a feature.

### Decisões relacionadas
DEC-30/31 aplicadas como tradutores puros; políticas e entrada de skill seguem v45-spike.md. O suporte condicional da flag é definido aqui e conectado pela tarefa 05.

## Premissas
Só a leitura observável de SKILL.md confirmada no V-45 pode ativar skill implicitamente. A versão mínima e os tipos de permissão extra ainda podem mudar no spike; não inferir formatos por memória.

## Testes atribuídos
Cada ID abaixo tem um único dono no plano; grupos da matriz da spec foram expandidos em casos concretos. IDs IT-50x são complementos deste plano, não novos requisitos de produto.

- [x] **V-46a** (03.1): Itens agentMessage principais de comentário e resposta final, incluindo deltas anteriores → cada mensagem completa aparece uma vez, na ordem · tradutor real, fixtures do protocolo.
- [x] **V-46b** (03.1): Receber reasoning, stdout de comando e diff de fileChange já aplicado → nenhum texto de conversa nem payload persistível contém esses conteúdos · tradutor real.
- [x] **V-46c** (03.3): Receber mensagens e eventos de thread/subagente → nenhuma mensagem/hook da conversa principal; pedido desse subagente continua classificável para aprovação · tradutores reais.
- [x] **V-46d** (03.2): FileChange concluído com add/update/delete/move → hooks por caminho produzem eventos de criar/editar/remover/mover com caminhos corretos, sem diffs no resumo · tradutor + resumidor reais.
- [x] **V-46e** (03.2): Comando completo com output volumoso → PostToolUse Bash traz comando e resumo nos limites da Spec B, sem output · tradutor + resumidor reais.
- [x] **V-46f** (03.2): Início, prompt, término de vez e encerramento → hooks SessionStart/UserPromptSubmit/Stop/SessionEnd e espera adequados, uma vez cada; Stop permite captura existente · tradutor + pipeline de resumo reais.
- [x] **V-46g** (03.2): Entrada skill explícita ou leitura de SKILL.md observável confirmada → evento ativa somente a skill correspondente na vez; Stop termina a ativação · tradutor + ingestão de estado real, arquivo temporário quando pertinente.
- [x] **V-46h** (03.5): Mensagem começa por $spec-writer com homônima no clone → entrada aponta para contexto/skills/spec-writer/SKILL.md; skill desconhecida não é substituída e texto comum permanece exato · parser e composição reais.
- [x] **V-47a** (03.4): Permitir comando oferecido → resposta JSON-RPC accept, sem emenda persistente · tradução real.
- [x] **V-47b** (03.4): Permitir nesta sessão em comando oferecido → acceptForSession, sem destino localSettings ou escrita de regra · tradução real.
- [x] **V-47c** (03.4): Permitir sempre com emenda proposta → acceptWithExecpolicyAmendment carrega exatamente a emenda gravada; alteração livre da regra não é incorporada · tradução real.
- [x] **V-47d** (03.4): Recusar com motivo → decline; motivo separado para próxima vez, uma única vez e dentro do limite de 2.000 · tradutor e composição de entrada reais.
- [x] **V-47e** (03.4): Pedido de arquivos com criar/editar/remover/mover e grantRoot → caminhos e tipos/diffs formatados, grantRoot externo visível sem allow_session; demais botões traduzem a decisão oferecida · tradutor real.
- [x] **V-47f** (03.4): Pedido de rede/pasta extra → título Pedir permissão com pedido/motivo e somente allow/deny; resultado usa o tipo confirmado no spike · tradutor real.
- [x] **V-47g** (03.3): Perguntas de escolha única com/sem Outra, duas perguntas de mesmo texto e uma secreta → ids originais preservados e resposta contém answers[id].answers com um rótulo/texto correto; segredo não entra no histórico do tradutor · tradução real.
- [x] **V-48a** (03.5): bypass, accept_edits e ask_all → approval/sandbox iguais à tabela confirmada no V-45, sem modo plano · builder real, valores esperados do relatório.
- [x] **V-48b** (03.5): Start e resume com modelo/esforço escolhidos → mesmas opções e esforço no local exigido pelo protocolo; anexos de imagem viram localImage e demais caminhos seguem no texto · builders reais + caminhos temporários.
- [x] **V-48c** (03.5): Constante de perguntas ativa/desligada → config liga a ferramenta apenas quando suportada; alternativa permite pergunta textual e término normal da vez · opções e entradas reais.
- [x] **V-48d** (03.5): Montar prompts Tech Spec/PRD, Execução direta, geração e plano em Claude/Codex → instrução preservada, sintaxe correta por agente e exibição [skill] no Codex; trocar configuração externa não muda modo/modelo da sessão · builders reais.

## Verificação da tarefa
- Comandos de shell usam `rtk`, conforme `/home/mauricio/.codex/RTK.md`.
- Durante a implementação, rode só os arquivos afetados. Em `packages/api/test/`, use `rtk pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts <arquivo>`; em `packages/api/src/`, omita `--config`.
- Agrupe as edições antes do typecheck. Se alterar contratos consumidos pela web, confira também `rtk pnpm --dir apps/web typecheck`.
- No fechamento de uma tarefa que alterou a API, rode `rtk pnpm --dir packages/api test` e `rtk pnpm --dir packages/api test:integration` uma vez. Para a web, `rtk pnpm --dir apps/web test` uma vez. Repita somente falhas; depois confirme com a suíte completa.
- Não defina `TEST_DATABASE_URL` localmente. A integração provisiona Postgres descartável; requer `pg_config`, `initdb` e `pg_ctl`. Não aumente timeouts nem reduza workers para esconder lentidão.
- `packages/api/package.json` não tem script de lint. `rtk pnpm lint` é o comando do monorepo. Build e Playwright ficam na tarefa 07, que cobre o fluxo visível alterado; se uma mini-tarefa mudar rotas ou configuração de build, execute o gate pertinente nela e registre a razão.

## Critérios de sucesso
- Todas as mini-tarefas e testes atribuídos marcados apenas depois de comprovados.
- Dezenove casos passam com valores esperados do protocolo e da spec.
- Nenhum texto excluído chega à porta de persistência; hooks alimentam o pipeline existente.
- Schemas/brokers da 02 permanecem a única representação compartilhada; suites/typecheck pertinentes passam.
- Respeitar as regras de código, camadas e autorização do projeto; registrar qualquer gate indisponível sem declarar sucesso.

## Registro de execução
<!-- Acrescentar data, mini-tarefa, mudança, comandos/resultados, desvios e limitações. Sem evidência de implementação na criação deste plano. -->
- 2026-11-23 — Task 03 iniciada; leitura de requirements e decisões concluída. Implementação começa pela 03.1.
- 2026-11-23 — 03.1 concluída: `codexAssistantText` emite somente item `agentMessage` completo da thread principal, lê texto agregado/blocos de texto e ignora deltas, reasoning, execução, diff e thread filha. `codexAssistantText.test.ts` passou (3 casos). O aspecto de classificação de pedidos de subagente do V-46c foi transferido para 03.3, onde o tradutor de pedidos é implementado, para manter a seleção de texto separada da classificação de aprovações.
- 2026-11-23 — 03.2 concluída: hooks Codex mapeiam início/retomada de thread, prompt de vez, conclusão, comando e mudanças de arquivo para payloads existentes. Add/update/delete/move preservam o tipo e geram um evento por caminho; saída de comando e diff aplicado não passam ao resumidor. Os fixtures de fileChange seguem a projeção gerada localmente pelo Codex 0.159.3 (`FileUpdateChange`). Skills só ativam pela entrada explícita cujo caminho coincide com `contexto/skills/<nome>/SKILL.md`; V-45 não observou hook de leitura. `codexHookTranslator.test.ts` e o `hookEventSummarizer.test.ts` real passaram (17 testes). A entrada `$skill` foi transferida para 03.5, que monta o input do turno.
- 2026-11-23 — 03.3 concluída: `item/tool/requestUserInput` vira pedido `AskUserQuestion` compatível com o broker, preservando ids, descrições, secret e `isOther`; perguntas abertas recebem opção vazia e texto livre explícito. Respostas voltam no shape `answers[id].answers` e perguntas de thread filha continuam classificáveis sem expor texto ao histórico. `codexQuestionTranslator.test.ts` passou (3 casos) e API typecheck passou. O V-46c foi transferido para esta mini-tarefa para cobrir conjuntamente filtro de texto e classificação de pedido.
- 2026-11-23 — 03.4 concluída: command/fileChange/permissions request viram os pedidos existentes, filtram decisões conforme `availableDecisions`, não oferecem aprovação permanente sem emenda e retiram `allow_session` de `grantRoot`/permissões extras. A emenda execpolicy em string passa pelo payload sem reescrita; o resultado produz `accept`, `acceptForSession`, `acceptWithExecpolicyAmendment` ou `decline` com motivo separado para próxima vez. Resumo real formata comando, grantRoot e diff, com truncamento herdado. O classificador P-20 aceita somente ações `read/listFiles/search` restritas ao clone e `fileChange` no modo accept_edits; o grupo de traduções de aprovação passou (6 casos).
- 2026-11-23 — 03.5 concluída: `codexThreadOptions` fixa as políticas observadas para os três modos, modelo no thread/resume, esforço no turn e a flag experimental de perguntas com fallback configurável. `codexTurnInput` converte prefixos de rota e `$skill` conhecida na entrada tipada `skill` pelo caminho do contexto; skill desconhecida fica como texto original, imagens viram `localImage`, outros anexos ficam no texto. Prompts de plano sem prefixo permanecem execução. Testes de opções, prompts e `taskPlanPrompts` passaram (14 casos) e API typecheck passou.
- 2026-11-23 — Fechamento da task 03: `rtk pnpm --dir packages/api test` passou (122 arquivos/788 testes); `test:integration` passou (138 arquivos/731 testes, 2 arquivos e 5 casos skipped); `rtk pnpm --dir apps/web test` passou (99 arquivos/502 testes); API typecheck, `rtk pnpm lint` e `rtk git diff --check` passaram.
