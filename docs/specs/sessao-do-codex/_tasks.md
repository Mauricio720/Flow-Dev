---
schema_version: "compozy.tasks/v2"
workflow: sessao-do-codex
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
  edges:
    - from: task_01
      to: task_02
    - from: task_02
      to: task_03
    - from: task_02
      to: task_04
    - from: task_03
      to: task_05
    - from: task_04
      to: task_05
    - from: task_05
      to: task_06
    - from: task_06
      to: task_07
---

# Tarefas: A sessão do Codex dentro do Flow Dev

> **Spec:** [spec.md](spec.md) · **Data:** 2026-11-23 · **Total:** 7 tarefas, 32 mini-tarefas, 76 casos concretos · **Divisão aprovada pelo usuário:** “pode criar”, após apresentação do plano e do bloqueio de respostas secretas.

## Objetivo
Conduzir sessões do Codex pela tarefa do Flow Dev, em rota, geração e plano, com conversa, skills, perguntas, aprovações, captura, controles e retomada nos caminhos existentes; permitir escolha de agente/modelo/esforço também na rota.

## Estado
Manter esta tabela sincronizada com o frontmatter e as mini-tarefas dos arquivos individuais.

| Tarefa | Tipo | Complexidade | Depende de | Mini-tarefas | Status |
|---|---|---|---|---|---|
| [01 — Spike e contratos confirmados](task_01.md) | test | high | — | 3/3 | completed |
| [02 — Dados e contratos compartilhados](task_02.md) | backend | high | 01 | 5/5 | completed |
| [03 — Tradutores e prompts](task_03.md) | backend | high | 02 | 5/5 | completed |
| [04 — Catálogo publicado](task_04.md) | backend | high | 02 | 4/4 | completed |
| [05 — Runtime e serviço](task_05.md) | backend | critical | 03, 04 | 6/6 | completed |
| [06 — Interface de escolha e pedidos](task_06.md) | frontend | high | 05 | 5/5 | completed |
| [07 — Validação e entrega](task_07.md) | test | high | 06 | 0/4 | in_progress |

**Ondas:**
1. 01 — prova real do protocolo e fechamento dos contratos.
2. 02 — migration e extensões compartilhadas.
3. 03 ‖ 04 — tradutores/prompts versus catálogo/validação.
4. 05 — runtime, junção dos contratos e habilitação no serviço.
5. 06 — interface.
6. 07 — jornada, regressão, latência, smoke e entrega.

**Podem rodar em paralelo:** 03 e 04, após 02. A 03 é dona de `application/services/terminal/codex/*`, prompts e `codexThreadOptions`; a 04 de catálogo, host, leitores/validação do plano e disponibilidade. Os builders de prompt da 03 só são conectados aos controllers/resolver na 05.6. Não alterar arquivo compartilhado em paralelo sem combinar ownership.

A primeira fatia de serviço utilizável chega na 05; a tela anterior continua funcional até a 06. A disponibilidade de produção do Codex só é habilitada com runtime e publisher conectados na 05.6.

## Como executar (controle)
Consultar o progresso e a próxima mini-tarefa:

```bash
rtk python3 -I .agents/skills/spec-to-tasks/scripts/tasks_status.py docs/specs/sessao-do-codex
```

1. Escolha tarefa pending cujos predecessores estejam completed. O grafo estrutural não verifica bloqueios de ambiente/decisão; leia “Premissas e bloqueios” e a tarefa antes de começar.
2. Em sessão nova, peça: “implemente a mini-tarefa 01.1 de docs/specs/sessao-do-codex/task_01.md”. Leia a spec, o arquivo e as instruções do repo. Mude status aqui e no arquivo para in_progress.
3. Execute uma mini-tarefa por vez, com testes junto da implementação. Marque a caixa somente após conferir o Pronto quando, e anote comandos, saída resumida, versão e limitações no Registro de execução. Não marque testes manuais por inferência de testes automatizados.
4. Feche uma tarefa como completed apenas com todas as mini-tarefas e critérios comprovados. Execute as suites uma vez no fim da tarefa, conforme AGENTS.md; o typecheck é agrupado, não por edição.
5. Depois das sete completed, rode **spec-conformance uma vez na feature inteira**, incluindo regras, cobertura, comandos e logs. Salve relatório em `reviews/` e registre o veredito em “Revisão final”.
6. Se REPROVADO, aplique o prompt de correção e faça nova revisão final. A feature termina em APROVADO ou APROVADO COM RESSALVAS aceito pelo usuário. Não criar revisões individuais por tarefa.

## Revisão final
<!-- Preenchido por spec-conformance após todas as tarefas completed. -->
- 2026-11-24 · review-001 · PARCIAL (tarefas 01–06, exclusão da 07 autorizada pelo usuário) · REPROVADO (6 bloqueantes, 5 importantes) · reviews/review-001.md
- 2026-11-24 · review-002 · PARCIAL (tarefas 01–06, após correções da review-001; exclusão da 07 autorizada pelo usuário) · REPROVADO (1 bloqueante, 4 importantes, 3 menores) · reviews/review-002.md
- 2026-11-24 · review-003 · PARCIAL (tarefas 01–06, após correções da review-002; exclusão da 07 autorizada pelo usuário) · APROVADO COM RESSALVAS (2 menores, 3 spec a discutir) · reviews/review-003.md

