# Revisão parcial de conformidade 001 — Sessão do Codex

> **Data:** 2026-11-24 · **Escopo:** tarefas 01–06, implementação atual e alterações não commitadas (`HEAD` + arquivos novos).
> **Contrato:** `docs/specs/sessao-do-codex/spec.md`, com a matriz de ownership de `_tasks.md`.
> **Exceção autorizada:** o usuário pediu para ignorar a tarefa 07, ainda `in_progress`, e revisar as outras etapas. Esta revisão não aprova a entrega final nem exige concluir a tarefa 07 para corrigir os achados abaixo.

## Veredito parcial: REPROVADO

Há defeitos reproduzidos na disponibilidade, no envio de respostas, na retomada e no encerramento, além de divergências entre as aprovações implementadas e o protocolo da CLI 0.159.3. Os testes específicos existentes não detectam essas conexões quebradas.

| Bloqueante | Importante | Menor | Spec a discutir |
|---|---|---|---|
| 6 | 5 | 0 | 0 |

Nenhum código ou status de tarefa foi alterado. Apenas este relatório e uma linha de acompanhamento no manifesto foram escritos.

## Escopo e fontes

Foram lidos `AGENTS.md`, `CLAUDE.md`, `/home/mauricio/.codex/RTK.md`, `apps/web/AGENTS.md`, `apps/web/CLAUDE.md`, `.agents/rules/code-standards.md`, as partes pertinentes de PRODUCT/DESIGN e as skills `layered-backend`, `trpc-nextjs`, `nextjs-folder-structure`, `software-testing` com seu guia de revisão, `vercel-react-best-practices` e as referências de `spec-conformance`.

A árvore contém trabalho simultâneo das Specs C/D e de acesso. O scanner encontrou 452 arquivos; isso não torna todas essas alterações parte da Spec E. A leitura priorizou os módulos novos de Codex, seus consumidores compartilhados, persistência, composição, controllers e testes das tarefas 01–06. A dependência `yaml` e o E2E pendente da Spec D não foram atribuídos a esta implementação.

O spike V-45 foi inspecionado, incluindo o roteiro e a diferença entre threads efêmeras e persistentes. Não foram repetidas as inferências, aprovações permanentes ou provas manuais históricas. Nesta revisão, a CLI real foi usada somente para versão/login, geração de schemas e start/resume local sem executar uma turn, com perfil e diretório temporários nesse último experimento. Os testes de processo adicionais usaram o servidor falso e encerraram seus próprios filhos.

## Verificação executada

| Comando / experimento | Resultado observado | Exit |
|---|---|---|
| `rtk python3 -I .agents/skills/spec-to-tasks/scripts/tasks_status.py docs/specs/sessao-do-codex` | 01–06 completed; 07 in_progress; 28/32 mini-tarefas | 0 |
| `rtk python3 -I .agents/skills/spec-conformance/scripts/scan_diff.py --repo . --worktree --max-lines 100` | 452 arquivos; pistas conferidas no escopo, incluindo dois testes `.ts` novos acima de 100 linhas | 0 |
| `rtk pnpm --dir packages/api test` | 123 arquivos passaram, 1 falhou; 794 testes passaram, 1 falhou: `scriptedFileStep.test.ts:32`, ENOENT na leitura do arquivo | 1 |
| `rtk pnpm --dir packages/api exec vitest run src/infra/terminal/scriptedFileStep.test.ts` | Repetição somente do arquivo que falhou: 3/3 passaram | 0 |
| `rtk pnpm --dir packages/api test:integration` | 152 arquivos passaram, 1 falhou, 2 skipped; 756 testes passaram, 1 falhou, 5 skipped. `session-latency.test.ts:86`: p95 de entrada 2.127 ms, limite 2.000 ms | 1 |
| `rtk pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/session-latency.test.ts` | Repetição isolada do arquivo que falhou: 1/1 passou | 0 |
| `rtk pnpm --dir apps/web test` | 101 arquivos e 519 testes passaram | 0 |
| `rtk pnpm --dir packages/api run typecheck` | `tsc --noEmit`, sem erros | 0 |
| `rtk pnpm --dir apps/web run typecheck` | Geração de tipos e `tsc --noEmit`, sem erros | 0 |
| `rtk pnpm lint` | ESLint web concluído; API não possui script lint | 0 |
| CLI local, capturando canais separadamente | `codex-cli 0.159.3`; login exit 0, stdout vazio, stderr `Logged in using ChatGPT` | 0 |
| `codex app-server generate-json-schema --experimental --out <temporário>`, invocado pelo wrapper RTK | Schemas oficiais locais de FileChangeRequestApprovalParams, PermissionsRequestApprovalResponse e ThreadStartParams inspecionados; temporário removido | 0 |
| Probes via `rtk pnpm exec tsx --input-type=module` em `packages/api`, com código por stdin | B-1, B-2, B-4, B-5, B-6, I-1 e I-2 reproduzidos chamando os módulos existentes; saídas abaixo | 0 |
| Probe Python com app-server real, perfil temporário, thread efêmera, SIGKILL próprio e resume | `thread/start` aceito; `thread/resume` retorna `-32600`, `no rollout found for thread id ...`; nenhuma turn executada | 0 |

