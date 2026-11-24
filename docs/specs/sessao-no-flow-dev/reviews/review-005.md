# Revisão de conformidade 005: A sessão do Claude dentro do Flow Dev

> **Data:** 2026-11-23 · **Escopo:** feature inteira, tarefas 01–07, incluindo as correções não commitadas das reviews 003–004 · **Intervalo:** `1145d68..e88ea67` + árvore de trabalho atual.
> **Spec:** `spec.md`, `_tasks.md`, `task_01.md` a `task_07.md` e `v20-spike.md`.
> **Regras lidas:** AGENTS.md/CLAUDE.md da raiz e da web, RTK.md, code-standards, e2e-testing, skills layered-backend, trpc-nextjs, nextjs-folder-structure e software-testing e guia de revisão.
> **Prontidão:** verificador confirma 7 tarefas completed e 26/26 mini-tarefas. A dispensa expressa de E2E/UI em `task_07.md:121-124` foi preservada.
> Esta rodada altera somente este relatório e acrescenta uma linha em “Revisão final” do manifesto. As correções e os relatórios anteriores já estavam na árvore de trabalho ao começar.

## Veredito: REPROVADO

A coordenação persistida da preparação corrige o B-1 da review-003. O encerramento sem handle e a pergunta posterior ao fim da vez passam nos novos testes, mas ainda falham em combinações concorrentes não cobertas. Reproduzi três falhas de backend e uma colisão entre cartões de perguntas. A medição nova cobre parte da NFR-10, sem comprovar o trajeto completo da saída nem as respostas aos pedidos.

| Bloqueante | Importante | Menor | Spec a discutir |
|---|---|---|---|
| 4 | 1 | 0 | 2 |

A aprovação da review-004 não se sustenta nestes cenários. As suítes automatizadas e os gates finais passam; isso não invalida os contraexemplos abaixo.

## Verificação executada

| Comando/experimento | Resultado nesta rodada |
|---|---|
| `rtk python3 -I .agents/skills/spec-to-tasks/scripts/tasks_status.py docs/specs/sessao-no-flow-dev` | exit 0 · 7 completed · 26/26 · validação OK |
| `rtk python3 -I .agents/skills/spec-conformance/scripts/scan_diff.py --repo . --worktree --max-lines 100` | exit 0 · 37 arquivos no início; sem dependências novas nas correções; dicas de assertions_removed conferidas como troca de assinatura dos helpers |
| Mesmo scanner com `--base 1145d68 --head HEAD --max-lines 100` | exit 0 · 227 arquivos no intervalo; fixme dispensados, chave fictícia, runtime de teste condicionado a NODE_ENV e barrel schema.ts preexistente conferidos |
| Medição AST com TypeScript dos 27 arquivos TS/TSX das correções | nenhuma função examinada, fora agrupadores describe, excede 30 linhas ou três parâmetros |
| `rtk pnpm --dir packages/api test` | exit 0 · 101 arquivos · 662 testes passam |
| `rtk pnpm --dir packages/api test:integration`, sem definir TEST_DATABASE_URL | exit 0 · 114 arquivos passam, 2 ignorados · 624 testes passam, 5 ignorados · 79,95 s |
| `rtk pnpm --dir apps/web test`, primeira execução | exit 1 · 83 arquivos passam, 1 falha · 417 testes passam, 1 falha: UT-039 em ProjectCreation, esperando o botão “Selecionar acme/private” |
| `rtk pnpm --dir apps/web exec vitest run src/features/projects/project-creation/ProjectCreation.test.tsx` | exit 0 · 5 testes passam |
| `rtk pnpm --dir apps/web test`, confirmação completa | exit 0 · 84 arquivos · 418 testes passam · 39,51 s |
| `rtk proxy pnpm typecheck` | exit 0 · API e web; tipos de rotas gerados |
| `rtk pnpm lint` | exit 0 |
| `rtk pnpm build` | exit 0 · 17 páginas geradas; dois avisos de tracing em agentInstructions.ts:23, arquivo sem mudança na feature |
| `rtk pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts --silent=false test/session-latency.test.ts` | exit 0 · entrada p95/máximo 1.162 ms; consulta da timeline p95 103 ms e máximo 104 ms; “screenBoundP95Ms” calculado 1.603 ms. Interpretação limitada em I-1 |
| Experimentos em linha por `rtk pnpm exec tsx -e …`, no pacote API | exit 0 · PostgreSQL descartável, DAOs/serviços reais e runtime roteirizado; resultados B-1 a B-3 abaixo |
| Experimentos em linha por TSX no pacote web | exit 0 · componentes reais em React/createRoot + jsdom; seleção e envio incorretos reproduzidos em B-4 |
| `rtk cmp` das duas rules contra as cópias em .claude/rules; `rtk git diff --check` | exit 0 |