## Restrições globais
- Leia `AGENTS.md`, `/home/mauricio/.codex/RTK.md` e `.agents/rules/code-standards.md`. Shell com prefixo rtk; sem comentários desnecessários, arquivos .ts até 100 linhas, funções até 30 linhas, até 3 parâmetros, sem linhas em branco dentro de funções e sem números/strings mágicos. Preserve o trabalho existente.
- Backend: `.agents/skills/layered-backend/SKILL.md`; fronteira tRPC: `.agents/skills/trpc-nextjs/SKILL.md`; frontend: `.agents/skills/nextjs-folder-structure/SKILL.md`. Testes: `.agents/skills/software-testing/SKILL.md` e `references/escolha-e-desenho.md`.
- Web: leia `apps/web/AGENTS.md`, `PRODUCT.md`, `DESIGN.md` e guia Next pertinente em `apps/web/node_modules/next/dist/docs/` antes de implementar. Aplicar `vercel-react-best-practices` a mudanças React. Manter a feature em `src/features/issues/assigned-work/`, tipos inferidos e textos em português.
- E2E: `.agents/rules/e2e-testing.md`, Playwright, locators acessíveis, dados independentes e ambiente descartável. Não usar produção nem aceitar skipped como verificação feita.
- Contratos e regras puras em application; implementações de processo/ORM em infra. Tipos do protocolo gerados em infra não são importados por application. Reutilizar broker, recorder, estados, tabelas e timeline.
- Fake `FLOW_DEV_CODEX_FAKE_SCRIPT` somente com `NODE_ENV=test`; roteiro isolado por clone/sessão. O fake deve ser processo real por stdio e atravessar o cliente/runtime. Não usar `ScriptedSessionRuntime` para afirmar contrato do app-server.
- Uma sessão → um processo codex próprio do PATH, argumentos fixos e sem shell/daemon/porta. Encerrar apenas grupos criados pelo serviço/roteiro, sem matar a sessão pessoal no terminal.
- Não instalar Codex, autenticar pelo Flow Dev nem escrever no perfil pessoal para preparar testes. Login/config/regras/skills pessoais são preservados nas sessões; teste persistente de regra usa perfil isolado, sem imprimir credenciais.
- Não mudar agentes de Issue Author/Planejamento nem tabelas legadas de execução; nenhuma escrita direta no clone/GitHub fora das exceções existentes. Sem turn/steer, modo plano ou recursos Codex adicionais fora da spec.
- Migration prevista `0051_codex_sessions.sql` com rollback; conferir número livre e registrar em journal e databaseMigrations. A 0050 pertence a session_plans. Não renomear claude_session_id no banco.
- Durante mini-tarefas: apenas testes afetados. Unitários: `rtk pnpm --dir packages/api exec vitest run src/<arquivo>.test.ts`; integração: `rtk pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/<arquivo>.test.ts`; web: `rtk pnpm --dir apps/web exec vitest run src/<arquivo>.test.tsx`.
- Agrupar typecheck do pacote; contratos compartilhados exigem também typecheck web. Suites API test/test:integration e web test uma vez no fechamento de cada tarefa que altera o pacote. Repetir somente falhas e confirmar então a suite completa.
- Integração sem TEST_DATABASE_URL local; Postgres descartável exige pg_config/initdb/pg_ctl. Não aumentar timeout/reduzir workers para contornar lentidão.
- Gate final: API test e test:integration, web test, E2E codex-session/session-conversation/task-plan, `rtk pnpm typecheck`, `rtk pnpm lint`, `rtk pnpm build` e smoke real. API não tem script lint próprio. Não repetir gates verdes sem mudança/falha que justifique.
- Cópias de rules em .claude devem continuar iguais se houver alteração delas; este plano não pede alterar rules nem skills. Sem commit, push ou PR.

## Premissas e bloqueios
- **Transporte de respostas secretas — resolvido na 01.3:** o usuário aprovou `pg_notify` efêmero, sem persistir plaintext. A DEC-17 foi atualizada para essa exceção e a tarefa 02.5 nomeia a porta, implementação Postgres e prova em dois processos. O worker valida pedido pendente, persiste apenas `(resposta oculta)` e entrega a resposta em memória; sem listener/ack, a resposta falha sem marcador nem retry.
- **P-17 a P-20:** fatos do V-45, não pendências de produto. Perguntas sem ferramenta seguem texto; resume impossível segue REQ-078. Se raiz de skills ou modos não forem realizáveis, registrar o achado e resolver a mudança da spec antes de implementar alternativas. O protocolo final e a versão mínima vêm do relatório, não da memória do implementador.
- **Spec ainda com rótulo Rascunho:** o usuário aprovou gerar esta divisão; isso não é prova das premissas do protocolo nem autorização para decidir mudanças de produto silenciosamente.
- **Specs C/D:** porta neutra, registro Claude, escolha, plano e captura estão presentes no workspace. C registra review-008 com ressalvas; a task_09 da Spec D segue in_progress no estado lido. Preservar alterações não commitadas, reavaliar a base ao implementar e não marcar smokes/gates delas por conta desta feature.
- **Migration:** a Spec E cita 0050, mas 0050_session_plans já existe. Esta divisão prevê 0051, com ajuste da spec na 01.3 e confirmação novamente na 02.1.
- **Catálogo:** formato atual models/efforts é global por agente. A 02 publica metadados adicionais por modelo preservando compilação; 04 implementa publicação/validação e 06 usa labels/default/esforços. Não inventar modelo padrão fixo.
- **Conexão de produção:** 04 usa probe externo controlado/factory injetável sem depender do fake futuro. 05 conecta cliente real e publisher no worker e habilita o registro. Nenhuma dependência de 04 em 05 é escondida no grafo.
- **Ambiente real:** V-45 e V-52 dependem de CLI/login e UI disponíveis; E2E depende de E2E_DATABASE_URL/E2E_AUTH_SECRET descartáveis. Ausência mantém a respectiva tarefa pendente; falso servidor e skips não substituem essas provas.
- **Limites de tamanho:** mini-tarefas têm uma mudança revisável e prova própria; se o diff exigir subdivisão, atualizar caixas/manifesto antes de prosseguir e preservar a atribuição dos casos.
- **Sem implementação nesta geração:** todos os arquivos nascem pending, testes e logs vazios. Aprovação da divisão em 2026-11-23 não marca nenhum caso como executado.

