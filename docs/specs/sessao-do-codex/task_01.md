---
status: completed
title: "Spike e contratos confirmados"
type: test
complexity: high
---

# Task 01: Spike e contratos confirmados

## Visão geral
Confirmar as premissas do app-server real antes de consolidar contratos. Entregar evidência reproduzível em v45-spike.md e resolver o transporte de respostas secretas sem presumir uma solução incompatível com a Spec C.

<critical>
- LEIA `spec.md`, `_tasks.md`, `AGENTS.md`, as instruções locais aplicáveis e `.agents/rules/code-standards.md` antes de começar.
- FAÇA UMA MINI-TAREFA POR VEZ, na ordem. Só marque `[x]` depois de executar o “Pronto quando” e conferir o resultado.
- NÃO saia dos arquivos listados sem registrar o motivo no Registro de execução. Divida helpers e testes para respeitar 100 linhas por arquivo `.ts`, 30 linhas por função e até 3 parâmetros; não transforme uma mini-tarefa num diff maior que aproximadamente 200–300 linhas sem subdividi-la no plano.
- TESTES JUNTO COM O CÓDIGO: siga `.agents/skills/software-testing/SKILL.md` e `references/escolha-e-desenho.md`. Cenário → efeito específico esperado da spec → fronteira real. Sem asserções vagas, expectativas calculadas pela implementação ou mocks do comportamento sob teste. Controle relógio, concorrência e aleatoriedade.
- Ao começar, mude o status para `in_progress` aqui e no manifesto. Marque também cada teste atribuído somente com evidência. Use `completed` apenas após todas as mini-tarefas e critérios de sucesso; a revisão `spec-conformance` acontece uma vez na feature inteira, após as sete tarefas.
- Preserve alterações já presentes no workspace. Não faça commit, push, PR nem implemente sugestões fora do escopo.
</critical>

## Requisitos
- **P-17:** Confirmar a ferramenta de perguntas fora do modo plano, nos três modos; se falhar, registrar a aplicação da alternativa textual.
- **P-18:** Confirmar retomada após morte do processo, inclusive durante comando, e a falha controlada da REQ-078 da Spec C.
- **P-19:** Confirmar raiz extra e entrada skill pelo caminho do contexto, preservando configuração pessoal.
- **P-20:** Confirmar o comportamento esperado de cada linha da §7.14 antes de fixar a tradução.
- **§11 — dependências:** Verificar os contratos implementados das Specs C/D; distinguir status documental de evidência de execução.
- **US-17.2:** Cenário de aceite: Permitir nesta sessão não se aplica à próxima.
- **US-17.3:** Cenário de aceite: Permitir sempre aplica regra em outro projeto.

## Interfaces
- **Consome:** `AgentSessionRuntime`, `RuntimePermissionRequest/Result` e `SessionRequestController.answerQuestion`; CLI local e protocolo gerado.
- **Produz:** `docs/specs/sessao-do-codex/v45-spike.md`, com versão mínima, métodos/tipos efetivos, tabela de políticas, flag de perguntas, sinais observáveis de skill, opções de start/resume e contrato de respostas secretas. O documento é a referência de implementação das demais tarefas.
- O contrato público da §15 permanece a referência. Qualquer divergência real deve ser registrada na spec e no manifesto antes de liberar contratos downstream.

## Mini-tarefas

- [x] **01.1 — Provar skills e perguntas no Codex real**
  - **Arquivos:** `docs/specs/sessao-do-codex/v45-spike.md (criar)`; `docs/specs/sessao-do-codex/spike/ (criar apenas scripts pequenos e fixtures sanitizadas necessários)`.
  - **Testes:** V-45a, V-45b, V-45c, V-45i
  - **Pronto quando:** `rtk codex --version` e `rtk codex app-server --help` registrados; executar os roteiros JSON-RPC do spike em repositório temporário e registrar entradas, saídas sanitizadas e veredito de cada caso. Nenhum segredo ou diretório pessoal é copiado para o relatório.
  - **Nota:** Use o login já existente por assinatura. Não instalar, autenticar nem alterar o ~/.codex pessoal para preparar o teste. Confirme o protocolo pela CLI instalada; leia a skill openai-docs disponível se precisar de pesquisa sobre o produto.