A falha de ProjectCreation não se repetiu isoladamente nem na confirmação completa. O arquivo está fora do diff desta feature. A primeira execução concorreu com outros gates, mas não atribuo causalidade à carga sem outra investigação. Não alterei testes, timeouts ou workers para fazê-la passar e não a classifico como defeito confirmado da sessão.

Os experimentos SQL criaram tabelas isoladas a partir das definições das migrations 0046–0049, sem as FKs para o restante do produto; os DAOs executaram SQL real. A suíte de integração completa, separadamente, aplicou as migrations reais com seus relacionamentos. O PostgreSQL descartável foi encerrado e removido.

Não executei Playwright, Claude real, nova espera de 30 minutos nem smoke manual. Os cinco testes reais de Claude ficaram ignorados por serem opt-in. Os resultados históricos de V-20/V-31 não são apresentados como execução nova. Os experimentos com React/jsdom são verificação de componentes, sem reabrir a passada manual/E2E dispensada.

## Conformidade com a spec

| Item | Situação | Evidência conferida |
|---|---|---|
| REQ-051, US-06.1, fluxo §16; prompt/anexos da §9 | ✅ | terminalOpenSteps.ts:23-26 publica prepared_at após contexto, anexos e prompt; claimOpening exige a marca. session-preparation-race.test.ts usa barreira e Postgres, verifica ausência de início antecipado, um início depois e conteúdo do anexo |
| REQ-052, REQ-053, US-06.4 e US-08.1 | ✅ | terminal-open-service.test.ts, TerminalLaunchMode.test.tsx e agentSdkQueryOptions.test.ts: três modos, padrão bypass, heartbeat e bloqueio no servidor/UI |
| REQ-054, REQ-081, REQ-082 | ✅ | session-supervisor-start.test.ts mantém falha de prompt realmente perdido e falha do runtime; session-runtime-read.test.ts e ExecutionStageSessions.test.tsx cobrem não confirmada/legado/ausência de sem sinal |
| REQ-055–056, REQ-061–062, NFR-13 | ✅ nos casos cobertos | timeline merge/queries e testes de timeline/acesso, recorder e expurgo: ordem, histórico, corte, filtro do assistente principal e exclusão |
| REQ-057, NFR-10 | 🟡 | ensaio de entrada passa; saída e respostas a pedidos não têm a medição alegada. I-1 |
| REQ-058–060, B-23, B-25 | ✅ no fluxo principal | session-send.test.ts, session-delivery.test.ts, session-resume.test.ts e SessionComposer.test.tsx: limites, conteúdo exato, requestKey e retomada da fila |
| REQ-063–066, US-07.1–3, §7.9 | 🔀 | um pedido isolado é coberto por questionAnswerValidation e RTL; cartões concorrentes de mesmo texto colidem. B-4 |
| REQ-067–068, REQ-074–075 | 🔀 | resposta repetida e cancelamento normal passam; pedido em gravação sobrevive ao end e a API aceita respondê-lo na sessão ended. B-1 |
| REQ-069–072, US-08.2–4, §7.10–11 | ✅ no fluxo principal | summarizer, answerMapper, opções SDK, session-requests e PermissionRequestCard; sugestões persistentes vêm do pedido guardado |
| REQ-073, US-09.1–2, B-24 e B-30 | 🔀 | end_turn → ask foi corrigido; ask pendente → Stop deixa waiting e Interromper não cancela. B-2. Interromper sem vez/pedido continua coberto por V-25b |
| REQ-074, US-09.3; REQ-076–079 e US-10 | 🔀 | end após restart sem mensagem captura e termina; com mensagem na fila e end entre consulta e claim, o runtime retoma mesmo assim. B-3 |
| REQ-080, B-22, §7.4 | ✅ para identidade/operadora | SessionControlAuthorization e testes de autorização garantem quem abriu e operadora atual; B-1 é falha de ciclo de vida, não de identidade |
| NFR-11 e NFR-12, B-27 e B-31 | ✅ nos cenários cobertos | recorder tolera falha de gravação; shutdown abandona; recuperação de órfãs; identidade hostname/usuário, host nos claims, Claude do PATH e argumentos sem shell |
| NFR-14 | 🔀 | aria-live, legend, teclado e confirmação existem e passam em RTL; colisão de grupos de rádio quebra a independência entre perguntas. B-4 |
| §7.5, §14, DEC-21, migrations e rollback | ✅ | limites, índices/checks, tabelas próprias, migrations 0048/0049, backfill e reaplicação exercidos pela integração |
| §9, V-32a–f e agentes locais | ✅ nos testes de regressão | prompt/anexos, captura, endpoint legado, trava, confirmação de segunda sessão e configuração isolada passam |
| DEC-15–20, P-09–P-11 e V-20 | ✅ no código/registro histórico | SDK 0.3.330 fixado, opções SDK, fontes de settings, hooks sintéticos e worker sem watch conferidos; compatibilidade real não reexecutada |
| V-30a/b, V-32g e V-31 pela UI | ⚪ dispensados | aceite explícito em task_07.md:121-124; não tratados como testes aprovados |
| Fora de escopo | ✅ | sem TTY, texto palavra a palavra, notificação fora da tarefa, troca de modo durante a sessão ou novo runtime remoto |