As três suítes foram iniciadas concorrentemente; a concorrência é uma limitação material da medição de latência. As duas falhas compartilhadas passaram isoladamente, sem alteração de código. Isso não transforma as execuções completas em verdes nem prova regressão causada pela Spec E. Os defeitos funcionais abaixo têm evidência independente dessas falhas. Todos os arquivos de teste Codex executados nas suítes passaram, o que evidencia as lacunas de contrato descritas nos achados.

Build, Playwright, latência específica Codex e smoke V-52 permanecem fora desta revisão parcial, conforme a autorização para excluir a tarefa 07. Skips não foram contados como prova. Não foi definida `TEST_DATABASE_URL`; a integração provisionou seu PostgreSQL descartável.

## Conformidade com a spec

Os estados abaixo se referem ao comportamento especificado, não apenas ao resultado dos testes atuais. ✅ indica evidência automatizada no escopo; 🟡 indica implementação parcial ou fronteira ainda não provada; 🔀 indica comportamento divergente. A evidência histórica manual é identificada como tal.

| Item | Estado | Evidência |
|---|---|---|
| REQ-111 · abertura, clone, escolha, anexos e skills | 🟡 | `codexSessionStart.ts:12`, `codex-runtime-start.test.ts:55` e `codex-open-purpose.test.ts` exercitam a conexão com processo falso; produção bloqueada por B-1 |
| REQ-112 · disponibilidade | 🔀 | B-1: login válido é tratado como ausente |
| REQ-113 · falha de abertura | ✅ | `codex-service-start.test.ts` verifica `launch_failed` e motivo de limite/modelo; `codexSession.ts:85` |
| REQ-114 · mensagens completas e exclusão de conteúdo interno | 🟡 | `codexItemTranslator.ts:6` e `codexAssistantText.test.ts` filtram tipos/thread; I-2 corrompe texto na fronteira stdio |
| REQ-115 · eventos compartilhados | ✅ | `codexHookTranslator.ts`, `codexHookTranslator.test.ts`, `hookToolEvents.ts`; add/update/delete/move, comando, skill e Stop exercitados |
| REQ-116 · ativação de skill e captura | ✅ | `codexTurnInput.ts`, `codexSkillActivity.ts`; `codex-service-flow.test.ts` e `codex-service-plan-flow.test.ts` provam captura em clone e banco reais com processo falso |
| REQ-117 · respostas de escolha única e Outra | 🔀 | B-2: a UI envia chave textual; API exige ID, incluindo perguntas de texto igual |
| REQ-118 · campo secreto e armazenamento redigido | 🟡 | Transporte/armazenamento reais em `codex-secret-answer.test.ts`; campo password em `QuestionField.tsx:13`; entrega pela tela bloqueada por B-2 |
| REQ-119 · alternativa textual | ✅ | Constante e opção em `codexThreadOptions.ts:4`; `codex-service-messages.test.ts` exercita flag desligada, término da vez e mensagem seguinte |
| REQ-120 · três modos durante a sessão | 🔀 | Builder mantém política; B-4 impede aprovação automática de edições nativas no modo `accept_edits` |
| REQ-121 · comando, motivo, ofertas e regra | 🟡 | `codexApprovalTranslator.test.ts`, `PermissionRequestCard.test.tsx`; apresentação/ofertas presentes, mas o motivo de recusa não chega à próxima vez (I-1) |
| REQ-122 · caminhos, tipos e diffs no pedido | 🔀 | B-4: o tradutor espera `changes` no request que não contém esse campo |
| REQ-123 · regra exata e escopo de sessão | ✅ | `codexApprovalResult.ts:14`, `codex-permission-scope.test.ts`; emenda original e preservação de `localSettings` Claude. Persistência efetiva na CLI tem somente evidência histórica V-45 |
| REQ-124 · fila, interrupção, close, recuperação | 🔀 | Fila/crash/cancelamento exercitados em `codex-service-messages`, `codex-runtime-controls` e `codex-service-recovery`; B-6 e I-3 quebram o encerramento contratado |
| REQ-125 · mesma conversa após reinício | 🔀 | B-3: start efêmero é incompatível com resume em novo processo |
| REQ-126 · escolha editável na rota | ✅ | `useTerminalLaunch.ts:16`, `TerminalLaunchChoice.test.tsx:19`; Claude/Opus/max inicial e payload Codex com edição preservada |
| REQ-127 · modelo padrão e maior esforço | ✅ | `AgentChoiceField.tsx:11`, `AgentChoiceField.test.tsx`; padrão publicado diferente do primeiro e esforços por modelo |
| NFR-19 · PATH, stdio, argumentos fixos e grupo próprio | 🟡 | `codexProcess.ts:17`, `codex-runtime-controls.test.ts`; B-6 deixa um filho vivo após close durante abertura |
| NFR-20 · segredo e proteção de diffs | 🟡 | `codex-secret-answer`, `session-timeline-access`, `issue-deletion-terminal`; proteção de armazenamento presente, mas B-4 impede obter o diff do pedido real |
| NFR-21 · versão Codex e rejeição da antiga | ✅ | `codexSession.ts:44`, `codexCatalogProbe.ts`, `codexCatalogProbe.test.ts`, `codex-service-flow.test.ts` |
| §14 · migration e metadados | 🟡 | `0051_codex_sessions.sql`, rollback guarded, journal e `codex-sessions-migration.test.ts`; versão de novas sessões Claude não é preenchida (I-5) |
| §15 · extensão dos contratos existentes | ✅ | `codex-request-contract.test.ts`, `codexContracts.test.ts`; sem procedure de sessão exclusiva do Codex |
| §18 · validação/autorização | ✅ | `sessionRequestController.ts:40`, `sessionControlAuthorization.ts:23`; `codex-request-validation.test.ts` valida IDs/ofertas e os testes de acesso continuam aplicáveis |
| §19 · observabilidade | ✅ | `codexSessionControls.ts:16`, `codexCatalogPublisher.ts:16`, `codex-runtime-start.test.ts:65`; agente, versão, PID, flag e método sem prompt nos logs exercitados |
| §7.16 · permissões extras | 🔀 | B-5: resultado `{ decision }` não implementa PermissionsRequestApprovalResponse |

