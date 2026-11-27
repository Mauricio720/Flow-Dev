# Spec: Sessões como moldes e execução automática do plano

> **Status:** Em revisão · **Data:** 2026-11-26 · **Nível:** L4 spec ancorada (migration, API, worker, web e e2e em várias sessões; segue para spec-to-tasks) · **Issue:** #11
> **Contexto lido:** [Spec D](../tarefas-e-plano-de-execucao/spec.md) (§7.2, §7.5, US-13, US-14), [Issue #8](../selecao-de-tarefas-por-sessao/spec.md), [revisão automática](../revisao-automatica-da-feature/spec.md); `packages/api/src/application/services/tasks-set/plan*.ts`, `services/review/reviewCycleStep.ts`, `reviewStepOpen.ts`, `services/terminal/sessionLauncher.ts`, `infra/database/dao/plans/drizzlePlanSave.ts`, `schema/tasks/sessionPlans.ts`; `apps/web/src/features/issues/assigned-work/components/ExecutionPlanEditor.tsx` e vizinhos; pedido original em `task_messages`.
> **Vocabulário:** "feature" é o trabalho atribuído (a Issue). "Tarefa" é um `task_NN.md`. "Sessão" é uma sessão do plano. "Sessão do agente" é a conversa com o Claude Code ou o Codex que uma sessão do plano abre. Os IDs da Spec D levam o prefixo "D-", e os da Issue #8, o prefixo "S8-".

## Resumo para revisão

- **O que muda:**
  - A operadora cria sessões vazias (os "moldes") e coloca tarefas nelas arrastando ou por "Adicionar tarefas". O seletor "Sessão" por tarefa sai.
  - Ela ordena as sessões arrastando e pode marcar que uma sessão "começa depois de" outras.
  - "Executar o plano" inicia as sessões sozinhas, uma por vez e na ordem, quando as condições estão atendidas, e pausa com o motivo em qualquer falha.
- **Por quê:** a sessão nasce de dentro da tarefa e sempre no fim. Separar uma dependência numa sessão nova cai em "A tarefa 02 depende da 01, que está numa sessão posterior.", e cada sessão exige um clique.
- **Decisões principais:**
  - DEC-01: a execução roda no worker de sessões, como a revisão automática.
  - DEC-02: o estado da execução fica numa tabela própria.
  - DEC-03: as condições ficam numa tabela com cascata.
  - DEC-05: uma sessão ociosa não segura a fila.
  - DEC-06: arrastar e soltar nativo.
- **Riscos principais:**
  - Sessões caras rodando sozinhas. Mitigação: só "Executar o plano" dispara, uma por vez, com pausa em tarefa aberta.
  - Um agente que não atualiza o `status` pausa o plano a cada sessão.
- **Como vamos verificar:** regras puras pela API pública; gravação e execução contra Postgres real, com o agente dublado; RTL; uma jornada e2e em que a segunda sessão começa sozinha.
- **Pendências:** nenhuma.

---

# Parte 1 — Produto

## 1. Contexto e problema

Cada feature tem um plano (D-US-13): até 30 sessões ordenadas, cada uma com de 1 a 30 tarefas e um agente, modelo e esforço. Hoje:
- uma sessão só existe com tarefas. Ela nasce do seletor "Sessão da tarefa NN → Nova sessão" ou do diálogo "Tarefas da nova sessão" (S8-REQ-005), sempre no fim, e sai quando fica vazia (S8-REQ-004). Por isso, mover a 01 para uma sessão nova, deixando a 02 (que depende dela) antes, é recusado (D-REQ-095);
- a sessão fica "Bloqueada" enquanto faltam tarefas de que ela depende (D-REQ-100), mas sempre começa por "Iniciar" e pelo diálogo;
- não há como dizer "a Sessão 3 só começa depois da Sessão 1".

Pedido original: *"A forma em que criamos sessão sendo na tarefa em si é bem confuso [...] criar sessões como moldes e conseguirmos puxar ou adicionar as tarefas [...] uma sessão que depende de uma terminar pra ela iniciar"*. Na revisão da Issue: *"esse bloqueio está correto, mas quero resolver com a possibilidade de executar uma sessão só depois que a tarefa que ele é dependente esteja pronta"*.

## 2. Usuários e papéis

- **Operadora da feature:** monta o plano, executa, pausa e retoma.
- **Membro ou admin do projeto:** vê o plano, as condições e o estado da execução, sem agir (D-7.7).

## 3. Objetivos

- **O-1:** montar o plano criando sessões vazias e colocando tarefas nelas.
- **O-2:** definir a ordem de execução das sessões.
- **O-3:** marcar que uma sessão começa depois de outras e ver na tela as condições de cada sessão.
- **O-4:** executar o plano sem clicar sessão por sessão. As sessões começam sozinhas, uma por vez, na ordem, quando as condições estão atendidas, e a execução pausa com o motivo quando algo não termina bem.

## 4. Fora de escopo

- **Moldes reutilizáveis entre features ou projetos:** o molde é uma sessão vazia do plano desta feature (decisão da operadora).
- **Tarefa em mais de uma sessão:** a regra atual continua.
- **Liberar a regra de posição das tarefas:** a operadora decidiu mantê-la. A espera pela tarefa pronta vem do bloqueio que já existe e do início automático.
- **Sessões automáticas em paralelo:** uma por vez (decisão da operadora).
- **Nova tentativa automática** de uma sessão que falhou ou terminou com tarefas abertas: a execução pausa (decisão da operadora).
- **Editar o prompt, anexos ou imagens no início automático:** quem quiser isso inicia a sessão pelo "Iniciar" manual.
- **Nome próprio para as sessões:** a numeração "Sessão N" segue a ordem.

## 5. Histórias de usuário

### US-01 — Montar sessões como moldes (P1)
Como operadora, quero criar sessões vazias e depois colocar tarefas nelas, para montar o plano sem criar sessões de dentro das tarefas.
- **Por que P1:** é a reclamação central da Issue.
- **Teste independente:** criar duas sessões vazias, colocar tarefas, salvar e recarregar.
- **Cenários de aceite:**
  1. **Dado** o plano sem sessões e as tarefas 01–03 em "Sem sessão", **quando** Ana aciona "Nova sessão" duas vezes, **então** aparecem a "Sessão 1" e a "Sessão 2", em Claude Code · Opus · Máximo, cada uma com "Sem tarefas. Arraste tarefas para cá ou use Adicionar tarefas.". Nenhum diálogo abre.
  2. **Dado** isso, **quando** Ana arrasta a 01 para a Sessão 1 e, em "Adicionar tarefas" da Sessão 2, marca a 02 e a 03 e aplica, **então** a Sessão 1 tem a 01, a Sessão 2 tem a 02 e a 03, e "Sem sessão" some.
  3. **Dado** a Sessão 2 com a 02 e a 03, **quando** Ana aciona "Remover da sessão" na 02 e na 03 e salva, **então**, ao recarregar, a Sessão 2 continua no plano, vazia, e a 02 e a 03 estão em "Sem sessão".
  4. **Dado** que a 02 depende da 01, **quando** Ana deixa a 02 na Sessão 1 e a 01 na Sessão 2 e salva, **então** vê "A tarefa 02 depende da 01, que está numa sessão posterior.", e nada é salvo.

### US-02 — Definir a ordem e as condições de início (P1)
Como operadora, quero ordenar as sessões e dizer quais começam depois de quais, para controlar quando cada sessão pode começar.
- **Por que P1:** é a segunda metade do pedido.
- **Teste independente:** reordenar, marcar uma condição, salvar e ver as condições no cartão.
- **Cenários de aceite:**
  1. **Dado** as Sessões 1 (01), 2 (02) e 3 (03), sem dependências entre as tarefas, **quando** Ana arrasta a Sessão 3 para o topo e salva, **então** a ordem passa a Sessão 1 (03), Sessão 2 (01), Sessão 3 (02).
  2. **Dado** que a 02 depende da 01, com a 01 na Sessão 1 e a 02 na Sessão 2, **quando** Ana abre o plano, **então** o cartão da Sessão 2 mostra "Aguarda a tarefa 01 (Sessão 1)" sem que ela marque nada.
  3. **Dado** três sessões, **quando** Ana marca a "Sessão 1" em "Começa depois de" da Sessão 3 e salva, **então** o cartão da Sessão 3 mostra "Começa depois de: Sessão 1".
  4. **Dado** que a Sessão 3 começa depois da Sessão 2, **quando** Ana usa "Subir" na Sessão 3 e salva, **então** vê "A Sessão 2 começa depois da Sessão 3, que vem depois dela na ordem.", e nada é salvo.

### US-03 — Executar o plano (P1)
Como operadora, quero acionar uma vez e ver as sessões começarem sozinhas, para não ter de voltar à tela a cada sessão.
- **Por que P1:** é o "uma sessão que depende de outra terminar pra ela iniciar".
- **Teste independente:** executar um plano de duas sessões e ver a segunda começar sem clique.
- **Cenários de aceite:**
  1. **Dado** o plano salvo com a Sessão 1 (01) e a Sessão 2 (02, que depende da 01), sem sessão do agente aberta, **quando** Ana aciona "Executar o plano", **então** a Sessão 1 começa sem diálogo, com o prompt de execução da D-7.6, e o plano mostra "Executando · Sessão 1".
  2. **Dado** isso, **quando** o agente marca a 01 como `completed` e termina a vez, **então** em até 10 s a Sessão 2 começa sozinha.
  3. **Dado** a Sessão 2 concluída e nenhuma outra sessão no plano, **quando** a tela atualiza, **então** o plano mostra "Plano concluído", e nada mais começa.
  4. **Dado** as Sessões 1 e 2 sem condição entre elas, **quando** o agente da Sessão 1 ainda está trabalhando, **então** a Sessão 2 não começa até ele terminar a vez.

### US-04 — Pausar e retomar a execução (P1)
Como operadora, quero que a execução pare quando algo não terminar bem e poder pausá-la e retomá-la, para não gastar sessões em cima de um resultado errado.
- **Por que P1:** sem isso, o início automático encadeia falhas.
- **Teste independente:** forçar uma sessão a terminar com tarefa aberta e ver a pausa com o motivo.
- **Cenários de aceite:**
  1. **Dado** a execução na Sessão 1, **quando** o agente termina a vez com a 01 em "Em andamento", **então** a execução mostra "Pausada: a Sessão 1 terminou com tarefas não concluídas: 01.", e a Sessão 2 não começa.
  2. **Dado** o serviço de sessões parado, **quando** chega a vez da Sessão 2, **então** a execução mostra "Pausada: não foi possível iniciar a Sessão 2. O serviço de sessões não está rodando nesta máquina." (a mensagem do "Iniciar" para esse motivo).
  3. **Dado** a execução na Sessão 1, **quando** Ana aciona "Pausar", **então** a sessão do agente continua até terminar a vez, nenhuma outra começa, e o plano mostra "Pausada por Ana".
  4. **Dado** a execução pausada com a Sessão 1 encerrada e a 01 aberta, a Sessão 2 com a 02 (que depende da 01) e a Sessão 3 sem condição, **quando** Ana aciona "Retomar", **então** a Sessão 3 começa. Quando ela termina, a execução mostra "Pausada: Nenhuma sessão pode começar. A Sessão 1 foi encerrada com tarefas não concluídas. A Sessão 2 aguarda 01.".

## 6. Requisitos funcionais

**Montagem (US-01)**
- **REQ-001:** QUANDO a operadora acionar "Nova sessão", o sistema DEVE acrescentar ao fim do rascunho uma sessão sem tarefas, em Claude Code · Opus · Máximo (D-REQ-094), sem abrir diálogo.
- **REQ-002:** ENQUANTO uma sessão não iniciada estiver sem tarefas, o cartão DEVE mostrar "Sem tarefas. Arraste tarefas para cá ou use Adicionar tarefas.".
- **REQ-003:** QUANDO a operadora soltar uma tarefa, vinda de "Sem sessão" ou de uma sessão não iniciada, sobre outra sessão não iniciada, a tarefa DEVE passar a essa sessão no rascunho. Soltá-la sobre "Sem sessão" DEVE tirá-la da sessão.
- **REQ-004:** Cada sessão não iniciada DEVE oferecer "Adicionar tarefas", que abre o diálogo "Tarefas da Sessão N" da S8-REQ-002 a S8-REQ-004. A diferença é que a sessão que ficar vazia continua no plano.
- **REQ-005:** Cada tarefa de uma sessão não iniciada DEVE ter "Remover da sessão", que a leva a "Sem sessão". A sessão continua no plano.
- **REQ-006:** Cada sessão não iniciada DEVE ter "Remover sessão". As tarefas dela voltam a "Sem sessão", e as condições de outras sessões que apontavam para ela saem do rascunho.
- **REQ-007:** O seletor "Sessão da tarefa NN" e o diálogo "Tarefas da nova sessão" DEVEM deixar de existir. Uma sessão só nasce por "Nova sessão" ou pelos atalhos (D-REQ-093).
- **REQ-008:** O sistema DEVE aceitar salvar sessões sem tarefas, e elas DEVEM continuar no plano ao recarregar, inclusive quando uma versão nova do manifesto tirar todas as tarefas de uma sessão não iniciada (muda a D-REQ-097, que removia a sessão).

**Ordem e condições (US-02)**
- **REQ-009:** Cada sessão não iniciada DEVE poder mudar de posição arrastando o cartão ou pelos botões "Subir" e "Descer". A numeração "Sessão N" DEVE seguir a ordem.
- **REQ-010:** Cada sessão não iniciada, exceto a primeira, DEVE oferecer "Começa depois de", com uma caixa por sessão anterior a ela. Nenhuma marcada é o padrão.
- **REQ-011:** SE, ao salvar, uma sessão começar depois de outra que esteja depois dela na ordem, ENTÃO o sistema DEVE recusar com "A Sessão N começa depois da Sessão M, que vem depois dela na ordem." (numeração do rascunho) e não salvar nada.
- **REQ-012:** O cartão de cada sessão não concluída DEVE mostrar as condições dela: "Começa depois de: Sessão 1, Sessão 2" para as marcadas, e "Aguarda a tarefa 01 (Sessão 1)" ou "Aguarda as tarefas 01, 04 (Sessões 1 e 2)" para as tarefas de que ela depende fora dela. Uma tarefa sem sessão aparece como "(sem sessão)".
- **REQ-013:** ENQUANTO alguma sessão marcada em "Começa depois de" não estiver Concluída (7.2), a sessão DEVE ficar Bloqueada com "Bloqueada: aguardando Sessão 1", ao lado da espera por tarefas que já existe (D-REQ-100). O "Iniciar mesmo assim" (D-REQ-102) DEVE listar as duas esperas: "A sessão depende de tarefas ou sessões não concluídas: 01, Sessão 1. Iniciar mesmo assim?".

**Execução (US-03)**
- **REQ-014:** ENQUANTO o plano salvo tiver ao menos uma sessão nunca iniciada, não houver alterações não salvas e não houver execução "Executando" ou "Pausada", a operadora DEVE ver "Executar o plano".
- **REQ-015:** QUANDO a operadora acionar "Executar o plano", o sistema DEVE checar o serviço de sessões, o clone da operadora e as skills, como o "Iniciar" faz. SE alguma checagem falhar, ENTÃO DEVE mostrar a mensagem do "Iniciar" para aquele motivo e não criar a execução.
- **REQ-016:** SE houver sessão sem tarefas quando a operadora acionar "Executar o plano", ENTÃO o sistema DEVE recusar com "A Sessão N está sem tarefas. Adicione tarefas ou remova a sessão.".
- **REQ-017:** ENQUANTO a execução estiver "Executando" e nenhuma sessão do agente desta feature estiver com o agente trabalhando (7.4), o sistema DEVE percorrer as sessões nunca iniciadas na ordem e iniciar sozinho a primeira que estiver Pronta (7.2). Sessões Bloqueadas são puladas.
- **REQ-018:** O início automático DEVE usar o agente, o modelo e o esforço da sessão, o prompt de execução da D-7.6 para as tarefas não concluídas dela, nenhum anexo, o modo de permissão padrão e o clone de quem executou ou retomou, em nome dessa pessoa. Fora isso, DEVE contar como um início comum da sessão (D-7.5, "Ver a conversa").
- **REQ-019:** QUANDO todas as sessões do plano estiverem Concluídas, a execução DEVE passar a "Plano concluído", e nenhuma sessão DEVE começar sozinha até uma nova execução.
- **REQ-020:** Enquanto houver execução, a operadora DEVE continuar podendo editar e salvar as sessões não iniciadas. Cada escolha da REQ-017 DEVE usar o plano salvo naquele momento.
- **REQ-021:** O "Iniciar" manual da Spec D DEVE continuar disponível durante a execução. Uma sessão iniciada à mão deixa de ser candidata, e a execução espera enquanto o agente dela trabalha (REQ-017).

**Pausa (US-04)**
- **REQ-022:** SE a sessão que a execução iniciou terminar a vez, encerrar ou falhar ao abrir com tarefas não concluídas, ENTÃO a execução DEVE pausar com "A Sessão N terminou com tarefas não concluídas: 01, 02." ou "A Sessão N falhou ao abrir: <motivo>.". A sessão do agente que terminou a vez continua aberta para a operadora responder.
- **REQ-023:** SE o início automático for recusado, ENTÃO a execução DEVE pausar com "Não foi possível iniciar a Sessão N. <mensagem do Iniciar para o motivo>", sem nova tentativa.
- **REQ-024:** SE nenhuma sessão nunca iniciada estiver Pronta, nenhum agente da feature estiver trabalhando e restarem sessões não Concluídas, ENTÃO a execução DEVE pausar com "Nenhuma sessão pode começar." seguido de uma frase por sessão que falta, como "A Sessão 2 aguarda 01.", "A Sessão 3 aguarda a Sessão 2." ou "A Sessão 1 foi encerrada com tarefas não concluídas.".
- **REQ-025:** SE chegar a vez de uma sessão sem tarefas (o conjunto de tarefas mudou), ENTÃO a execução DEVE pausar com a mensagem da REQ-016.
- **REQ-026:** SE quem executou deixar de ser a operadora da feature, o planejamento deixar de estar aprovado, o conjunto de tarefas ficar ilegível ou a pasta das tarefas mudar (aviso "Usar as tarefas de …"), ENTÃO a execução DEVE pausar com "A operadora da feature mudou.", "O planejamento não está mais aprovado.", "O conjunto de tarefas não pode ser lido." ou "A pasta das tarefas mudou. Revise o plano.".
- **REQ-027:** QUANDO a operadora acionar "Pausar", nenhuma sessão DEVE começar sozinha a partir daí, e a sessão em curso DEVE continuar. O plano mostra "Pausada por <nome>".
- **REQ-028:** QUANDO a operadora acionar "Retomar", a execução DEVE voltar a "Executando", em nome de quem retomou, e seguir pela REQ-017. Uma sessão encerrada com tarefas abertas não é reiniciada sozinha ("Iniciar de novo" continua manual). Uma sessão que só falhou ao abrir conta como nunca iniciada (D-B-39) e volta a ser candidata.
- **REQ-029:** O estado da execução ("Executando · Sessão N", "Pausada: …", "Pausada por …", "Plano concluído") DEVE aparecer para todos que veem o plano. "Executar o plano", "Pausar" e "Retomar" DEVEM aparecer só para a operadora (7.5).

## 7. Regras de negócio

### 7.1 Estados de uma sessão do plano
A tabela da D-7.5 continua, com duas mudanças:
- **Sem tarefas:** uma sessão não iniciada e vazia. Não pode ser iniciada.
- **Bloqueada** passa a incluir a espera por sessões (REQ-013).

### 7.2 Condições de início
Uma sessão nunca iniciada está **Pronta** quando:
- toda tarefa de que as tarefas dela dependem, fora dela, está Concluída (D-7.2); e
- toda sessão marcada em "Começa depois de" está **Concluída**, isto é, todas as tarefas dela estão Concluídas.

Uma sessão "Encerrada" com tarefa aberta não satisfaz a condição. A regra de posição das tarefas continua (§9), e "Começa depois de" só aponta para sessões anteriores (REQ-011). Por isso, não há ciclo de espera.

### 7.3 Estados da execução do plano
| De | Evento | Para |
|---|---|---|
| sem execução ou Plano concluído | "Executar o plano" (REQ-014 a REQ-016) | Executando |
| Executando | REQ-022 a REQ-026, ou "Pausar" | Pausada (com o motivo) |
| Pausada | "Retomar" | Executando |
| Executando | REQ-019 | Plano concluído |

Há no máximo uma execução por plano. "Pausar" numa execução já pausada e "Retomar" numa que já está executando não mudam nada.

### 7.4 Agente trabalhando
Uma sessão do agente desta feature, de qualquer propósito (rota, geração, plano, revisão), está com o **agente trabalhando** quando está abrindo, aguardando confirmação, executando ou com pergunta ou permissão pendente. Uma sessão que terminou a vez e aguarda mensagem, interrompida, encerrada ou que falhou ao abrir não conta (DEC-05).

### 7.5 Permissões
| Ação | Operadora | Membro ou admin |
|---|---|---|
| Ver sessões, condições e estado da execução | sim | sim, leitura |
| Criar, remover, ordenar e condicionar sessões; salvar | sim | não |
| Executar o plano, pausar, retomar | sim | não |

### 7.6 Limites
- Até 30 sessões por plano (D-7.8).
- Cada sessão tem **de 0 a 30** tarefas (antes, de 1 a 30).
- "Começa depois de" aceita qualquer subconjunto das sessões anteriores.

## 8. Casos de borda e erros

| ID | Situação | Comportamento esperado | Ref. |
|---|---|---|---|
| B-01 | "Executar o plano" acionado em duas abas | Uma só execução. A segunda recebe "O plano já está em execução." | 7.3 |
| B-02 | "Pausar" chega enquanto o worker inicia uma sessão | A sessão que já estava abrindo segue, e nada mais começa. | REQ-027 |
| B-03 | O serviço de sessões para durante a execução | A execução fica em "Executando" sem avançar e continua de onde estava quando o serviço volta. | REQ-017 |
| B-04 | O agente pergunta algo no meio da sessão | Conta como trabalhando: a execução espera, sem limite de tempo. | 7.4 |
| B-05 | A operadora encerra a sessão do agente com as tarefas concluídas | A sessão do plano fica Concluída, e a execução segue. | REQ-017 |
| B-06 | Há uma conversa da rota parada, aguardando mensagem | Não impede o início automático. | 7.4 |
| B-07 | Uma revisão automática está com o agente trabalhando | A execução espera. | 7.4 |
| B-08 | O manifesto muda e o plano fica desatualizado (D-REQ-097) | A execução continua com o plano salvo. O aviso da Spec D aparece. | REQ-020 |
| B-09 | A sessão que causou a pausa é removida pela operadora | Ao retomar, a escolha segue pela REQ-017. | REQ-028 |
| B-10 | Um replanejamento muda a rota ou desaprova o planejamento | A execução pausa (REQ-026). | REQ-026 |

## 9. Comportamento que não muda

- QUANDO uma tarefa ficar numa sessão anterior à de uma tarefa de que depende, o sistema DEVE CONTINUAR A recusar o salvamento com "A tarefa NN depende da MM, que está numa sessão posterior." (D-REQ-095).
- O sistema DEVE CONTINUAR A aceitar cada tarefa em uma só sessão, e até 30 sessões.
- Os atalhos "Todas numa sessão", "Uma sessão por tarefa" e "Mesmo modelo para todas" DEVEM CONTINUAR a funcionar. Os dois primeiros substituem as sessões não iniciadas, e as condições delas saem junto.
- "Iniciar", "Iniciar mesmo assim" (com o registro de quem forçou) e "Iniciar de novo" DEVEM CONTINUAR manuais e com o diálogo (D-US-14).
- Uma sessão iniciada DEVE CONTINUAR imutável (tarefas, escolha e, agora, condições).
- O plano DEVE CONTINUAR indo ao servidor só por "Salvar", com a recusa de conflito entre abas (D-DEC-25), e a tela DEVE CONTINUAR relendo o plano a cada 5 s.
- O Flow Dev DEVE CONTINUAR sem encerrar sozinho a sessão do agente que concluiu e sem fazer commit, push ou PR.
- A troca de pasta das tarefas ("Usar as tarefas de …") DEVE CONTINUAR como na Spec D.

## 10. Requisitos não funcionais

- **NFR-01 (latência):** a próxima sessão começa em até 10 s depois que a condição é atendida e nenhum agente trabalha. A tela mostra o novo estado em até 5 s depois disso.
- **NFR-02 (idempotência):** cada sessão do plano é iniciada no máximo uma vez por execução e retomada, mesmo com ticks repetidos ou reinício do worker.
- **NFR-03 (acessibilidade):** tudo o que se faz arrastando tem um caminho por teclado ("Adicionar tarefas", "Remover da sessão", "Subir" e "Descer"). Os alvos de soltura têm nome acessível, e as mudanças de estado da execução são anunciadas numa região `status`.

## 11. Premissas e dependências

- **P-1:** cada instalação tem um worker de sessões. A execução fica presa à máquina que aceitou "Executar o plano", como a revisão automática.
- **P-2:** o agente atualiza o `status` no `task_NN.md` ao terminar, como pede o prompt da D-7.6. Se não atualizar, a execução pausa depois de cada sessão (REQ-022).
- **P-3:** os planos atuais continuam válidos sem mudança. Eles não têm sessões vazias, condições nem execução.
- **Depende de:** Spec D (plano e início), Issue #8 (diálogo de tarefas, já implementado) e o worker da revisão automática (padrão de passo).

---

# Parte 2 — Técnica

## 12. Visão geral da solução

O plano passa a aceitar sessões vazias e a lista `after` de cada sessão, e a prontidão considera essas sessões. A execução vive em `task_session_plan_runs` e é conduzida por um passo novo do worker de sessões (`PlanRunStep`), com a mesma forma do `ReviewCycleStep`. Os procedimentos `run.start`, `run.pause` e `run.resume` seguem o `ReviewCycleService.start` (pré-voo, `hostId`, `requestKey`). Na tela, o seletor por tarefa dá lugar a sessões-molde com arrastar e soltar, condições e uma barra de execução.

## 13. Componentes e responsabilidades

| Componente | Responsabilidade | Local | Novo/Alterado |
|---|---|---|---|
| `planRules` / `planAfterRules` | Sessão vazia, `after` só para trás (REQ-011), limites 0–30 | `application/services/tasks-set/` | Alterado / Novo |
| `planReadiness` | Espera por sessões (7.2), estado "Sem tarefas" | idem | Alterado |
| `planReconciliation` | Não descartar sessões vazias | idem | Alterado |
| `planView`, `planTypes` | `after`, `waitingSessions`, `run` na visão | idem | Alterado |
| `drizzlePlanSave` | Gravar `after` numa segunda passada, depois de criar as sessões novas | `infra/database/dao/plans/` | Alterado |
| `PlanRunService` | `start`, `pause`, `resume` com pré-voo e transições por revisão | `application/services/plan-run/` | Novo |
| `planRunSelection` | Função pura: dada a visão, a execução e as sessões do agente, decide entre esperar, iniciar, pausar ou concluir | idem | Novo |
| `PlanRunStep` (+ guardas) | Passo do worker por execução "Executando" desta máquina | idem; registrado em `infra/sessionWorkerComposition.ts` | Novo |
| `PlanRunDao` | Ler e transicionar execuções; consultar o agente trabalhando | `application/database/dao/` + `infra/database/dao/plans/` | Novo |
| `SessionLauncher.launch` | Aceitar o propósito `plan_item` com `planItemId` | `application/services/terminal/sessionLauncher.ts` | Alterado |
| `routers/plan.ts`, `schemas/plan.ts`, controller | `save` com `after`; `run.start`, `run.pause`, `run.resume` | `packages/api/src/` | Alterado |
| `planErrorCatalog` | Novos motivos (§15) | `services/tasks-set/` | Alterado |
| Editor do plano | Molde, arrastar, remover, ordenar, condições | `apps/web/.../assigned-work/components/` (`PlanSessionCard`, `PlanTaskRow`, `UnassignedTasks`, `PlanNewSessionButton`, `PlanSessionTasksHost`) | Alterado |
| `PlanTaskSessionSelect` | — | idem | Removido |
| `PlanSessionAfterField`, `PlanSessionConditions`, `PlanRunBar`, `usePlanRun` | Condições e barra de execução | idem / `hooks/` | Novo |
| `planEditorModel`, `planSelectionModel`, `planCopy`, `planStateModel` | Novas operações do rascunho, textos, força com sessões | `assigned-work/` | Alterado |

## 14. Modelo de dados

A migration é a próxima livre: 0058, se a 0056 (Issue #7) e a 0057 (Issue #6) entrarem antes. Ela tem o `_rollback.sql` correspondente, como no resto de `packages/api/drizzle/`.

- **`task_session_plan_items`:** a check `task_ids_check` passa a `cardinality between 0 and 30`. Com zero itens, o padrão `^task_…$` fica desligado.
- **`task_session_plan_item_dependencies`** (nova):
  - colunas `item_id`, uma FK para itens com `on delete cascade`, e `after_item_id`, outra FK para itens com `on delete cascade`;
  - PK em (`item_id`, `after_item_id`) e check `item_id <> after_item_id`.
  - A posição relativa é validada no serviço, porque muda a cada salvamento.
- **`task_session_plan_runs`** (nova):
  - `id`; `plan_id` (FK com cascade, `unique`); `host_id`; `started_by` (FK para users);
  - `state` (check em `running`, `paused` ou `completed`); `pause_reason` (texto ou nulo); `paused_by` (FK nula para users);
  - `current_item_id` (FK nula, `set null`) e `current_session_id` (FK nula para `task_terminal_sessions`, `set null`);
  - `resume_count`, `revision` (inteiro, check ≥ 1), `request_key` (uuid), `created_at` e `updated_at`.
- **Dados existentes:** nada a converter. Os planos atuais não ganham condições nem execução.
- **Rollback:** apaga as sessões vazias e não iniciadas, apaga as duas tabelas e restaura a check de 1 a 30.

## 15. Interfaces e contratos

```ts
// schemas/plan.ts — item do save
item = { id?: uuid; taskIds: string[] /* 0..30 */; choice: AgentChoice; after: number[] /* posições 1-based de itens anteriores do mesmo save */ }

// planView — acréscimos
PlanItemView += { after: string[] /* ids */; waitingSessions: string[] /* ids não concluídos de after */ }
PlanView += { run: PlanRunView | null }
type PlanRunView = { state: "running" | "paused" | "completed"; reason: string | null; pausedBy: string | null; currentItemId: string | null; revision: number }

// routers/plan.ts — novos (protectedProcedure, operadora via requirePlanOperator)
tasks.plan.run.start({ projectId, taskId, requestKey })   -> PlanRunView
tasks.plan.run.pause({ projectId, taskId, revision })     -> PlanRunView
tasks.plan.run.resume({ projectId, taskId, revision })    -> PlanRunView
```

| Motivo novo | Código | Mensagem |
|---|---|---|
| `plan_after_order` | BAD_REQUEST | REQ-011 (no `message`) |
| `plan_run_session_empty` | PRECONDITION_FAILED | REQ-016 |
| `plan_run_nothing_to_start` | PRECONDITION_FAILED | "Não há sessão a executar no plano." |
| `plan_run_active` | CONFLICT | "O plano já está em execução." |
| `plan_run_state` | CONFLICT | "A execução mudou em outra aba. Recarregue." |

O `start` também propaga os motivos do pré-voo do `open` (`session_service_offline`, `checkout_missing`, `checkout_invalid`, `skill_missing`), com as mensagens atuais. O `LaunchInput` de `SessionLauncher.launch` ganha a variante `{ purpose: "plan_item"; planItemId }` no lugar de `reviewCycleId`. A `requestKey` é derivada de (`runId`, `itemId`, `resume_count`), como faz o `reviewOpenRequestKey`.

## 16. Fluxos principais

**Salvar.** O `validatePlan` checa, nesta ordem:
1. sessão iniciada inalterada, agora incluindo o `after`;
2. limites;
3. duplicata;
4. tarefa desconhecida;
5. ordem das tarefas;
6. `planAfterRules`.

A gravação escreve os itens na ordem, mapeia posição → id e regrava as dependências dos itens não iniciados.

**Executar.** O `run.start` exige a operadora e recusa pela REQ-016, ou se não houver sessão nunca iniciada. Em seguida roda o pré-voo do `TerminalOpenGuard` e grava `running` com `host_id`, `started_by` e `request_key`, de forma idempotente. Uma execução `completed` é reaproveitada, com `resume_count` + 1.

**Tick** (a cada 1 s, para as execuções `running` desta máquina):
1. Guardas da REQ-026.
2. Espera se algum agente da feature trabalha (7.4).
3. Pausa pela REQ-022 se a sessão corrente não está Concluída e já parou.
4. O `planRunSelection` percorre as sessões nunca iniciadas: uma vazia pausa (REQ-025), uma Pronta é iniciada por `launch` e vira a corrente (REQ-023 se recusada), uma Bloqueada é pulada.
5. Sem candidata, conclui (REQ-019) ou pausa (REQ-024).

Toda transição usa `revision`, inclusive `pause` e `resume` (B-02).

## 17. Decisões técnicas

### DEC-01 — A execução roda no worker de sessões
- **Decisão:** um `TickStep` ao lado do `ReviewCycleStep`.
- **Alternativas consideradas:**
  - A tela dispara o próximo "Iniciar": exigiria a aba aberta.
  - Um job separado: infraestrutura nova sem ganho.
- **Consequências:** reaproveita o laço, o launcher e a ligação com a máquina. Latência de 1 tick.

### DEC-02 — Estado da execução em tabela 1:1 com o plano
- **Decisão:** a tabela `task_session_plan_runs`, com `revision` própria.
- **Alternativas consideradas:** colunas em `task_session_plans`. As transições do worker disputariam a `version` do salvamento entre abas (D-DEC-25), e cada pausa recusaria a edição da operadora.
- **Consequências:** uma tabela a mais. Salvamento e execução não se bloqueiam.

### DEC-03 — Condições em tabela de ligação com cascata
- **Decisão:** `task_session_plan_item_dependencies`.
- **Alternativas consideradas:**
  - `uuid[]` no item: sem integridade, com limpeza manual.
  - Posições: mudam a cada reordenação.
- **Consequências:** a REQ-006 vem da cascata. A ordem é validada no serviço.

### DEC-04 — `after` vai por posição no salvamento
- **Decisão:** o salvamento manda posições do próprio save, e o servidor converte em ids.
- **Alternativas consideradas:** ids. As sessões novas ainda não têm id, e seria preciso salvar duas vezes.
- **Consequências:** a validação da REQ-011 fica trivial.

### DEC-05 — "Agente trabalhando" exclui a sessão ociosa
- **Decisão:** contam só os estados abrindo, aguardando confirmação, executando e com pergunta pendente.
- **Alternativas consideradas:** qualquer sessão não encerrada, como o `hasActiveSession`. Como a sessão fica em `waiting` depois de cada vez, uma conversa ociosa travaria a execução para sempre. A intenção de "uma por vez" é evitar dois agentes editando a pasta juntos.
- **Consequências:** B-06. Se a operadora escrever numa conversa ociosa durante a execução, dois agentes podem trabalhar juntos. Isso é aceito, por ser ação dela.

### DEC-06 — Arrastar e soltar nativo do HTML
- **Decisão:** `draggable`, `dragover` e `drop`, com os caminhos de teclado da NFR-03.
- **Alternativas consideradas:** `@dnd-kit`, uma dependência nova só para isso, numa tela de desktop.
- **Consequências:** sem arrasto por toque. A Playwright cobre com `dragTo`.

### DEC-07 — O início automático usa `SessionLauncher.launch`
- **Decisão:** é o caminho das sessões da revisão automática: sem diálogo, `requestKey` determinística e permissão padrão.
- **Alternativas consideradas:** o `open` do controller, que exige o principal da requisição.
- **Consequências:** NFR-02. A marcação de "iniciada" é igual à do "Iniciar" manual.

## 18. Segurança, privacidade e permissões

- `save`, `run.start`, `run.pause` e `run.resume` passam por `requirePlanOperator` no controller, e não só pela tela.
- O worker abre a sessão em nome de `started_by` e só enquanto essa pessoa é a operadora (REQ-026). Assim, ninguém usa o clone de outra pessoa depois de perder a feature.
- Nenhum dado sensível novo. O `pause_reason` guarda mensagens do produto, sem saída do agente.

## 19. Observabilidade

O `PlanLog` ganha os eventos `run_started`, `run_session_started` (com item, sessão, agente e modelo), `run_paused` (com um código de motivo e o item), `run_resumed` e `run_completed`, com `taskId` e `runId`. Isso basta para responder por que a execução parou.

## 20. Migração, rollout e reversão

1. Aplicar a migration (§14) e depois publicar API, worker e web juntos. O worker antigo ignora as execuções, e o novo exige a tabela.
2. Sem flag. A função só age por "Executar o plano".
3. Reversão: pausar as execuções, voltar o código e rodar o rollback. As sessões vazias se perdem, e as condições e o histórico de execuções também.

## 21. Riscos técnicos

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| Duas transições concorrentes (worker e "Pausar") | média | sessão iniciada após a pausa | Transição por `revision` (B-02), teste com Postgres real |
| Início duplicado por reinício do worker | baixa | duas sessões iguais | `requestKey` determinística (NFR-02) |
| Agente não atualiza o `status` | média | pausa a cada sessão | A mensagem da REQ-022 lista as tarefas; P-2 |
| Arrasto nativo inconsistente entre navegadores | baixa | só o teclado funciona | Caminhos de teclado e e2e com `dragTo` |
| Arquivos acima de 100 linhas no editor do plano | média | violar `code-standards` | Componentes novos separados (§13) |

---

# Parte 3 — Verificação

## 22. Estratégia de testes

Segue a skill `software-testing`: uma ficha por risco, com a fronteira real declarada.
- **Ferramentas:** Vitest em `packages/api` (`test` e `test:integration` com Postgres descartável) e em `apps/web` (RTL), e Playwright em `apps/web/e2e`.
- **Regras puras:** `planAfterRules`, `planReadiness` e `planRunSelection` são testadas pela API pública, com oráculos tirados das REQs.
- **Banco real:** salvamento, cascata, check de 0 a 30, transições por `revision` e idempotência da execução, porque os riscos são SQL e concorrência.
- **Dublês:** só o runtime do agente, com o roteiro de sessão falsa já usado nos e2e, e o relógio do worker.
- **Jornada e2e:** uma só (V-10). O conjunto de tarefas é semeado direto nos artefatos, porque a geração pela sessão falsa ainda tem a lacuna do V-41 da Spec D.

**Sem prova automática:** um agente real (Claude e Codex) marcando o `status` e terminando a vez sem ninguém na tela, e pedidos de permissão no meio de uma sessão automática.

## 23. Matriz de verificação

| ID | Cobre | Falha que detecta | Fronteira real | Casos (resumo) |
|---|---|---|---|---|
| V-01 | US-01 cen. 4, US-02 cen. 4, REQ-008, REQ-011, 7.6, §9 (regra de posição, iniciada imutável) | `after` para frente aceito; sessão vazia recusada; regra de tarefas afrouxada; `after` de sessão iniciada alterado | `validatePlan` pura | vazia aceita; `after` para trás aceito e para frente recusado com a mensagem; ordem de tarefas recusada; iniciada com `after` mudado → `plan_item_started` |
| V-02 | REQ-012, REQ-013, 7.1, 7.2 | sessão "Encerrada" liberando a dependente; espera por sessão ignorada; vazia contando como Concluída | `planReadiness`/`planView` puras | Bloqueada por sessão; liberada quando todas as tarefas estão concluídas; Encerrada não libera; "Sem tarefas"; `waitingSessions` |
| V-03 | REQ-006, REQ-008, REQ-009, US-01 cen. 3, US-02 cen. 1 e 3 | `after` de sessão nova perdido; condição órfã depois de remover; vazia some ao recarregar | `PlanSaveService` + Postgres de teste | salva e relê vazia; `after` para sessão criada no mesmo save; reordena; remove a sessão e a condição some; rollback da migration sem erro |
| V-04 | REQ-014–016, 7.3, 7.5, B-01, §15 | membro executando; pré-voo ignorado; duas execuções | `PlanRunService` + Postgres; guard dublado | operadora inicia; membro → `plan_control_denied`; sessão vazia → `plan_run_session_empty`; serviço offline → `session_service_offline`; duas abas → uma execução; `completed` reaproveitada |
| V-05 | REQ-017, REQ-019, REQ-021, B-08, REQ-022–025, US-03 cen. 4, US-04 cen. 1 e 4, 7.4, B-03–B-07 | inicia com agente trabalhando; conversa ociosa travando; pula a ordem; não pausa com tarefa aberta | `planRunSelection` pura | espera em running, asking e opening; não espera em waiting e interrupted; escolhe a primeira Pronta e pula a Bloqueada; pausa por incompleta, falha ao abrir, vazia e nenhuma pode; conclui |
| V-06 | REQ-018, REQ-020, REQ-023, B-09, REQ-026–028, B-02, B-10, NFR-02 | sessão aberta depois de "Pausar"; início duplicado; clone de quem perdeu a feature | `PlanRunStep` + Postgres; `SessionLauncher` com runtime dublado; relógio controlado | tick inicia com prompt, escolha e clone de `started_by`; tick repetido não duplica; pausa concorrente vence; perda da operadora pausa; retomar reabre a que falhou ao abrir e não a encerrada |
| V-07 | REQ-001, REQ-003–007, REQ-009, REQ-010, §9 (atalhos) | sessão vazia descartada no rascunho; condição apontando para trás perdida ao reordenar; `after` mal convertido | `planEditorModel`/`planSelectionModel` puras | nova vazia no fim; mover por soltura; remover tarefa mantém a sessão; remover sessão limpa condições; subir/descer; opções só anteriores; `toSaveInput` → posições; atalhos limpam condições |
| V-08 | US-01 cen. 1–3, US-02 cen. 2–3, REQ-002, REQ-012, REQ-013, NFR-03 | seletor por tarefa ainda presente; condição não exibida; arrastar sem alternativa de teclado | componentes (RTL) | texto de vazia; sem `Sessão da tarefa`; soltura (`dragStart`/`drop`) move; "Remover da sessão"; "Começa depois de"; "Aguarda a tarefa 01 (Sessão 1)"; confirmação de força com sessão; leitura para membro |
| V-09 | REQ-014, REQ-029, US-04 cen. 2–3 | botão com alterações não salvas; estado sem anúncio; membro com botões | `PlanRunBar` (RTL), cliente dublado | Executar oculto quando sujo; "Executando · Sessão 1"; "Pausada por Ana" e Retomar; mensagem de recusa; membro só lê |
| V-10 | US-01–US-03 ponta a ponta, NFR-01 | partes não conectadas: o worker não pega a execução, a tela não reflete | UI + API + Postgres + worker, com a sessão do agente roteirizada | cria duas sessões vazias, arrasta a 01 e adiciona a 02, salva, executa; o roteiro conclui a 01; a Sessão 2 começa sozinha; "Plano concluído" |
| V-11 | §9 (regressão Spec D e Issue #8) | "Iniciar" manual, força e "Iniciar de novo" quebrados | testes atuais ajustados (`ExecutionPlanEditor*`, `PlanSessionCard`, `planSelectionModel`, `purposePlanItem`) | os casos atuais que continuam válidos passam sem mudar o oráculo |

## 24. Definição de pronto

- `pnpm --dir packages/api test` e `pnpm --dir packages/api test:integration` passam.
- `pnpm --dir apps/web test` passa.
- `pnpm typecheck` e `pnpm lint` passam.
- `pnpm --dir apps/web e2e:prepare` (depois da migration nova) e o spec do V-10 com `pnpm --dir apps/web test:e2e` passam, sem `fixme`.
- A migration e o rollback rodam no banco de teste.
- Nenhum `[PRECISA ESCLARECER]` restante, e a spec atualizada com o que mudar na implementação.

---

## Questões em aberto

Nenhuma. A operadora respondeu as pendências do planejamento em 2026-11-26 (veja as seções 4, 7.2, 7.3, REQ-017 e REQ-022). Os planos existentes seguem válidos (P-3).

## Sugestões fora do escopo

- Iniciar a revisão automática (Issue #9) quando a execução chegar a "Plano concluído", fechando o ciclo sem clique.
- Notificar a operadora (push) quando a execução pausar, já que ela pode não estar olhando.
- Encerrar sozinho a sessão do agente cuja sessão do plano ficou Concluída, para liberar recursos da máquina.
- Dar nome às sessões ("Backend", "Tela") além do número.

## Histórico

- 2026-11-26 — Criação da spec a partir da Issue #11 e de três rodadas de perguntas.
- 2026-11-26 — US-04 cen. 4 alinhado à REQ-024 (uma frase por sessão que falta, na ordem), por decisão da operadora na geração das tarefas.
- 2026-11-26 — Implementação (tarefas 01–07). O que mudou em relação ao texto: a mensagem do "Iniciar" para o serviço parado é a atual do produto ("O serviço de sessões do Flow Dev não está rodando. Inicie o Flow Dev com pnpm dev e tente de novo."); antes de pausar pela REQ-022/REQ-024, o worker força a captura dos arquivos da sessão corrente, porque a sessão passa a aguardar antes de o `task_NN.md` ser capturado; "Retomar" limpa a sessão corrente da execução; a confirmação de força usa sempre "tarefas ou sessões não concluídas"; a migration é a 0058.