## Matriz de cobertura
Cada requisito, cenário, decisão e caso tem um dono abaixo. Referências entre tarefas são consumo de contrato/evidência; não duplicam ownership. Cenários US-xx.n são os números de aceite da §5. IT-501 a IT-509 são complementos deste plano para riscos sem caso concreto próprio na matriz original.

| ID da spec ou complemento | Descrição curta | Tarefa · mini-tarefa |
|---|---|---|
| P-17 | Confirmar a ferramenta de perguntas fora do modo plano, nos três modos; se falhar, registrar a aplicação da alternativa textual. | 01 · 01.1 |
| P-18 | Confirmar retomada após morte do processo, inclusive durante comando, e a falha controlada da REQ-078 da Spec C. | 01 · 01.2 |
| P-19 | Confirmar raiz extra e entrada skill pelo caminho do contexto, preservando configuração pessoal. | 01 · 01.1 |
| P-20 | Confirmar o comportamento esperado de cada linha da §7.14 antes de fixar a tradução. | 01 · 01.2 |
| §11 — dependências | Verificar os contratos implementados das Specs C/D; distinguir status documental de evidência de execução. | 01 · 01.3 |
| US-17.2 | Cenário de aceite: Permitir nesta sessão não se aplica à próxima. | 01 · 01.2 |
| US-17.3 | Cenário de aceite: Permitir sempre aplica regra em outro projeto. | 01 · 01.2 |
| REQ-118 | O campo secreto DEVE entregar a resposta ao runtime, mas a resposta guardada DEVE ser somente (resposta oculta). A tela fica com a tarefa 06. | 02 · 02.5 |
| NFR-20 | Diffs de pedidos DEVEM ser persistidos com as mesmas permissões dos pedidos existentes; respostas secretas NÃO DEVEM ser guardadas. | 02 · 02.5 |
| NFR-21 | A sessão DEVE suportar a versão efetiva do agente persistida e registrada; a rejeição da versão inferior é exercitada na tarefa 04. | 02 · 02.2 |
| §14 | Aplicar migration com rollback para agent_version, codex_status e kinds file_change/extra_permission, preservando dados atuais e claude_session_id. | 02 · 02.1 |
| §15 — contratos | Estender as procedures existentes, sem criar procedures novas: choice em route, allow_session, offers/alwaysScope, secret e metadados por modelo. | 02 · 02.2 |
| §18 — validação | Decisões não oferecidas DEVEM falhar com decision_not_offered; respostas DEVEM respeitar opções, escolha única e Outra permitida. | 02 · 02.4 |
| REQ-114 | Mostrar e guardar somente mensagens completas principais, intermediárias e finais; NÃO guardar raciocínio, stdout de comandos, diffs aplicados sem pedido ou atividade de subagentes. | 03 · 03.1 |
| REQ-115 | Emitir os eventos da Spec B com os mesmos resumos e limites para início, prompt, cada caminho, comandos, skill, espera e encerramento. | 03 · 03.2 |
| REQ-116 | Ativar skill por entrada explícita ou leitura observável confirmada no spike; captura DEVE respeitar as Specs B/D. | 03 · 03.2 |
| REQ-117 | Perguntas DEVEM ser de escolha única, com Outra apenas quando permitida, e devolver rótulo/texto com o id original. | 03 · 03.3 |
| REQ-120 | Traduzir os três modos para as políticas confirmadas; manter a escolha durante a sessão. | 03 · 03.5 |
| REQ-123 | Allow_always DEVE devolver somente a regra original proposta pelo Codex; allow_session NÃO DEVE persistir configuração. | 03 · 03.4 |
| US-16 | Cobrir os três cenários: opções/descritivos, Outra e alternativa textual; a conexão da alternativa textual pertence ao runtime. | 03 · 03.3 |
| B-43 | GrantRoot DEVE mostrar o caminho fora do clone e não oferecer aprovação por sessão. | 03 · 03.4 |
| B-46 | Ignorar textos/eventos de subagentes, mantendo pedidos que cheguem à sessão principal encaminháveis. | 03 · 03.1 + 03.3 |
| B-47 | Perguntas continuam funcionando em Tudo liberado. | 03 · 03.3 |
| B-48 | Acionamento explícito DEVE usar a skill do Flow Dev pelo caminho, mesmo havendo homônima no clone. | 03 · 03.5 |
| DEC-30 | Traduzir para o vocabulário interno existente, sem reescrever broker/resumidor ou criar histórico paralelo. | 03 · 03.1 |
| DEC-31 | Usar raiz extra e entrada skill com nome/caminho, sem instalação no perfil pessoal. | 03 · 03.5 |
| §7.15 | Rotas, geração e mensagens iniciadas por $skill DEVEM acionar a skill; exibição usa [skill], mantendo o restante do texto. | 03 · 03.5 |
| §7.16 — conteúdo | Formatar comando/motivo/regra, caminhos/tipos/diffs e permissões extras com os limites da Spec C. | 03 · 03.4 |
| US-16.1 | Cenário de aceite: Pergunta com opções, descritivos e Outra. | 03 · 03.3 |
| US-16.2 | Cenário de aceite: Outra entrega texto exato ao Codex. | 03 · 03.3 |
| REQ-112 | Codex só DEVE estar disponível com binário no PATH, versão mínima e login; cada falta DEVE produzir o texto exato da §7.13. | 04 · 04.1 |
| B-44 | Modelo removido ou limite de uso DEVE impedir a abertura com motivo; sessão do plano continua editável. A falha do runtime por limite também é coberta na tarefa 05. | 04 · 04.4 |
| DEC-32 | Catálogo e login DEVEM ser sondados pelo serviço no início e a cada 10 min, com codex_status por host; preflight só lê. | 04 · 04.2 |
| §7.12 | Excluir modelos ocultos, exibir labels e guardar ids; esforços são por modelo, padrão vem do Codex e maior esforço é conhecido sem ordem alfabética. | 04 · 04.3 |
| §7.13 | Serviço fora do ar tem precedência e mensagem da REQ-053; demais motivos seguem a tabela. | 04 · 04.3 |
| §19 — codex-catalog | Registrar disponibilidade e número de modelos por renovação, sem conteúdo de credenciais. | 04 · 04.2 |
| US-15.3 | Cenário de aceite: Sem login: opção desabilitada com orientação. | 04 · 04.1 |
| REQ-111 | Iniciar no Codex local com clone, prompt, anexos, skills, escolha e modo confirmados, seguindo os estados da Spec C. | 05 · 05.2 |
| REQ-113 | Falha antes de thread/started DEVE virar launch_failed com motivo do Codex, inclusive modelo recusado, limite e processo. | 05 · 05.2 |
| REQ-119 | Sem ferramenta de perguntas, a sessão DEVE seguir por texto e ir a Aguardando você ao terminar a vez, sem erro de UI. | 05 · 05.3 |
| REQ-124 | Fila, idempotência, interromper/encerrar, recuperação e retomada DEVEM preservar mensagens e prazos das Specs C/D. | 05 · 05.4 |
| REQ-125 | Resume DEVE usar a mesma conversa, modelo, esforço e política; falha segue REQ-078 da Spec C. | 05 · 05.5 |
| NFR-19 | Executar codex do PATH sem shell, argumentos fixos, apenas stdio, sem daemon/porta; encerrar grupo de processo próprio. | 05 · 05.1 |
| US-15 | Cobrir abertura em até 10 s, próxima mensagem, indisponibilidade sem login e captura de spec, com integração das tarefas 03/04. | 05 · 05.6 |
| US-18 | Cobrir interrupção em até 5 s, cancelamento após reinício e retomada do mesmo histórico. | 05 · 05.5 |
| B-45 | Processos do terminal pessoal e de outra sessão DEVEM permanecer independentes; Flow Dev só controla seus filhos. | 05 · 05.4 |
| B-49 | Morte no meio da vez DEVE chegar como crashed e produzir Interrompida conforme REQ-076. | 05 · 05.5 |
| DEC-29 | Um app-server filho por sessão ativa, sem daemon compartilhado. | 05 · 05.1 |
| DEC-33 | Usar a flag confirmada e alternativa por texto; constante permite desligar sem mudar a UI. | 05 · 05.3 |
| §16 — integração | Traduzir callbacks usando a porta existente e integrar a captura da Spec B e das sessões do plano. | 05 · 05.6 |
| §19 — session | Registrar agente, versão, processo/código de saída, tipo de pedido, estado da flag e erros pelo método, sem conteúdo. | 05 · 05.6 |
| US-15.1 | Cenário de aceite: Abrir rota Codex com padrão local, prompt e resposta em até 10 s. | 05 · 05.2 |
| US-15.2 | Cenário de aceite: Enviar próxima mensagem depois da vez. | 05 · 05.3 |
| US-15.4 | Cenário de aceite: Spec criada aparece como artefato com skill e versão. | 05 · 05.6 |
| US-16.3 | Cenário de aceite: Perguntas por texto quando ferramenta não funciona. | 05 · 05.3 |
| US-18.1 | Cenário de aceite: Interromper comando em até 5 s com nota. | 05 · 05.4 |
| US-18.2 | Cenário de aceite: Reinício interrompe sessão e cancela pergunta. | 05 · 05.5 |
| US-18.3 | Cenário de aceite: Mensagem retoma mesma conversa e histórico. | 05 · 05.5 |
| REQ-121 | Comando DEVE mostrar comando inteiro, motivo e regra proposta; botões oferecidos incluem permitir, nesta sessão, recusar e sempre com aviso de máquina quando houver regra. | 06 · 06.3 |
| REQ-122 | Pedido de arquivos DEVE mostrar cada caminho/tipo e diff, com permitir/nesta sessão/recusar conforme oferta. | 06 · 06.3 |
| REQ-126 | Diálogo da rota DEVE oferecer agente, modelo e esforço, inicialmente Claude Code · Opus · Máximo; confirmação DEVE enviar a escolha. | 06 · 06.2 |
| REQ-127 | Troca para Codex DEVE selecionar o modelo padrão publicado e o maior esforço suportado desse modelo. | 06 · 06.1 |
| US-17 | Provar botões, escopo nesta sessão versus máquina e diff de arquivos; persistência e tradução pertencem às tarefas 02/03/05. | 06 · 06.3 |
| US-19 | Provar o padrão editável e troca para Codex acionando a spec-writer com prompt correspondente. | 06 · 06.2 |
| §15 — consumidores | Inferir os contratos do tRPC; não copiar tipos de API nem importar runtime backend no cliente. | 06 · 06.1 |
| US-17.1 | Cenário de aceite: Comando com motivo e quatro botões conforme oferta. | 06 · 06.3 |
| US-17.4 | Cenário de aceite: Perguntar tudo mostra diff e botões de arquivo. | 06 · 06.3 |
| US-19.1 | Cenário de aceite: Rota inicia escolha Claude/Opus/Máximo editável. | 06 · 06.2 |
| US-19.2 | Cenário de aceite: Troca Codex seleciona padrão e invoca spec-writer. | 06 · 06.2 |
| NFR-18 | Mensagem/resposta DEVE chegar em até 2 s no p95 local, texto/pedido na tela em até 3 s; leitura publicada do preflight em até 200 ms, sem processo externo. | 07 · 07.2 |
| §9 — não muda | Claude conserva comportamento salvo padrão da rota; Issue Author/Planejamento continuam isolados, ignore-user-config e read-only; sessões Codex usam login/config/regras/skills pessoais; sem escrita direta no clone, perfil ou GitHub fora das exceções aprovadas; histórico/tabelas/permissões compartilhados. | 07 · 07.2 |
| §4 — fora de escopo | Não adicionar modo plano, subagentes visíveis, web/image/review/goals/memory, turn/steer, instalação/login pelo Flow Dev ou troca de agente durante sessão. | 07 · 07.4 |
| §20 | Rollout DEVE seguir spike → migration → tradutores → runtime falso → registro/catálogo → tela; reversão de código antes de rollback SQL e efeitos nos pedidos novos documentados. | 07 · 07.4 |
| §24 | Executar suites, três specs E2E afetados, typecheck/lint/build, smoke real e atualizar Spec D conforme definição de pronto. | 07 · 07.4 |
| §9.1 | Claude DEVE preservar o comportamento anterior, salvo padrão da rota. | 07 · 07.2 |
| §9.2 | Codex de Issue Author/Planejamento DEVE preservar isolamento, ignore-user-config e read-only. | 07 · 07.2 |
| §9.3 | Sessão Codex DEVE usar login, config.toml, regras e skills pessoais. | 07 · 07.3 |
| §9.4 | Flow Dev NÃO DEVE escrever diretamente no clone, ~/.codex ou GitHub, salvo Permitir sempre conforme contrato. | 07 · 07.2 |
| §9.5 | Conversa, pedidos, eventos, artefatos e leitura DEVEM continuar nos caminhos compartilhados. | 07 · 07.1 |