### Histórias, bordas, decisões e preservação

| Item | Estado | Evidência / limite |
|---|---|---|
| US-15.1–4 | 🟡 | Escolha/abertura/mensagem/captura exercitadas com processo falso; B-1 bloqueia CLI logada; prazo e smoke da tarefa 07 excluídos |
| US-16.1–2 | 🔀 | B-2 impede respostas pela tela; tradutor puro preserva IDs |
| US-16.3 | ✅ | Alternativa textual em `codex-service-messages.test.ts` |
| US-17.1/3 | ✅ | Ofertas/regra em testes de tradução, mapper e RTL; regra persistente real somente no V-45 histórico |
| US-17.2 | 🟡 | Tradução `acceptForSession` exercitada; isolamento efetivo de regra por sessão somente no spike histórico |
| US-17.4 | 🔀 | B-4: sem diff/caminhos do item real |
| US-18.1–3 | 🔀 | Interrupção/crash exercitados; retomada inviável após perder thread efêmera (B-3), e close tem corrida (B-6) |
| US-19.1–2 | ✅ | `TerminalLaunchChoice.test.tsx`, `AgentChoiceField.test.tsx` e parser de skill |
| B-43 | 🟡 | grantRoot visível e sem `allow_session`, mas o diff continua faltando no request real (B-4) |
| B-44 | ✅ | `codex-open-availability.test.ts` e `codex-service-start.test.ts`: modelo removido/limite, item do plano editável |
| B-45 | 🟡 | Teste com dois grupos independentes passa; corrida de abertura/close não está coberta (B-6) |
| B-46 | ✅ | Filtro de thread em tradutores e pedido de subagente encaminhado em `codex-runtime-requests.test.ts` |
| B-47 | 🟡 | Broker preserva perguntas no bypass, mas resposta pela UI falha (B-2) |
| B-48 | ✅ | Entrada skill usa caminho do contexto; `codexPrompt.test.ts` e spike histórico com homônima |
| B-49 | ✅ | `codex-service-flow.test.ts` e `codex-runtime-recovery.test.ts`: saída/crash → interrupted e cancelamento |
| DEC-29 | 🟡 | Um filho por sessão, sem daemon; lifecycle parcial (B-6/I-3) |
| DEC-30 | ✅ | Mesmo broker, recorder, estados e tabelas; extensões explícitas de kinds/decisões |
| DEC-31 | ✅ | `skills/extraRoots/set` e entrada skill por caminho; sem instalação no perfil |
| DEC-32 | 🟡 | Publisher inicial/10 min e preflight lendo snapshot testados; login no transporte real está errado (B-1) |
| DEC-33 | ✅ | Flag configurável e fallback textual exercitados sem modo plano |
| P-17/P-19/P-20 | 🟡 | Evidência manual V-45 inspecionada e testes de tradução presentes; não foi repetida inferência real nesta revisão; P-20 não se sustenta para arquivos reais (B-4) |
| P-18 | 🔀 | Spike usa `ephemeral=False` em `probe_initialize.py:207/213`; runtime usa `true` (B-3) |
| §9 · Claude e agentes isolados | 🟡 | Argumentos isolados mantidos, testes existentes executados; metadata de nova sessão Claude incompleta (I-5); smoke/regressão completa IT-509 excluídos |
| §9 · perfil pessoal, armazenamento e leitura comuns | ✅ | Processo de produção herda perfil, sem flags de isolamento dos agentes de planejamento; broker/timeline/control authorization compartilhados; provas automatizadas não equivalem ao smoke real |
| §4 · não objetivos | ✅ | Não foi encontrado turn/steer, modo plano, instalação/login automático ou UI própria de subagentes nos módulos da Spec E |
| NFR-18, V-52, V-53, IT-508/509 e §20/24 final | Fora do gate parcial | Ownership da tarefa 07; ausência dessas provas não foi contada como achado |