## Regras do projeto

| Regra e origem | Situação |
|---|---|
| Arquivos TS/TSX até 100 linhas; funções até 30; até três parâmetros (code-standards.md:39,82,154) | Correções conformes: scanner + AST dos 27 arquivos. Composer tem 27 linhas; os três helpers de M-1 recebem objeto. schema.ts já excedia o limite antes da feature |
| Camadas e contratos (layered-backend) | Controllers/serviços não ganharam SQL; persistência fica nos DAOs de infra; contratos de runtime/status ficam em application |
| Fronteira tRPC e identidade (trpc-nextjs) | Procedures protegidas, identidade do contexto e contratos inferidos; wrapper de erros segue a decisão registrada na task_03 |
| Localização/client boundary (nextjs-folder-structure) | Componentes e hooks permanecem na feature assigned-work, sem acesso ao runtime privilegiado no cliente |
| Testes com fronteira pertinente (software-testing) | Postgres real e RTL presentes; faltam interleavings discriminantes B-1–B-3 e isolamento de cartões B-4; I-1 mede um trecho menor que o requisito |
| Evidência antes de afirmar sucesso (software-testing) | Review-004 sobrestima o fechamento de B-2/B-3 e NFR-10; a discrepância está explicitada abaixo |
| Timeouts/workers, rules espelhadas, dependências | Nenhuma configuração alterada nesta revisão; cmp passa; nenhuma dependência nova nas correções |
| Produto/design em português e tokens existentes | Sem nova divergência visual das correções; os documentos canônicos ainda precisam do alinhamento descrito ao final |

## Achados por tarefa

### B-1 (Bloqueante) · task_05/05.1–05.2 e task_03/03.3 — pedido em gravação sobrevive ao encerramento e aceita resposta depois dele

- **Onde:** packages/api/src/application/services/terminal/sessionRequestBroker.ts:25-26 aguarda open e só depois adiciona a promessa ao registry; nas linhas 36-37, a inserção e a transição não são coordenadas com o encerramento. requestCancellation.ts:11-12 cancela somente as linhas e entradas visíveis naquele instante. sessionControls.ts:51 cancela antes de fechar; não aguarda/veda as aberturas de pedidos em andamento.
- **Contra:** REQ-068, REQ-074 e REQ-075; US-09.2–3.
- **Reprodução executada:** runtime roteirizado real entra em AskUserQuestion; suspendi insertRequest com uma barreira antes da query; persisti end e executei os controles reais, fechando o handle; após ended, liberei a inserção. Resultado: `{"status":"ended","pending":1,"waitingPromises":1}`. Sem sleep de sincronização.
- **Efeito adicional confirmado:** SessionRequestController.requireOpen em sessionRequestController.ts:37 usa requireOwn, sem checar estado ativo. A mesma pessoa/operadora respondeu ao pedido tardio e recebeu `{"status":"answered"}` mesmo com a sessão ended. A identidade foi conferida pelo SessionControlAuthorization real; só a autorização externa de operadora foi substituída no experimento.
- **Por que os testes passam:** V-25 e session-controls-recovery aguardam o broker terminar antes de solicitar o controle; não há pedido entrando entre cancelPending e a finalização.
- **Consequência:** histórico final com pedido pendente/respondível e promessa sem resolução. A conversa deixa de ser somente leitura pelo backend.
- **Correção mínima:** coordenar, por sessão, abertura/registro de pedido e encerramento/cancelamento; fechar a janela tanto antes do INSERT quanto antes de adicionar a promessa. Um pedido tardio deve ser negado/cancelado, e uma resposta não pode modificar uma sessão final. Não basta executar cancelPending mais uma vez sem coordenação.
- **Verificação:** barreiras antes da inserção e entre persistência/registry; end e interrupt concorrentes; nenhum pending/registry residual, promessa resolve deny e resposta tardia é recusada sem escrita.