- [x] **01.2 — Provar permissões, isolamento e recuperação**
  - **Arquivos:** `docs/specs/sessao-do-codex/v45-spike.md`; `docs/specs/sessao-do-codex/spike/ (somente roteiros do spike)`.
  - **Testes:** V-45d, V-45e, V-45f, V-45g, V-45h
  - **Pronto quando:** Executar a matriz da §7.14, aprovação por sessão, regra persistente em perfil de teste isolado, morte e retomada e interrupção de `sleep 30`; registrar a decisão exata do protocolo e o efeito observado em cada caso.
  - **Nota:** A regra persistente deve ser testada com CODEX_HOME temporário e autenticação de teste já disponível, sem imprimir credenciais. Se isso impedir usar a assinatura, registre a limitação e não marque o caso como provado. Mate somente PIDs/grupos criados pelo roteiro.

- [x] **01.3 — Fechar o contrato e atualizar premissas antes da implementação**
  - **Arquivos:** `docs/specs/sessao-do-codex/spec.md`; `docs/specs/sessao-do-codex/v45-spike.md`; `docs/specs/sessao-do-codex/_tasks.md`; `docs/specs/sessao-do-codex/task_02.md (somente se o contrato confirmado exigir caminhos adicionais)`.
  - **Testes:** V-45j
  - **Pronto quando:** Relatório contém a evidência dos dez casos, versão mínima, políticas confirmadas, opções concretas e contrato de entrega de segredo; `rtk python3 -I .agents/skills/spec-to-tasks/scripts/tasks_status.py docs/specs/sessao-do-codex` passa. Não completar esta tarefa com o contrato de segredo indefinido.
  - **Nota:** A aprovação de criar as tarefas não escolheu transporte para segredos. Documente a solução compatível se houver; se exigir guardar o segredo, abrir porta entre web e worker ou mudar a DEC-17, prepare a proposta concreta e obtenha a decisão do usuário antes de avançar. Renumere referências da migration da Spec E para 0051, se ainda livre.

## Detalhes de implementação
Este spike é a prova do fornecedor; o servidor falso da tarefa 05 não substitui seus resultados. Guarde exemplos mínimos sanitizados do protocolo para gerar tipos e casos sem raciocínio, output de comando ou credenciais. Não habilite Codex no produto nesta tarefa.

### Arquivos relevantes
- `packages/api/src/application/terminal/agentSessionRuntime.ts`: porta neutra já implementada; o nome antigo claudeSessionRuntime.ts citado na spec foi removido.
- `packages/api/src/controllers/sessionRequestController.ts`: hoje persiste a resposta antes de o worker recebê-la.
- `packages/api/src/application/services/terminal/answerDispatch.ts`: hoje entrega ao runtime a resposta lida do Postgres.
- `docs/specs/sessao-no-flow-dev/spec.md`: estados, limites e DEC-17.
- `docs/specs/tarefas-e-plano-de-execucao/_tasks.md`: registro e seleção existentes; task_09 ainda precisa de evidência própria.

### Arquivos afetados
Os caminhos de alteração estão em cada mini-tarefa; os marcados “criar” ainda não existem. Helpers adicionais pertencem ao mesmo diretório da responsabilidade e devem ser registrados antes da edição. Não usar uma renomeação geral para acomodar a feature.

### Decisões relacionadas
DEC-29, DEC-31 e DEC-33 são verificadas aqui; a implementação pertence às tarefas 03/05. Confirmar §7.14, P-17 a P-20 e §24 antes de fechar.