### Casos atribuídos às tarefas 01–06

| Casos | Avaliação da prova |
|---|---|
| V-45a–j | Relatório/roteiro histórico presentes; versão/login confirmados agora. Provas de inferência não repetidas. V-45g foi transposto incorretamente para start efêmero (B-3) |
| IT-501/502 | Migration/rollback reais testados em `codex-sessions-migration.test.ts` |
| IT-503/504/505 | Persistência/timeline/alias, catálogo e schemas em `codex-request-contract` e `codexContracts` |
| V-47h/i/j | Controller e Postgres reais em `codex-request-validation`; ofertas, opções, IDs e limites exercitados |
| V-47k, IT-506/507 | NOTIFY entre processos, armazenamento redigido, ausência de listener, cancelamento prévio, escopos e leitura/deleção exercitados. O teste de cancelamento conclui cancelamento antes do envio; não comprova sozinho uma corrida simultânea nem segredo chegando ao app-server através da tela |
| V-46a/b/c/d/e/f/g/h | Tradutores, hooks, parser e captura cobertos. Integridade do texto na fronteira stdio não protegida (I-2) |
| V-47a/b/c/g | Tradutores puros cobertos; V-47g não protege a composição UI/API (B-2) |
| V-47d | Só verifica objeto `nextMessage`; falta seu consumo na próxima entrada (I-1) |
| V-47e/f | Fixtures/asserções não representam os contratos reais de arquivos/permissões extras (B-4/B-5) |
| V-48a/b/c/d | Políticas, escolha/esforço, flag e skills testados; start/resume com histórico persistente não comprovado (B-3) |
| V-50a/b/c/e/f/g/h | Snapshot/host/heartbeat, versão, modelos, renovação, preflight sem processo e open fresco testados com provedor controlado |
| V-50d | Login positivo real não exercitado pelo transporte automatizado; login injetado esconde B-1 |
| V-49a/g/h | Processo falso real por stdio, erros/IDs/EOF, anexos e hooks testados; frame UTF-8 e close durante probe faltam (I-2/B-6) |
| V-49b, V-54c | Fila/idempotência e requests exercitados, mas `onPermission` do teste de runtime é substituído; não prova UI → validação → Codex |
| V-49c/d/e/f, V-54d | Interrupção/grupos/crash/cancelamento e resume simulado testados; não detectam B-3, B-6 e I-3 |
| V-54a/b | Abertura dos propósitos e captura integradas com Postgres/clone/processo falso; login real e versão Claude não demonstrados |
| V-51a/b/c | RTL comprova apresentação de DTOs fabricados; V-51b não comprova origem real do diff (B-4) |
| V-51d/i | Password/Outra/limpeza demonstrados com pergunta sem ID distinto do texto; chave de envio incompatível escapa (B-2) |
| V-51e/f/g/h | Escolha/defaults/metadados, preservação de edição e leitura/controles demonstrados por RTL |

## Regras do projeto

| Regra / fonte | Estado | Evidência |
|---|---|---|
| `.ts`/classe até 100 linhas; funções até 30; evitar mais de 3 parâmetros (`code-standards.md:39/82/154`) | 🔀 | I-4: arquivos novos com 101/112 linhas e notificações com 5/6 parâmetros |
| Contratos/regras em application, processo/SQL em infra (`layered-backend`, §2) | ✅ | Tradutores em application, RPC/spawn e NOTIFY/ORM em infra; sem import de protocolo infra pelos tradutores |
| Tipos efetivos do protocolo gerados na versão mínima (`spec.md:232`, task 05.1) | 🔀 | `protocol/codexMethods.ts:11` deriva o request do builder interno; requests/respostas são strings/unknown em `codexRpcClient.ts:6`. Os contratos ausentes explicam B-4/B-5; corrigir junto deles |
| Feature frontend no dono e tipos API inferidos (`nextjs-folder-structure`, §4/5) | ✅ | Arquivos em `issues/assigned-work`, contratos via RouterInputs/Outputs, sem implementação backend no browser |
| Identidade/controle no servidor (`trpc-nextjs`, §3; spec §18) | ✅ | Sessão/autoria/operadora exigidas por `SessionControlAuthorization` antes de mutações |
| Testes com oráculo independente e fronteira pertinente (`software-testing/references/revisao-e-diagnostico.md:3`) | 🔀 | Testes positivos usam login injetado, request de arquivo inventado, retorno extra não validado e pergunta sem ID distinto; ver achados associados |
| Fake só em test, sem shell/daemon, matar apenas filhos próprios | 🟡 | Restrição implementada em `codexProcess.ts:26`, processos independentes testados; corrida B-6 |
| Preservar alterações existentes; não editar implementação durante review | ✅ | Nenhum arquivo de código/spec/tarefa individual foi modificado nesta revisão |