### B-2 (Bloqueante) · task_02/02.3 e task_05/05.1–05.2 — Stop posterior a uma pergunta pendente retira a possibilidade de interrompê-la

- **Onde:** packages/api/src/application/services/terminal/terminalSessionStateMachine.ts:9,17 aplica waiting a asking sem consultar pedidos; terminalEventIngestion.ts:28,37 persiste a mudança. sessionControls.ts:40 só interrompe running/asking; apps/web/src/features/issues/assigned-work/components/SessionControls.tsx:25 só oferece o botão nesses estados.
- **Contra:** US-07.1 (“Precisa de você” quando a pergunta aparece), US-09.2 (pergunta pendente é cancelada ao interromper), REQ-073 e B-24.
- **Reprodução executada:** broker e DAOs reais gravaram AskUserQuestion; ingeri Stop pelo TerminalEventController real enquanto o pedido continuava aberto; pedi interrupt e executei os controles. Resultado: `{"status":"waiting","pending":1,"interrupts":0,"interrupt_requested_at":null}`. A flag foi apagada, mas o pedido continuou aberto.
- **Por que os testes passam:** session-controls-recovery.test.ts:43 cobre somente end_turn → ask; não pergunta pendente → fim da vez, combinação relevante para callbacks concorrentes/perguntas de subagente.
- **Consequência:** a pessoa vê pergunta pendente sem Interromper; mesmo chamando a API, o pedido não é cancelado.
- **Correção mínima:** conciliar o fim da vez com os pedidos pendentes e manter a possibilidade de cancelar a pergunta. A tabela §7.2 permite asking → waiting no fim da vez; isso não permite descartar o contrato US-09.2. Não tratar “waiting com pedido” como o caso B-30 de nenhuma atividade.
- **Verificação:** as duas ordens de Stop/AskUserQuestion, inclusive pedido de subagente; pedido visível e controle funcional até resposta/cancelamento; B-30 continua sem nota/erro quando não há atividade nem pedido.

### B-3 (Bloqueante) · task_05/05.2–05.3 — end persistido antes do claim ainda permite retomar a sessão

- **Onde:** packages/api/src/infra/database/dao/terminal/drizzleSessionStatusDao.ts:44-51 não considera end_requested_at ao listar/assumir retomada. sessionResume.ts:42-47 chama resume após esse claim. Mover os controles antes do resume em sessionWorkerComposition.ts:29-30 cobre apenas pedidos já visíveis na consulta anterior.
- **Contra:** REQ-074 e o fechamento de B-2 exigido no prompt da review-003: impedir que mensagem na fila dispare retomada antes do encerramento solicitado.
- **Reprodução executada:** sessão interrupted, mesma máquina, claude_session_id válido e mensagem persistida; executei a consulta de controles sem end; gravei requestEnd e só então executei SessionResumeStep real com runtime roteirizado. Resultado: `{"status":"running","end_pending":true,"resumes":1}`.
- **Por que os testes passam:** o novo teste em session-controls-recovery.test.ts:17 não tem mensagem na fila e grava end antes do tick inteiro. Não exercita a janela entre passos.
- **Consequência:** o Claude é reiniciado e recebe a mensagem depois de um pedido de encerramento já confirmado no banco. Um tick futuro pode fechá-lo, mas o runtime e suas ferramentas já puderam começar.
- **Correção mínima:** fazer o claim de retomada respeitar atomicamente o encerramento pendente, além de manter a ordem dos passos; preservar o end para o próximo processamento e os limites de host. Uma checagem em memória antes do UPDATE não fecha a corrida.
- **Verificação:** barreira depois da consulta de controles e antes do claim; persistir end e liberar; nenhuma chamada resume, captura ocorre, sessão termina e flags são limpas. Conservar os casos normais V-26 de retomada.