## Premissas
Plano aprovado em 2026-11-23 com o transporte secreto como decisão bloqueante desta tarefa. O Codex real e o login podem faltar no ambiente de execução; nesse caso registre o bloqueio, sem simular a evidência nem completar a tarefa. 0050 já está ocupada por session_plans; usar 0051 apenas se continuar livre.

## Testes atribuídos
Cada ID abaixo tem um único dono no plano; grupos da matriz da spec foram expandidos em casos concretos. IDs IT-50x são complementos deste plano, não novos requisitos de produto.

- [x] **V-45a** (01.1): CLI local com login por assinatura e perfil já configurado → initialize e conversa mínima funcionam e a versão efetiva fica registrada · Codex real por stdio.
- [x] **V-45b** (01.1): Skill do clone tem o mesmo nome da skill do Flow Dev → extraRoots e entrada skill com caminho do contexto acionam a do Flow Dev, sem instalação em ~/.codex · Codex real + clone temporário.
- [x] **V-45c** (01.1): Flag de perguntas ligada em cada modo → requestUserInput chega fora do modo plano; se não chegar, registrar a alternativa por texto e os sinais de fim da vez · Codex real.
- [x] **V-45d** (01.2): Em cada modo da §7.14, tentar edição no clone e comandos confiável/não confiável → comportamento da coluna Esperado é demonstrado; leituras não pedem no modo Perguntar tudo · filesystem e execução reais isolados.
- [x] **V-45e** (01.2): Permitir comando nesta sessão → repetição equivalente deixa de pedir nessa sessão e uma nova volta a pedir · dois processos reais em perfil de teste.
- [x] **V-45f** (01.2): Permitir sempre a regra proposta → regra exata persiste e outro projeto da máquina/perfil de teste a respeita; nenhuma regra livre é aceita · Codex e arquivo de regras reais isolados.
- [x] **V-45g** (01.2): Matar app-server ocioso e durante comando → thread/resume restaura a conversa com histórico; registrar a condição em que falha e a alternativa da REQ-078 · processos reais.
- [x] **V-45h** (01.2): Interromper sleep 30 pela vez ativa → turn/interrupt interrompe em até 5 s sem afetar processo de outra sessão · relógio monotônico e processos reais.
- [x] **V-45i** (01.1): Codex lê SKILL.md de skill do Flow Dev → registrar se o protocolo expõe caminho e evento utilizáveis; se não expuser, ativação continua pela entrada explícita · Codex real.
- [x] **V-45j** (01.3): Web e worker são processos separados, e a resposta é secreta → contrato descreve como o texto chega somente ao runtime, como a persistência recebe apenas o marcador e como cancelamento/reinício/duplo envio funcionam, sem violar as restrições existentes · revisão do fluxo real controller → Postgres → AnswerDispatchStep; decisão registrada, não apenas promessa de ocultação.

## Verificação da tarefa
- Comandos de shell usam `rtk`, conforme `/home/mauricio/.codex/RTK.md`.
- Durante a implementação, rode só os arquivos afetados. Em `packages/api/test/`, use `rtk pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts <arquivo>`; em `packages/api/src/`, omita `--config`.
- Agrupe as edições antes do typecheck. Se alterar contratos consumidos pela web, confira também `rtk pnpm --dir apps/web typecheck`.
- No fechamento de uma tarefa que alterou a API, rode `rtk pnpm --dir packages/api test` e `rtk pnpm --dir packages/api test:integration` uma vez. Para a web, `rtk pnpm --dir apps/web test` uma vez. Repita somente falhas; depois confirme com a suíte completa.
- Não defina `TEST_DATABASE_URL` localmente. A integração provisiona Postgres descartável; requer `pg_config`, `initdb` e `pg_ctl`. Não aumente timeouts nem reduza workers para esconder lentidão.
- `packages/api/package.json` não tem script de lint. `rtk pnpm lint` é o comando do monorepo. Build e Playwright ficam na tarefa 07, que cobre o fluxo visível alterado; se uma mini-tarefa mudar rotas ou configuração de build, execute o gate pertinente nela e registre a razão.