## Achados por tarefa

### B-1 · Bloqueante · 04.1 / 05.6 — Login real válido é publicado como ausente

- **Onde:** `packages/api/src/infra/terminal/codex/codexCatalogTransport.ts:35` — `const { stdout } = await run(...)`; linha 36 verifica somente stdout.
- **Contra:** REQ-112, §7.13 e DEC-32 (`spec.md:110/145/325`).
- **Evidência executada:** CLI 0.159.3, `login status` exit 0, stdout `''`, stderr `'Logged in using ChatGPT'`. O próprio `new AppServerCodexCatalogTransport({ binary: 'codex' }).readCatalog()` retornou `{"loggedIn":false,"models":[]}`.
- **Efeito:** o publisher e o guard rejeitam um Codex autenticado; a opção permanece desabilitada e open também falha. Os testes injetam `loginStatus: async () => true` (`codex-catalog-transport.test.ts:23`) e não detectam o erro.
- **Correção mínima:** interpretar os canais/contrato efetivos do comando, incluindo código de saída, com testes da execução externa controlada que represente o stderr real. Não mascarar ausência de autenticação.

### B-2 · Bloqueante · 06.4 — Tela responde por texto, API exige ID

- **Onde:** `apps/web/src/features/issues/assigned-work/questionAnswerModel.ts:34` — `return [question.question, ...]`; `components/QuestionRequestCard.tsx:28` também indexa estado por texto; `QuestionSummary.tsx:6` busca a resposta pelo texto.
- **Contra:** REQ-117/118, §15/18 e V-47g/V-51d/i (`spec.md:119/120/259/339`).
- **Evidência executada:** pergunta traduzida com `id='q-1'`, texto `Qual valor?`, opção A. `toAnswers` produziu `{"Qual valor?":{"labels":["A"]}}`; `validateQuestionAnswers` real retornou `{"ok":false,"reason":"answer_invalid"}`.
- **Efeito:** respostas Codex, inclusive secretas, são rejeitadas pela UI; duas perguntas de mesmo texto compartilham estado e sobrescrevem payload; respostas já gravadas por ID não aparecem corretamente no histórico.
- **Lacuna de teste:** `QuestionRequestCard.test.tsx:44` reaproveita pergunta Claude sem ID diferente do texto; a API testa IDs separadamente. As duas metades passam sem se conectarem.
- **Correção mínima:** usar `question.id ?? question.question` em estado, validação local, payload, resumo e keys. Cobrir um ID diferente do texto e dois IDs com texto idêntico, verificando o payload pela validação real, mais o legado Claude.

### B-3 · Bloqueante · 03.5 / 05.2 / 05.5 — Start efêmero impossibilita retomada

- **Onde:** `packages/api/src/infra/terminal/codex/codexThreadOptions.ts:17` — `start: { ...shared, ephemeral: true }`.
- **Contra:** REQ-124/125 e P-18 (`spec.md:130/131/201`).
- **Evidência:** o spike que comprovou resume usa expressamente `ephemeral=False` em `spike/probe_initialize.py:207/213`. Nesta sessão, uma thread real iniciada como efêmera, sem executar inferência, perdeu o rollout após SIGKILL; um app-server novo respondeu `no rollout found for thread id ...` ao resume.
- **Efeito:** uma sessão real aberta pelo produto não pode restaurar o histórico após restart/crash, embora seu ID esteja no banco. O caminho de falha encerra a conversa e marca a mensagem não entregue.
- **Lacuna de teste:** `codex-runtime-start.test.ts:70` exige a opção errada; `codex-runtime-recovery.test.ts:41` inventa uma thread recuperável, sem tê-la iniciado/persistido antes.
- **Correção mínima:** criar threads persistentes compatíveis com a prova V-45 e testar start → perda do processo → resume do histórico realmente criado, preservando escolhas e o fallback de falha.

### B-4 · Bloqueante · 03.4 / 05.3 — Request real de arquivo não contém o diff esperado pelo tradutor