### B-4 (Bloqueante) · task_06/06.3 — cartões distintos com a mesma pergunta compartilham o grupo de rádios

- **Onde:** apps/web/src/features/issues/assigned-work/components/QuestionOption.tsx:10 e QuestionField.tsx:19 usam `name={question.question}`; QuestionField.tsx:24-25 também deriva o id do campo Outra só do texto. QuestionRequestCard.tsx:26 não fornece um namespace de pedido/instância ao campo.
- **Contra:** REQ-063, REQ-065, REQ-066 e NFR-14: cada pergunta deve ser um grupo independente e o envio deve refletir a escolha exibida. B-24 inclui perguntas de subagentes, sem proibir textos repetidos em pedidos distintos.
- **Reprodução executada:** dois QuestionRequestCard reais, q1/q2, renderizados juntos em React/createRoot + jsdom, cada um com “Qual ambiente?”; selecionei Teste no primeiro e Produção no segundo. O segundo ficou sem nenhum rádio marcado, mas Enviar respostas continuou habilitado e enviou Produção:
  `{"visibleChecked":[false,false,false],"disabled":false,"calls":[["q2",{"Qual ambiente?":{"labels":["Produção"]}}]]}`.
- **Por que os testes passam:** os RTL atuais montam um único pedido; múltiplas perguntas do mesmo teste têm textos diferentes.
- **Consequência:** seleção visível e resposta enviada divergem; o teclado também passa a compartilhar o grupo nativo entre cartões. Os ids repetidos de Outra podem focar o campo de outro cartão.
- **Correção mínima:** isolar name e ids por instância/pedido e pergunta, mantendo o texto da pergunta apenas como chave do contrato de resposta ao Claude.
- **Verificação:** dois cartões ativos com texto idêntico, escolhas e Outra independentes, rótulos focando o campo correto; selecionar/enviar no segundo não muda o primeiro, e cada payload corresponde ao que está marcado. Cobrir teclado em RTL, sem exigir Playwright.

### I-1 (Importante) · task_05/05.2 e task_07/07.2 — o ensaio não comprova todas as latências declaradas

- **Onde:** packages/api/test/session-latency.test.ts:37-44 cronometra envio de mensagens. Nas linhas 47-52, o relógio começa somente ao consultar a timeline; a linha 68 soma 1.500 ms a essa duração e a chama screenBoundP95Ms.
- **Contra:** REQ-057 e NFR-10: a saída começa quando o Claude conclui texto/abre pedido, e a meta de entrada inclui respostas a pedidos.
- **Evidência:** o roteiro da linha 22 não contém ask/permission e nenhuma resposta é enviada. A fila do recorder, a persistência após onAssistantText/onPermission e a primeira observação por polling não são cronometradas. A consulta é feita após a carga/captura terminar. A execução nova passou com 1.162 ms p95 de entrada e 103 ms p95 da consulta; isso não mede o trecho ausente.
- **Contraexemplo que escapa:** um texto pode aguardar mais de 3 s numa fila antes de ser gravado; se a consulta posterior for rápida, o “limite de tela” continua próximo de 1,6 s. Não observei nem afirmo que essa demora ocorreu no produto; demonstro que o teste não a detecta.
- **Precisão do relatório:** latency-report.md:11 diz que p95 de 20 observações é o máximo. A função usa índice 18, o 19º valor ordenado; o máximo é o 20º. Os valores arredondados podem coincidir nesta execução, mas isso não altera a definição.
- **Correção mínima:** medir desde o callback do runtime até a primeira observação do texto/pedido no polling; medir também resposta persistida → resolução do canUseTool. Incluir filas/captura e concorrência, registrar os trechos não medidos e não apresentar apenas tempo de query + intervalo como prova do percurso completo.
- **Verificação:** ensaio reproduzível com timestamps das fases, amostra, p95 e máximo por trajetória. Corrigir o escalonamento somente se a medição mostrar necessidade. A dispensa E2E/UI continua válida; não é necessário reabrir os smokes manuais para medir essas fases locais.

## Alegações das tarefas e reviews anteriores