## Critérios de sucesso
- Todas as mini-tarefas e testes atribuídos marcados apenas depois de comprovados.
- Dez casos têm resultado observado, limitações e versão; nenhuma credencial no relatório.
- Contrato secreto definido e aceito quando exigir mudança das decisões existentes.
- Spec, manifesto e caminhos de tipos refletem a evidência; as demais tarefas não começam sobre premissas negadas.
- Respeitar as regras de código, camadas e autorização do projeto; registrar qualquer gate indisponível sem declarar sucesso.

## Registro de execução
<!-- Acrescentar data, mini-tarefa, mudança, comandos/resultados, desvios e limitações. Sem evidência de implementação na criação deste plano. -->
- 2026-11-23 — 01.1 parcial: registrar prova e protocolo em [v45-spike.md](v45-spike.md). `codex-cli 0.159.3`; login ChatGPT disponível; processo real aceitou `initialize`, `skills/extraRoots/set` e `model/list` (8 modelos) via stdio em workspace temporário. Leitura/ativação de skill e ferramenta de perguntas continuam pendentes. 01.2 não começou. O usuário aprovou `pg_notify` para respostas secretas em 01.3; ainda faltam as provas reais de 01.1/01.2 antes de fechar contratos. Nenhuma mini-tarefa ou caso V-45 foi marcado como concluído.
- 2026-11-23 — V-45b provado: a skill homônima no clone não substituiu a entrada explícita do caminho de contexto; o Codex devolveu o canário esperado. V-45c provado nos três pares approval/sandbox, com turns `completed`. V-45a e V-45i continuam pendentes/parciais. V-45d apresentou três pedidos por modo `untrusted`, sem identificar ainda qual ação causou cada pedido; não marcar até confirmar a matriz esperada. Detalhes no relatório.
- 2026-11-23 — V-45e provado: `acceptForSession` dispensou a repetição na mesma sessão, e um segundo app-server real pediu novamente. O perfil era temporário e foi removido ao fim do roteiro.
- 2026-11-23 — V-45f provado: a regra original do evento foi enviada em `acceptWithExecpolicyAmendment`; outra sessão em diretório de projeto diferente executou sem novo pedido. Execução no perfil temporário, removido ao fim.
- 2026-11-23 — V-45a, V-45g e V-45h provados: conversas reais completaram no CLI 0.159.3; retomada após SIGKILL restaurou o histórico ocioso e o contexto de `sleep 30`; interromper a vez terminou como `interrupted` em <5 s sem afetar outro processo. V-45d segue pendente: `untrusted` também pede aprovação para `ls`/`cat`, divergindo da §7.14. V-45i e V-45j ainda precisam fechamento.
- 2026-11-23 — 01.2 encerrada: `untrusted/workspace-write` e `untrusted/read-only` pedem aprovação até para `ls` (`listFiles`) e `cat` (`read`); `pwd` e Python são `unknown`. Edição nativa gera `item/fileChange/requestApproval`. A tabela 7.14 foi atualizada para traduzir essas solicitações no Flow Dev, com aprovação automática limitada a ações estruturadas de leitura dentro do clone e `fileChange` automático somente em “Aceitar edições”.
- 2026-11-23 — 01.3 encerrada: revisão do controller → Postgres → worker confirmou que a resposta atual cruza processos pelo banco. O usuário aprovou `pg_notify` efêmero; DEC-17 e task 02.5 registram o transporte e arquivos previstos. `v45-spike.md` reúne resultados e limitações; `tasks_status.py` confirma o manifesto. V-45a–j e as três mini-tarefas concluídos.
- 2026-11-23 — Correção de fechamento: §14 e rollback da spec agora apontam para 0051 e documentam a pré-condição que evita perda de dados; 0050 já pertencia a `session_plans`. Essa referência antiga havia passado na primeira revisão da 01.3.