- **Onde:** `packages/api/src/application/services/terminal/codex/codexApprovalTranslator.ts:44` — `changeText(approval.changes)`; linhas 73–75 exigem `changes` para aceitar edições automaticamente. `codexSessionEvents.ts:11` só consome o item quando completo; não há cache dos changes de `item/started` associado a itemId para o pedido pendente.
- **Contra:** REQ-120/122, §7.14/7.16 e V-47e (`spec.md:124/126/152/164`).
- **Evidência executada:** o JSON Schema gerado pela CLI 0.159.3 para FileChangeRequestApprovalParams possui itemId/threadId/turnId/startedAtMs/reason/grantRoot, sem `changes`. Ao passar esse request real ao tradutor, o resultado teve `input.diff=''`; `codexApprovalCanAutoAccept` em `accept_edits` retornou false.
- **Efeito:** Perguntar tudo mostra aprovação sem caminho/tipo/diff; Aceitar edições pergunta por edições nativas que deveriam seguir sozinhas. O teste `codexApprovalTranslator.test.ts:21` injeta `changes` num request que não o fornece.
- **Correção mínima:** manter os changes do item pendente e correlacioná-los por thread/turn/item antes de montar a aprovação/classificar caminhos. Usar fixtures geradas do protocolo: item/started seguido de request sem changes; cobrir criar/editar/remover/mover, grantRoot e ambos os modos. Conservar os limites de exibição/persistência.

### B-5 · Bloqueante · 03.4 / 05.3 — Permissão extra responde no formato de aprovação de comando

- **Onde:** `packages/api/src/infra/terminal/codex/codexSessionRequests.ts:11/14` — toda permissão retorna `decision`; `codexApprovalResult.ts:11` gera `{ decision: 'accept' }`.
- **Contra:** contrato de §7.16/§16 e V-47f (`spec.md:164/282`, task 03.4).
- **Evidência executada:** `answerCodexRequest(..., 'item/permissions/requestApproval', ...)` retornou `{"decision":"accept"}`. O schema PermissionsRequestApprovalResponse da mesma CLI exige **permissions**, com scope `turn`/`session`; não usa `decision`. A aceitação automática no bypass tem o mesmo problema.
- **Efeito:** Permitir/Recusar rede ou pasta extra envia resultado incompatível; o Codex não recebe a concessão/recusa tipada. O teste atual verifica só a tradução do pedido, não a resposta validada pelo contrato.
- **Correção mínima:** tratar este método separadamente e devolver a projeção de permissões concedidas ou vazias, com o escopo previsto e sem ampliar o pedido. Cobrir allow/deny/bypass contra o schema/tipo gerado. Preservar o formato decision para commandExecution, inclusive overlays desse método.

### B-6 · Bloqueante · 05.4 — Close durante probe permite criar filho depois de encerrar

- **Onde:** `packages/api/src/infra/terminal/codex/codexSession.ts:38/42/49/53` — close termina com child ainda nulo; start prossegue após o await sem verificar closing/abandoned/exited.
- **Contra:** REQ-124, NFR-19, DEC-29 e V-49d (`spec.md:130/194/306`).
- **Evidência executada:** probe retido por promise; `await handle.close()` emitiu `{ kind:'ended' }`; ao liberar o probe válido, foi criado um app-server falso real e seu PID continuava vivo (`process.kill(pid,0)`). O experimento o encerrou com um segundo close no finally.
- **Efeito:** depois de Encerrar, o runtime pode iniciar a turn e executar trabalho sem uma sessão ativa que o controle. Abandon durante abertura tem a mesma ausência de barreira. O teste existente só fecha depois de observar turn/start.
- **Correção mínima:** coordenar conclusão/cancelamento do startup e a finalização do handle. Depois de close/abandon, nenhum await pode iniciar processo/thread/turn; se o spawn já ocorreu, aguardar sua limpeza. Testar cada barreira assíncrona com sincronização explícita, sem sleeps como prova.

### I-1 · Importante · 03.4 / 05.3 — Motivo da recusa nunca compõe a próxima entrada

- **Onde:** `packages/api/src/application/services/terminal/codex/codexApprovalResult.ts:6` cria `nextMessage`; `codexSessionRequests.ts:14` devolve o objeto inteiro ao RPC; `codexSession.ts:70` não consome esse campo.
- **Contra:** fluxo de recusa em `spec.md:292` e V-47d da tarefa 03.4.
- **Evidência executada:** negar com `Não use a rede` retornou `{"decision":"decline","nextMessage":"Não use a rede"}`. Esse campo não faz parte de CommandExecutionRequestApprovalResponse e não existe consumidor de nextMessage na fila/entrada do runtime.
- **Efeito:** o registro mostra o motivo, mas a próxima vez do Codex não o recebe. `codexApprovalResult.test.ts:17` prova apenas a criação de um campo que ninguém usa.
- **Correção mínima:** separar resultado do protocolo da informação a anexar uma única vez à próxima entrada; provar seu consumo por turn/start e sua remoção após entrega, mantendo limite de 2.000 e sem turn/steer.