| Alegação | Evidência desta rodada |
|---|---|
| Todas as tarefas completed, 26/26 | Confirmado estruturalmente; não prova os interleavings não exercitados |
| B-1 da review-003 corrigido | Confirmado: prepared_at, barreira com PostgreSQL, conteúdo do anexo e falha real de prompt perdido passam |
| Encerrar após restart sem handle, captura e isolamento por host | Confirmado no caso sem mensagem; claim com mensagem/end concorrentes ainda falha em B-3 |
| Pergunta tardia e Interromper funcionais | Confirmado para Stop → ask; ordem com pedido pendente e Stop ainda falha em B-2 |
| Review-004: NFR-10 atendida | Parcial: entrada de mensagem medida, saída e resposta de pedido ainda sem a prova alegada. I-1 |
| Review-004: nenhuma correção de código pendente | Contrariado por B-1–B-4 reproduzidos nesta rodada |
| M-1 da review-003 corrigido | Confirmado por AST e testes; nenhuma asserção foi enfraquecida na troca de assinatura |
| “07.3 encerrada por decisão do usuário” | Preservado como aceite de processo, sem afirmar execução dos E2E ou smokes pela UI |

Os comandos automatizados “Pronto quando” abrangidos pelas suítes passam. Os comandos de spike/Claude real e smoke do worker têm somente evidência histórica, declarada como tal. Nenhum checkbox/status foi alterado nesta revisão para obter um veredito.

## Atualizações documentais a discutir

1. **Contrato da timeline, §15:** consolidar as exceções já registradas no Histórico da spec: entradas alteradas reenviadas por id e NOT_FOUND para quem não lê o projeto. A implementação e os testes atuais seguem essas decisões registradas; não mudar autorização para satisfazer o resumo antigo.
2. **PRODUCT.md e DESIGN.md:** o primeiro ainda afirma que a execução foi removida; o segundo restringe caixas da thread a draft/composer apesar dos cartões da spec aprovada. Alinhar a documentação canônica; isso não substitui a correção dos defeitos.

## Prompt de correção

> Corrija a feature sessao-no-flow-dev preservando a dispensa E2E/UI de task_07.md:
>
> 1. **B-1 · task_05/05.1–05.2 + task_03/03.3:** coordenar abertura de pedidos em sessionRequestBroker.ts, cancelamento/finalização em requestCancellation.ts/sessionControls.ts e aceitação de respostas em sessionRequestController.ts/DAOs. Proibir pedido pendente ou promessa sem resolução depois do end; respostas em sessão final devem ser recusadas. Regressões com barreira antes do INSERT e entre persistência/registry, end/interrupt concorrentes e PostgreSQL real.
> 2. **B-2 · task_02/02.3 + task_05/05.2:** conciliar Stop e perguntas pendentes em terminalSessionStateMachine.ts/terminalEventIngestion.ts e controles backend/UI. As duas ordens Stop/ask devem manter cancelamento funcional; preservar B-30 quando não há vez nem pedido.
> 3. **B-3 · task_05/05.3:** claimResume deve verificar atomicamente ausência de end pendente. Testar end persistido após a consulta de controles e antes do claim com mensagem na fila; não chamar runtime.resume, capturar e encerrar sem perder o end.
> 4. **B-4 · task_06/06.3:** dar namespace de instância/pedido aos names/ids em QuestionField.tsx e QuestionOption.tsx. RTL com dois pedidos de texto idêntico, escolhas e Outra independentes, payloads iguais às escolhas visíveis e teclado.
> 5. **I-1 · task_05/05.2 + task_07/07.2:** completar session-latency.test.ts e latency-report.md com emissão → persistência → primeiro polling e resposta → runtime. Corrigir a explicação de p95. Não alegar percurso de tela completo onde só a query foi medida; não aumentar timeout ou reduzir workers.
>
> Restrições: skills obrigatórias, TS até 100 linhas, funções até 30 linhas/três parâmetros, sem dependências novas, sleeps de sincronização ou alterações fora do escopo. Testes focados durante a implementação e typecheck agrupado. Ao final, uma execução de API test, API test:integration sem TEST_DATABASE_URL, web test, pnpm typecheck, pnpm lint e pnpm build; repetir somente o que falhar e confirmar a suíte pertinente. Não reabrir os E2E/smokes dispensados. Registrar a evidência e solicitar nova revisão dos caminhos afetados; não aprovar apenas porque as suítes atuais estão verdes.