### Casos concretos da matriz de verificação
São 76 casos, com entrada, resultado esperado e fronteira real detalhados em “Testes atribuídos” da tarefa dona. V-47 distribui contrato/persistência na 02 e tradução na 03; V-54 fica na 05, e a regressão final adicional IT-509 na 07.

| Caso | Comportamento e fronteira resumidos | Tarefa · mini-tarefa |
|---|---|---|
| V-45a | CLI local com login por assinatura e perfil já configurado → initialize e conversa mínima funcionam e a versão efetiva fica registrada · Codex real por stdio. | 01 · 01.1 |
| V-45b | Skill do clone tem o mesmo nome da skill do Flow Dev → extraRoots e entrada skill com caminho do contexto acionam a do Flow Dev, sem instalação em ~/.codex · Codex real + clone temporário. | 01 · 01.1 |
| V-45c | Flag de perguntas ligada em cada modo → requestUserInput chega fora do modo plano; se não chegar, registrar a alternativa por texto e os sinais de fim da vez · Codex real. | 01 · 01.1 |
| V-45d | Em cada modo da §7.14, tentar edição no clone e comandos confiável/não confiável → comportamento da coluna Esperado é demonstrado; leituras não pedem no modo Perguntar tudo · filesystem e execução reais isolados. | 01 · 01.2 |
| V-45e | Permitir comando nesta sessão → repetição equivalente deixa de pedir nessa sessão e uma nova volta a pedir · dois processos reais em perfil de teste. | 01 · 01.2 |
| V-45f | Permitir sempre a regra proposta → regra exata persiste e outro projeto da máquina/perfil de teste a respeita; nenhuma regra livre é aceita · Codex e arquivo de regras reais isolados. | 01 · 01.2 |
| V-45g | Matar app-server ocioso e durante comando → thread/resume restaura a conversa com histórico; registrar a condição em que falha e a alternativa da REQ-078 · processos reais. | 01 · 01.2 |
| V-45h | Interromper sleep 30 pela vez ativa → turn/interrupt interrompe em até 5 s sem afetar processo de outra sessão · relógio monotônico e processos reais. | 01 · 01.2 |
| V-45i | Codex lê SKILL.md de skill do Flow Dev → registrar se o protocolo expõe caminho e evento utilizáveis; se não expuser, ativação continua pela entrada explícita · Codex real. | 01 · 01.1 |
| V-45j | Web e worker são processos separados, e a resposta é secreta → contrato descreve como o texto chega somente ao runtime, como a persistência recebe apenas o marcador e como cancelamento/reinício/duplo envio funcionam, sem violar as restrições existentes · revisão do fluxo real controller → Postgres → AnswerDispatchStep; decisão registrada, não apenas promessa de ocultação. | 01 · 01.3 |
| IT-501 | Banco com sessões Claude e pedidos existentes recebe a migration → dados, modelos, ids e defaults anteriores permanecem; novas colunas e kinds aceitam os valores definidos · Postgres real. | 02 · 02.1 |
| IT-502 | Aplicar e reverter a migration num banco de teste → schema anterior volta sob a pré-condição documentada; com pedidos novos incompatíveis o procedimento não perde dados silenciosamente · SQL real. | 02 · 02.1 |
| IT-503 | Persistir pedido de comando, file_change e extra_permission e ler timeline junto de um pedido Claude antigo → os três saem como type=permission, com offers/escopo corretos, e o legado mantém sua apresentação · DAO + Postgres + timeline reais. | 02 · 02.2 |
| IT-504 | Gravar id da conversa Codex e versão e reler sessão → agentSessionId/agentVersion preservam os valores, sem renomear a coluna física nem alterar sessões antigas com versão nula · Postgres real. | 02 · 02.2 |
| IT-505 | Schema recebe route com AgentChoice e catálogo de dois modelos com esforços distintos → input válido preserva escolha e DTO distingue label/id/default/esforços; shape inválido é recusado e consumidor legado compila · Zod real e contratos públicos. | 02 · 02.3 |
| V-47h | Decisão não está em offers (allow_session em Claude/grantRoot, allow_always sem regra ou extra_permission com escopo permanente) → decision_not_offered e pedido permanece pending · controller + Postgres reais. | 02 · 02.4 |
| V-47i | Responder pergunta Codex com rótulo desconhecido, escolhas múltiplas ou Outra proibida → resposta recusada; rótulo válido e Outra permitida são aceitos, sem confundir ids de perguntas com textos iguais · validação + controller reais. | 02 · 02.4 |
| V-47j | Motivo de recusa com 2.000/2.001 caracteres e diff total com 20.000/20.001 → motivo no limite aceito e excesso recusado; exibição do diff aplica limite e marcador da Spec C · validação e sumarizador reais. | 02 · 02.4 |
| V-47k | Responder segredo válido por outro processo e disputar resposta/cancelamento → somente uma entrega autorizada recebe texto exato; banco, timeline e logs guardam só (resposta oculta), e reinício não reapresenta o segredo · transporte confirmado + worker + Postgres reais. | 02 · 02.5 |
| IT-506 | Responder allow_session/allow_always no Codex e allow_always no Claude → resultados carregam respectivamente decisão efêmera, regra original de máquina e destino localSettings do projeto, sem reescrever a sugestão Codex · mapper/broker/dispatch reais + Postgres. | 02 · 02.5 |
| IT-507 | Pedido de arquivo com diff persistido → membro autorizado lê o diff e não membro tem acesso negado; exclusão da Issue remove pedidos, inclusive novos kinds · controllers/DAO/autorização + Postgres reais. | 02 · 02.5 |
| V-46a | Itens agentMessage principais de comentário e resposta final, incluindo deltas anteriores → cada mensagem completa aparece uma vez, na ordem · tradutor real, fixtures do protocolo. | 03 · 03.1 |
| V-46b | Receber reasoning, stdout de comando e diff de fileChange já aplicado → nenhum texto de conversa nem payload persistível contém esses conteúdos · tradutor real. | 03 · 03.1 |
| V-46c | Receber mensagens e eventos de thread/subagente → nenhuma mensagem/hook da conversa principal; pedido desse subagente continua classificável para aprovação · tradutores reais. | 03 · 03.1 + 03.3 |
| V-46d | FileChange concluído com add/update/delete/move → hooks por caminho produzem eventos de criar/editar/remover/mover com caminhos corretos, sem diffs no resumo · tradutor + resumidor reais. | 03 · 03.2 |
| V-46e | Comando completo com output volumoso → PostToolUse Bash traz comando e resumo nos limites da Spec B, sem output · tradutor + resumidor reais. | 03 · 03.2 |
| V-46f | Início, prompt, término de vez e encerramento → hooks SessionStart/UserPromptSubmit/Stop/SessionEnd e espera adequados, uma vez cada; Stop permite captura existente · tradutor + pipeline de resumo reais. | 03 · 03.2 |
| V-46g | Entrada skill explícita ou leitura de SKILL.md observável confirmada → evento ativa somente a skill correspondente na vez; Stop termina a ativação · tradutor + ingestão de estado real, arquivo temporário quando pertinente. | 03 · 03.2 |
| V-46h | Mensagem começa por $spec-writer com homônima no clone → entrada aponta para contexto/skills/spec-writer/SKILL.md; skill desconhecida não é substituída e texto comum permanece exato · parser e composição reais. | 03 · 03.5 |
| V-47a | Permitir comando oferecido → resposta JSON-RPC accept, sem emenda persistente · tradução real. | 03 · 03.4 |
| V-47b | Permitir nesta sessão em comando oferecido → acceptForSession, sem destino localSettings ou escrita de regra · tradução real. | 03 · 03.4 |
| V-47c | Permitir sempre com emenda proposta → acceptWithExecpolicyAmendment carrega exatamente a emenda gravada; alteração livre da regra não é incorporada · tradução real. | 03 · 03.4 |
| V-47d | Recusar com motivo → decline; motivo separado para próxima vez, uma única vez e dentro do limite de 2.000 · tradutor e composição de entrada reais. | 03 · 03.4 |
| V-47e | Pedido de arquivos com criar/editar/remover/mover e grantRoot → caminhos e tipos/diffs formatados, grantRoot externo visível sem allow_session; demais botões traduzem a decisão oferecida · tradutor real. | 03 · 03.4 |
| V-47f | Pedido de rede/pasta extra → título Pedir permissão com pedido/motivo e somente allow/deny; resultado usa o tipo confirmado no spike · tradutor real. | 03 · 03.4 |
| V-47g | Perguntas de escolha única com/sem Outra, duas perguntas de mesmo texto e uma secreta → ids originais preservados e resposta contém answers[id].answers com um rótulo/texto correto; segredo não entra no histórico do tradutor · tradução real. | 03 · 03.3 |
| V-48a | bypass, accept_edits e ask_all → approval/sandbox iguais à tabela confirmada no V-45, sem modo plano · builder real, valores esperados do relatório. | 03 · 03.5 |
| V-48b | Start e resume com modelo/esforço escolhidos → mesmas opções e esforço no local exigido pelo protocolo; anexos de imagem viram localImage e demais caminhos seguem no texto · builders reais + caminhos temporários. | 03 · 03.5 |
| V-48c | Constante de perguntas ativa/desligada → config liga a ferramenta apenas quando suportada; alternativa permite pergunta textual e término normal da vez · opções e entradas reais. | 03 · 03.5 |
| V-48d | Montar prompts Tech Spec/PRD, Execução direta, geração e plano em Claude/Codex → instrução preservada, sintaxe correta por agente e exibição [skill] no Codex; trocar configuração externa não muda modo/modelo da sessão · builders reais. | 03 · 03.5 |
| V-50a | Heartbeat do host local ausente/vencido e catálogo antigo disponível → opção e open informam serviço fora do ar, sem sondar Codex; host diferente não habilita a opção · controller + Postgres reais. | 04 · 04.3 |
| V-50b | codex ausente do PATH → disponível=false e Codex não encontrado. Instale o Codex CLI e tente de novo. · locator/probe externo controlado + regras reais. | 04 · 04.1 |
| V-50c | Versão abaixo da mínima, igual ou acima → abaixo informa Atualize o Codex para a versão <mínima> ou mais nova.; mínima/posterior prosseguem à checagem de login · regras reais. | 04 · 04.1 |
| V-50d | Binário compatível sem login → disponível=false e Faça login no Codex: rode `codex login`. · resposta de conta controlada e regra real. | 04 · 04.1 |
| V-50e | Catálogo tem modelo oculto, dois modelos com esforços distintos e catálogo vazio/falho → oculto some, label/id/default/esforços corretos, escolha inválida recusada; diálogo continua com motivo legível em vez de lançar · catalog rules/controllers + Postgres. | 04 · 04.3 |
| V-50f | Serviço sobe, relógio chega antes/exatamente a dez minutos e sondagem seguinte falha → publica no início e no prazo, não antecipa renovação, heartbeat preserva snapshot e falha não interrompe o supervisor · publisher/DAO reais + Postgres; relógio/probe controlados. | 04 · 04.2 |
| V-50g | Snapshot dizia disponível e login/binário muda antes do open → conferência final recusa o Codex pelo motivo atual; preflight não cria processo e Claude ausente não bloqueia Codex válido · controller/guard reais + Postgres; probe externo controlado. | 04 · 04.4 |
| V-50h | Modelo salvo no plano some do catálogo, ou provedor recusa por limite → erro explica o modelo/motivo e item continua editável; para sumiço usa O modelo <id> não está mais disponível no Codex. Troque o modelo da sessão. · open + plano + Postgres, falha externa controlada. | 04 · 04.4 |
| V-49h | Frames fragmentados/unidos, respostas fora de ordem e request do servidor → ids corretos, nenhuma promessa sem destino após EOF, erros trazem método; teste fora de NODE_ENV=test não usa fake; produção só executa PATH com argumentos fixos e shell=false · cliente e processo por stdio reais. | 05 · 05.1 |
| V-49a | Start válido com modelo/esforço/anexos/skill → initialize/extraRoots/thread/start/turn/start corretos, thread/started emite id e running; duas sessões têm processos próprios · runtime + app-server falso reais. | 05 · 05.2 |
| V-49g | Processo falha ou modelo/limite é recusado antes do início → onExit failed com motivo, persistência launch_failed; versão antiga não chega a turn/start · runtime + falso; serviço + Postgres para estado. | 05 · 05.2 |
| V-49b | Servidor pede pergunta/aprovação, inclusive de subagente e segredo → runtime aguarda pessoa e devolve resposta no request id correto, pergunta em bypass não é liberada automaticamente · processo real + broker/transportes. | 05 · 05.3 |
| V-54c | Mensagem durante vez ativa, reenvio com mesma requestKey e pergunta textual com flag desligada → mensagem fica Na fila, entrega única após fim; alternativa textual vai para Aguardando você e recebe próxima mensagem · serviço/controllers + Postgres + app-server falso. | 05 · 05.3 |
| V-49c | Turn ativa com comando longo e pedido pendente recebe interrupt → turn/interrupt usa id correto, pedido cancelado e conversa Interrompido por você; sem vez/pedido não inventa interrupção · runtime/serviço + processo e Postgres reais. | 05 · 05.4 |
| V-49d | Close com descendente ativo e outro servidor independente → unsubscribe, grupo próprio termina, nenhum filho órfão, outro segue; artefatos finais capturados e conversa fica leitura · grupos reais + serviço. | 05 · 05.4 |
| V-49e | App-server morre no meio da vez → onExit crashed, sessão Interrompida e pedidos cancelados, sem resumir sozinha · processo e Postgres reais. | 05 · 05.5 |
| V-49f | Resume após crash → thread/resume usa mesmo id/modelo/política e turn/start mesmo esforço/mensagem; falha de resume → ended e Não entregue · runtime e processo falso reais; persistência real. | 05 · 05.5 |
| V-54d | Serviço reinicia com pedido pendente → nota de interrupção/cancelamento; mensagem da pessoa retoma uma vez; sem id a retomada falha; shutdown usa abandon e não encerra voluntariamente · worker + Postgres reais. | 05 · 05.5 |
| V-54a | Registrar Claude e Codex e abrir rota, geração e plano → cada sessão usa runtime da escolha, id/modelo/esforço/versão persistidos; skill escreve spec.md e Stop captura artefato com path/skill/versão; plano captura task_NN sem skill · serviço + Postgres + clone temporário + app-server falso. | 05 · 05.6 |
| V-54b | Sessões Claude existentes após registrar Codex → start/resume, pergunta, allow_always localSettings e captura preservados; logs Codex registram método/versão/processo/flag sem conteúdo · testes de regressão existentes + Postgres, fornecedor externo controlado. | 05 · 05.6 |
| V-51f | Selecionar Codex com modelo padrão diferente do primeiro da lista → seleciona id padrão e maior esforço suportado; trocar modelo filtra esforços, exibe label e envia id, tanto na geração quanto no plano · RTL com catálogo controlado, seletor real. | 06 · 06.1 |
| V-51g | Codex indisponível por serviço, PATH, versão ou login e modelo salvo removido → opção desabilitada com texto exato; escolha salva não é trocada silenciosamente · RTL, metadata de API controlada. | 06 · 06.1 |
| V-51e | Abrir diálogo da rota → Claude Code · Opus · Máximo editáveis; trocar para Codex em Tech Spec/PRD/Execução direta e confirmar → purpose route leva choice correta e prompt/skill compatíveis, preservando texto editado · RTL com cliente externo substituído. | 06 · 06.2 |
| V-51a | Pedido de comando Codex com regra e quatro ofertas → comando/motivo/regra e quatro botões visíveis, aviso de máquina explícito; clique envia allow_session; Claude mantém seus botões/textos · RTL. | 06 · 06.3 |
| V-51b | Pedido de arquivos criar/editar/remover/mover com diff cortado e grantRoot externo → tipos/caminhos/diff/marcador visíveis, somente ofertas do payload, grantRoot sem nesta sessão · RTL. | 06 · 06.3 |
| V-51c | Pedido extra de rede ou pasta → Pedir permissão, motivo e só Permitir/Recusar; motivo opcional tem limite 2.000 · RTL. | 06 · 06.3 |
| V-51d | Pergunta secreta recebe texto e é enviada/cancelada → campo tipo password, nenhuma renderização do valor, histórico mostra (resposta oculta) e estado local limpo · RTL, transporte na fronteira controlado. | 06 · 06.4 |
| V-51i | Pergunta Codex com opções/descritivos e Outra permitida/proibida, inclusive aberta sem opções → escolha única, Outra só quando permitida e envio desabilitado enquanto faltar resposta; labels e conteúdo acessíveis por teclado · RTL. | 06 · 06.4 |
| V-51h | Membro/ex-operadora lê sessão ativa ou encerrada de rota/geração/plano → vê conteúdo e agente/modelo/esforço, sem enviar/responder/interromper/encerrar; operadora autorizada conserva controles e histórico legível · RTL. | 06 · 06.5 |
| V-53a | Operadora inicia Codex, vê texto, responde pergunta, permite comando nesta sessão e encerra → fluxo visível completo com estados, retorno do agente e conversa final em leitura · Playwright + web + worker/RPC + processo falso + Postgres de teste. | 07 · 07.1 |
| V-53b | Outro membro abre a mesma tarefa enquanto Codex pede resposta → lê conversa/pedidos sem controles; tentativa pública de mutação não opera sessão · Playwright com usuário de teste independente + autorização real. | 07 · 07.1 |
| IT-508 | Amostras locais de envio/resposta, mensagem concluída/pedido e preflight → p95 entrega ≤2 s, reflexo na UI ≤3 s, disponibilidade/catálogo ≤200 ms sem iniciar processo; abertura ≤10 s e interrupção ≤5 s dos cenários de aceite · worker/Postgres + relógio real; UI real no spec Codex, registrar limites do que foi medido. | 07 · 07.2 |
| IT-509 | Rodar fluxos existentes Claude e agentes isolados após habilitar Codex → conversa/captura/segunda sessão/permissões intactas; argumentos Codex do Issue Author/Planejamento continuam ignore-user-config e read-only, sem escrita direta pelo Flow Dev; sessão Codex respeita perfil pessoal em ambiente isolado · suites existentes, filesystem/Postgres reais e fornecedor controlado. | 07 · 07.2 |
| V-52a | Abrir Tech Spec com spec-writer no Codex real, responder perguntas (ou texto, conforme flag) e continuar → conversa e spec capturada com versão corretas · UI + CLI real + projeto de teste. | 07 · 07.3 |
| V-52b | Iniciar sessão do plano com Codex real no modelo/esforço escolhidos → executa a tarefa designada e captura status/artefatos, mantendo a escolha visível · UI + CLI/clone reais. | 07 · 07.3 |
| V-52c | Reiniciar serviço durante sessão real com histórico/pedido e enviar Pode seguir → Interrompida, pedido Cancelada e mesma conversa retomada com escolhas; falha exibe alternativa prevista · UI + processos/CLI reais. | 07 · 07.3 |

## Foco de revisão
1. Resposta secreta cruza web e worker → Codex recebe o texto uma vez, banco/timeline/logs só o marcador, inclusive cancelamento/reinício → contrato 01.3 (V-45j), integração 02.5 (V-47k) e UI 06.4 (V-51d).
2. GrantRoot/regra proposta e oferta de escopo → não ampliar permissões, não oferecer nesta sessão fora do clone, emenda persistente exata e Claude continua localSettings → 02.4/02.5 (V-47h, IT-506), 03.4 (V-47c, V-47e).
3. Notificações de raciocínio/subagentes versus pedidos → nenhum conteúdo excluído persistido, pedidos continuam respondíveis → 03.1 (V-46b), 03.3 (V-46c) e 05.3 (V-49b).
4. Atualização do Codex/modelo depois da publicação → preflight sem spawn, open reconfere, escolha removida explica o erro e plano segue editável → 04.3/04.4 (V-50e, V-50g, V-50h) e 07.2 (IT-508).
5. Encerramento versus shutdown/queda e outro processo pessoal → close só mata grupo próprio, abandon preserva recuperação e resume não troca a escolha → 05.4/05.5 (V-49d, V-49f, V-54d), smoke 07.3 (V-52c).