### I-2 · Importante · 05.1 — Fragmentação UTF-8 altera mensagens e respostas

- **Onde:** `packages/api/src/infra/terminal/codex/codexRpcFrames.ts:8` — `this.pending += chunk.toString()`.
- **Contra:** REQ-114 e enquadramento de V-49h (`spec.md:114`, task 05.1).
- **Evidência executada:** um frame JSON com `ação`, dividido entre os dois bytes de `ç`, foi decodificado como `a��ão`. Cada Buffer é convertido isoladamente, antes de remontar o caractere.
- **Efeito:** stdout é um fluxo de bytes sem garantia de fronteira Unicode; textos, caminhos e rótulos podem ser corrompidos sem erro JSON. `codex-rpc-client.test.ts:26` fragmenta conteúdo ASCII e não detecta isso.
- **Correção mínima:** decodificar incrementalmente com StringDecoder, encoding no stream ou acumulação de bytes; exercitar cortes dentro de caracteres multibyte e EOF.

### I-3 · Importante · 05.4 — Close não executa thread/unsubscribe

- **Onde:** `packages/api/src/infra/terminal/codex/codexSessionControls.ts:11` e `codexSession.ts:38`: detach/terminate; o array `unsubscribe` de `codexSession.ts:33` contém somente callbacks locais, não a chamada do protocolo.
- **Contra:** `spec.md:301` exige `thread/unsubscribe` antes de terminar o grupo; a tarefa 05.4 repete esse contrato.
- **Evidência por leitura:** o caminho completo de close encerra cliente e processo sem enviar esse método. `codex-runtime-controls.test.ts` verifica interrupt/PIDs, mas não unsubscribe nem sua ordem.
- **Efeito:** o encerramento não segue o protocolo de fechamento acordado e encerra o servidor abruptamente. Não confundir remover listeners JS com cancelar a assinatura da thread no app-server.
- **Correção mínima:** tentar unsubscribe da thread ativa antes de fechar o RPC e matar o grupo, com limpeza garantida mesmo se o servidor falhar. Testar método, threadId e ordem, incluindo o caminho de erro.

### I-4 · Importante · 02.5 / 05.1 / 05.2 / 05.3 — Limites explícitos de código não respeitados

- **Onde:** `packages/api/test/codex-runtime-start.test.ts:101` e `packages/api/test/codex-secret-answer.test.ts:112` excedem 100 linhas; `codexSessionEvents.ts:7/16` declara funções com 5/6 parâmetros.
- **Contra:** `.agents/rules/code-standards.md:39/154`; restrições globais do manifesto e das tarefas.
- **Evidência:** contagem fresca dos arquivos novos: 101 e 112 linhas. Não há exceção local. A exceção de shadcn é para `components/ui`, não para esses testes; arquivos `.tsx` apontados pelo scanner não foram automaticamente tratados como violação de limite `.ts`.
- **Correção mínima:** extrair fixtures/helpers por responsabilidade e passar um objeto para os dados de notificação. Preservar as asserções e acrescentar as regressões dos achados sem inflar os arquivos.

### I-5 · Importante · 02.2 / 05.6 — Nova sessão Claude nunca grava agent_version

- **Onde:** `packages/api/src/infra/terminal/agentSdkSession.ts:70` recebe init e anuncia a sessão, sem emitir `onAgentInfo`; `agentSdkSessionRuntime.ts:16` também não informa versão. O único produtor de onAgentInfo nos runtimes é `codexSession.ts:44`.
- **Contra:** contrato de `agent_version` em `spec.md:245`: “versão do Codex ou do Claude Code na abertura”.
- **Evidência por leitura:** `SessionHandlerFactory` só grava a coluna quando recebe esse callback (`sessionHandlers.ts:19`); nenhuma chamada equivalente existe no runtime Claude. O teste de `codex-request-contract.test.ts` demonstra null para legado, não preenchimento de uma nova sessão Claude.
- **Efeito:** sessões novas Claude permanecem indistinguíveis de dados legados quanto à versão, contrariando o metadado contratado. Não foi necessário iniciar Claude real para identificar a ausência do caminho de gravação.
- **Correção mínima:** obter a versão efetiva pelo init/contrato da integração e informar o callback compartilhado, sem alterar a interação Claude. Testar nova sessão Claude com versão preenchida, nova sessão Codex e registro legado ainda nulo.

## Divergências entre registros de execução e evidência

- Task 03.4 considera V-47d/e/f concluídos: há campo de follow-up sem consumidor, request de arquivo com campo inventado e resposta de permissão extra sem o shape requerido. Ver I-1/B-4/B-5.
- Task 05.5 considera retomada preservada: o processo falso aceita qualquer thread simulada, enquanto start real usa ephemeral. A prova do spike usa opção oposta (B-3).
- Task 06.4 considera perguntas entregáveis: seus testes validam campo oculto e payload Claude; a composição real com IDs Codex é rejeitada pela API (B-2).
- Task 05.4 considera close/unsubscribe comprovados: o teste só demonstra término de grupos já iniciados; não envia unsubscribe e não cobre close durante abertura (B-6/I-3).
- Os registros históricos de suítes verdes não foram usados como saída desta revisão. As execuções completas atuais da API falharam e as repetições isoladas passaram, conforme tabela de verificação.

## Atualizações de spec a discutir

Nenhuma mudança de produto é necessária para justificar os defeitos. A implementação deve cumprir o contrato vigente. O detalhamento do protocolo pode explicitar que alterações pertencem ao item correlacionado e que permissions/requestApproval possui resposta própria; isso documenta o contrato gerado, sem substituir as correções.

## Prompt de correção

Corrija a revisão parcial `docs/specs/sessao-do-codex/reviews/review-001.md`, sem concluir ou marcar a tarefa 07 por inferência, nesta ordem:

1. **B-1 — 04.1/05.6:** corrigir `codexCatalogTransport.ts` para reconhecer o login efetivo da CLI, incluindo status em stderr. Acrescentar prova do transporte com saída externa controlada; não substituir o comportamento sob teste por `loginStatus=true`.
2. **B-2 — 06.4:** usar ID da pergunta com fallback legado em `questionAnswerModel`, `QuestionRequestCard` e `QuestionSummary`. Provar pergunta com ID diferente do texto, duas de mesmo texto, segredo e legado, passando o payload pela validação real da API.
3. **B-3 — 03.5/05.2/05.5:** remover a criação efêmera incompatível com resume e provar a retomada da thread anteriormente iniciada/persistida. Atualizar a asserção que exige ephemeral=true; preservar escolhas e a falha controlada da Spec C.
4. **B-4/B-5 — 03.4/05.3:** gerar/manter os tipos usados da CLI mínima em infra, mapear para contratos de application e validar fixtures/respostas por esse contrato. Correlacionar changes do item pendente para pedidos de arquivo; implementar resposta própria de permissions/requestApproval para permitir/recusar sem ampliar acesso. Testar as sequências reais por stdio e broker, sem acrescentar changes ao request nem aceitar `{decision}` onde o protocolo pede permissions.
5. **B-6 — 05.4:** cancelar/coordenar startup com close/abandon; impedir spawn/thread/turn depois da finalização e aguardar a limpeza de filhos já criados. Testar probe/start/thread/turn retidos com sincronização explícita.
6. **I-1 — 03.4/05.3:** consumir motivo de recusa exatamente uma vez na próxima entrada; não enviá-lo como campo desconhecido no resultado RPC. Provar turn/start após recusa e ausência de repetição.
7. **I-2 — 05.1:** preservar UTF-8 entre chunks; testar caractere multibyte fragmentado, frames unidos e EOF.
8. **I-3 — 05.4:** enviar thread/unsubscribe antes de fechar cliente/grupo, garantindo cleanup em falhas; verificar ordem pelo servidor falso.
9. **I-4 — 02.5/05.1–03:** manter os novos `.ts` até 100 linhas e funções até três parâmetros, extraindo fixtures/helpers e objetos de argumentos; não remover asserções para reduzir tamanho.
10. **I-5 — 02.2/05.6:** preencher agent_version também em novas sessões Claude pelo callback compartilhado; manter registros legados nulos e a interação Claude preservada.

Durante a correção execute os arquivos afetados: testes unitários de tradutores/opções, `codex-catalog-transport`, `codex-rpc-client`, `codex-runtime-start`, `codex-runtime-requests`, `codex-runtime-controls`, `codex-runtime-recovery`, `codex-service-recovery`, `codex-request-contract`, `codex-secret-answer`, `QuestionRequestCard`, seu teste concorrente e o modelo de respostas. Use a configuração de integração para `packages/api/test/`. Acrescente as regressões indicadas onde pertencerem; não dependa apenas dos casos atuais.

Ao fechar a correção, executar uma vez e registrar a saída de:

```bash
rtk pnpm --dir packages/api test
rtk pnpm --dir packages/api test:integration
rtk pnpm --dir apps/web test
rtk pnpm --dir packages/api run typecheck
rtk pnpm --dir apps/web run typecheck
rtk pnpm lint
rtk python3 -I .agents/skills/spec-to-tasks/scripts/tasks_status.py docs/specs/sessao-do-codex
```

Investigue as falhas compartilhadas se voltarem; não aumente timeout, reduza workers ou conte skips como sucesso. Não defina TEST_DATABASE_URL localmente. Preserve código não relacionado, a exceção pg_notify aprovada, o perfil pessoal, o isolamento dos outros agentes e o escopo parcial. A revisão seguinte deve conferir as correções e todos os caminhos tocados por elas.
