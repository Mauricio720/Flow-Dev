# Spec: Atribuir a mim e colocar em Ready ao criar a Issue

> **Status:** Em revisão · **Data:** 2026-11-25 · **Nível:** L3 spec-first · **Origem:** Issue #10 (rota Tech Spec, complexidade Média)
> **Contexto lido:**
> - **Pedido original**, em `task_messages`: "Ao criar uma intenção, me dar a possibilidade de ja assinar pra mim e nisso ja colocar em ready".
> - **Produto:** `PRODUCT.md`.
> - **Publicação:** `taskPublicationController.ts`, `taskPublicationWorkerController.ts`, `taskPublicationApproval.ts`, `taskPublicationState.ts`, `githubIssueGateway.ts`.
> - **Quadro:** `projectBoardGateway.ts`, `githubProjectBoardGateway.ts`, `backlogPlacementService.ts`, `boardBackfillService.ts`.
> - **Fila Ready:** `assignedIssueRules.ts`.
> - **Tela:** `PublicationPreview.tsx`, `PublishedResult.tsx`, `usePublication.ts`, `taskCopy.ts`.
> - **GitHub REST:** [Create an issue](https://docs.github.com/en/rest/issues/issues#create-an-issue) e [Assignees](https://docs.github.com/en/rest/issues/assignees).

## Resumo para revisão

- **O que muda:** a prévia da publicação ganha a opção "Atribuir a mim e colocar em Ready", desmarcada. Com ela marcada, a Issue nasce no GitHub com a pessoa autora como responsável e entra na coluna Ready do quadro, em vez de Backlog. Assim, ela já aparece em "Atribuídas a você em Ready".
- **Por quê:** hoje, entre publicar e reivindicar, a pessoa precisa ir ao GitHub, se atribuir e mover a Issue para Ready. A própria Issue #10 foi atribuída assim.
- **Decisões principais:**
  - **DEC-01:** o responsável vai no próprio pedido de criação, e a resposta do GitHub confirma a atribuição.
  - **DEC-02:** quadro, coluna Ready e permissão de escrita são conferidos antes de criar. Se faltar algum, a publicação é recusada com erro (escolha do usuário).
  - **DEC-03:** o contrato do quadro passa a receber o status de destino.
  - **DEC-04:** o resultado é gravado na tentativa de publicação, e nada é refeito nem desfeito depois (escolha do usuário).
- **Riscos principais:**
  - O GitHub descarta o responsável em silêncio para contas sem escrita (mitigação: DEC-02 e REQ-010).
  - Automações do quadro podem mudar o status de itens novos, como já acontece com o Backlog (mitigação: smoke V-10).
- **Como vamos verificar:** regras puras, gateways contra HTTP controlado, publicação e worker no Postgres de teste com GitHub simulado, telas com Testing Library e um smoke manual num quadro de teste.
- **Pendências:** nenhuma. A P-01 registra como as respostas curtas foram lidas.

---

# Parte 1 — Produto

## 1. Contexto e problema

Ao clicar em "Criar Issue", a pessoa autora aprova a prévia. O Flow Dev cria a Issue com o título, o corpo e as labels aprovados, sem responsável, e a coloca na coluna Backlog do quadro do projeto com os pontos de prioridade do draft. Colocar no quadro é melhor esforço: se falhar, a Issue continua publicada e ninguém é avisado.

A fila "Atribuídas a você em Ready", em Trabalho atribuído, e a reivindicação só aceitam Issues abertas, na coluna Ready e com a conta do GitHub da pessoa entre os responsáveis. Por isso existe hoje um passo manual no GitHub entre publicar e reivindicar.

## 2. Usuários e papéis

- **Pessoa autora:** administradora do projeto e única que publica a própria tarefa. Marca a opção e é quem fica atribuída.
- **Demais membros:** veem a Issue publicada e o resultado da atribuição. Não publicam.

Não há papel novo, e a opção não atribui outras pessoas.

## 3. Objetivos

- Publicar a Issue já atribuída a si e em Ready, sem abrir o GitHub.
- Saber, no resultado da publicação, se a atribuição e o Ready aconteceram.
- Nunca criar a Issue quando a opção marcada não puder ser cumprida.

## 4. Fora de escopo

- **Reivindicar sozinho:** a reivindicação explícita é princípio do produto.
- **Atribuir outras pessoas** ou mais de uma pessoa.
- **Mudar a atribuição ou o status de uma Issue que já existe**, seja para refazer uma falha, seja numa Issue antiga. Decisão do usuário: "Se a issue já foi criada, não pode ser possível alterar no projeto".
- **Escolher a opção no começo da intenção:** ela fica na prévia, junto da aprovação.
- **Exigir a coluna Ready ao vincular o quadro:** quem não usa a opção não precisa da coluna.
- **Resolver publicações incertas:** quando a resposta da criação se perde, nada vai ao quadro, como hoje.

## 5. Histórias de usuário

### US-01 — Publicar já atribuída a mim e em Ready (P1)

Como pessoa autora, quero marcar uma opção na prévia e criar a Issue já atribuída a mim e em Ready, para reivindicá-la logo em Trabalho atribuído.

- **Teste independente:** num quadro com Ready e com uma conta que tem escrita, publicar com a opção e ver a Issue na fila da pessoa.
- **Cenários de aceite:**
  1. **Dado** o quadro com Backlog, Ready e In Progress e a conta @ana com escrita no repositório, **quando** Ana marca a opção e clica em "Criar Issue", **então** a Issue #41 é criada com @ana como única responsável, fica em Ready com os 5 pontos de prioridade do draft, e o resultado mostra R-1.
  2. **Dado** o cenário 1, **quando** Ana abre Trabalho atribuído, **então** a #41 aparece em "Atribuídas a você em Ready" e ainda pede a reivindicação.
  3. **Dado** que Ana não marca a opção, **quando** ela cria a Issue, **então** a Issue nasce sem responsável e vai para Backlog, como hoje.

### US-02 — Erro claro quando falta estrutura (P1)

Como pessoa autora, quero um erro que diga o que falta quando a opção não pode ser cumprida, para ajustar o quadro ou publicar sem ela.

- **Teste independente:** num quadro sem Ready, publicar com a opção e ver que nenhuma Issue foi criada.
- **Cenários de aceite:**
  1. **Dado** um quadro com Backlog e In Progress, sem Ready, **quando** Ana cria a Issue com a opção, **então** nenhuma Issue é criada, a tela mostra M-2 e o draft continua intacto.
  2. **Dado** um projeto sem quadro vinculado, **quando** Ana cria a Issue com a opção, **então** nada é criado e a tela mostra M-1.
  3. **Dado** que @bruno só tem leitura (cria Issues, mas não atribui), **quando** ele cria a Issue com a opção, **então** nada é criado e a tela mostra M-3.
  4. **Dado** o erro do cenário 1, **quando** Ana refaz a prévia e cria a Issue sem a opção, **então** a Issue vai para Backlog, como hoje.

### US-03 — Saber o que faltou depois da criação (P2)

Como pessoa autora, quero ver no resultado o que não se confirmou depois de a Issue ser criada, para terminar no GitHub.

- **Teste independente:** simular a resposta do GitHub sem o responsável e conferir a mensagem.
- **Cenários de aceite:**
  1. **Dado** que o GitHub cria a #42 sem manter @ana como responsável, **então** a #42 vai para Backlog e o resultado mostra R-2.
  2. **Dado** que a #43 foi criada com @ana, mas as duas tentativas de colocá-la em Ready falham, **então** a Issue continua publicada e atribuída, o resultado mostra R-3 e não há botão para refazer.
  3. **Dado** que a publicação acabou de terminar, **enquanto** o resultado da atribuição não chega, **então** a tela mostra R-0 e troca pela mensagem final sem recarregar.

## 6. Requisitos funcionais

**Opção e criação**
- **REQ-001** (US-01): ENQUANTO a prévia da publicação estiver pronta, o sistema DEVE oferecer à pessoa autora a opção "Atribuir a mim e colocar em Ready", desmarcada.
- **REQ-002** (US-01): QUANDO a pessoa criar a Issue com a opção marcada e as conferências da REQ-006 passarem, o sistema DEVE criar a Issue com a conta de RN-02 como única responsável.
- **REQ-003** (US-01): QUANDO o GitHub confirmar essa atribuição, o sistema DEVE colocar a Issue na coluna Ready, com os pontos de prioridade do draft, em vez de Backlog.
- **REQ-004** (US-01): O sistema DEVE atribuir somente a conta de RN-02, sem aceitar conta indicada pela tela.

**Recusa antes de criar**
- **REQ-005** (US-02): SE a opção estiver marcada e faltar o quadro vinculado, a coluna Ready ou a permissão de escrita, ENTÃO o sistema DEVE recusar a publicação sem criar a Issue, com a mensagem do primeiro motivo na ordem de RN-05.
- **REQ-006** (US-02): O sistema DEVE fazer as conferências da REQ-005 ao aceitar a publicação e de novo imediatamente antes de criar a Issue.
- **REQ-007** (US-02): SE a conferência antes de criar recusar, ENTÃO o sistema DEVE devolver a tarefa para revisão, sem criar a Issue, com a mesma mensagem.
- **REQ-008** (US-02): SE o quadro não puder ser lido durante uma conferência, ENTÃO o sistema DEVE recusar sem criar a Issue, com a mensagem atual de GitHub indisponível ou de limite de consultas.
- **REQ-009** (US-02): QUANDO a publicação for recusada por REQ-005, REQ-007 ou REQ-008, o sistema DEVE manter o draft e a revisão intactos e permitir criar a Issue sem a opção.

**Depois de criar**
- **REQ-010** (US-03): SE a Issue for criada sem a conta de RN-02 entre os responsáveis, ENTÃO o sistema DEVE colocá-la em Backlog, como hoje, e registrar "não atribuída".
- **REQ-011** (US-03): SE a colocação em Ready falhar nas duas tentativas, ENTÃO o sistema DEVE manter a Issue publicada e atribuída e registrar "fora de Ready".
- **REQ-012** (US-01, US-03): QUANDO o resultado da atribuição for registrado, o sistema DEVE mostrá-lo no resultado da publicação com a mensagem de RN-06.
- **REQ-013** (US-03): ENQUANTO a Issue publicada com a opção estiver sem resultado registrado, por até 2 minutos depois da criação, o sistema DEVE mostrar R-0 e trocá-lo pela mensagem final sem recarregar a página.
- **REQ-014** (US-03): SE passarem 2 minutos da criação sem resultado registrado, ENTÃO o sistema DEVE mostrar R-4.
- **REQ-015** (US-03): Depois que a Issue foi criada, o sistema DEVE deixar a atribuição e o status como ficaram, sem desfazer a publicação e sem oferecer refazê-los.

## 7. Regras de negócio

- **RN-01:** a opção vale para uma publicação e começa desmarcada a cada prévia. Nada é lembrado entre tarefas.
- **RN-02:** a conta atribuída é a conta do GitHub autorizada por quem publica, a mesma de "Criada por" na prévia.
- **RN-03:** a coluna Ready é a opção do campo Status cujo nome, sem espaços nas pontas e sem diferenciar maiúsculas, é "Ready". É a mesma regra da fila Ready: "ready" e " Ready " valem, "Pronto" não.
- **RN-04:** a opção exige permissão de escrita no repositório. Com só leitura, a pessoa cria a Issue, mas o GitHub descarta o responsável em silêncio.
- **RN-05:** as conferências seguem esta ordem, com estas mensagens:

| ID | Falta | Mensagem |
|---|---|---|
| M-1 | Quadro vinculado | "Este projeto não tem um quadro do GitHub vinculado, então a Issue não pode ir para Ready. Uma pessoa administradora vincula o quadro em Configurações. Você também pode criar a Issue sem essa opção." |
| M-2 | Coluna Ready | "O quadro do projeto não tem a coluna Ready. Crie a coluna no quadro do GitHub ou crie a Issue sem essa opção." |
| M-3 | Escrita | "Para se atribuir à Issue, sua conta do GitHub precisa de permissão de escrita no repositório. Crie a Issue sem essa opção ou peça essa permissão." |

- **RN-06:** só há resultado de atribuição em publicações com a opção. Ele vai de pendente a um estado final e não muda mais:

| ID | Estado | Mensagem no resultado |
|---|---|---|
| R-0 | Pendente | "Atribuindo a você e colocando em Ready…" |
| R-1 | Pronta | "Atribuída a você e colocada em Ready. Ela já aparece em Trabalho atribuído, em “Atribuídas a você em Ready”, para você reivindicar." |
| R-2 | Não atribuída | "O GitHub não manteve você como responsável pela Issue, então ela foi para Backlog. Atribua-se e mova a Issue para Ready no GitHub." |
| R-3 | Fora de Ready | "Atribuída a você, mas não foi possível colocar a Issue em Ready. Mova-a para Ready no quadro do GitHub." |
| R-4 | Sem confirmação | "Não foi possível confirmar a atribuição e o Ready desta Issue. Confira no GitHub." |

## 8. Casos de borda e erros

| ID | Situação | Comportamento esperado | Ref. |
|---|---|---|---|
| B-01 | Duplo clique ou repetição do mesmo pedido | Uma única Issue, com a escolha do primeiro pedido. Repetir o pedido com outra escolha é recusado como pedido reutilizado. | REQ-002 |
| B-02 | O quadro perde a coluna Ready, ou é desvinculado, entre aceitar e criar | A conferência antes de criar recusa com M-2 ou M-1, e nada é criado. | REQ-007 |
| B-03 | A escrita é retirada entre aceitar e criar | Recusa com M-3. Se a conferência passar e o GitHub ainda descartar o responsável, vale a REQ-010. | REQ-007, REQ-010 |
| B-04 | Publicação incerta (a resposta da criação se perdeu) | Nada vai ao quadro e nenhum resultado é registrado, como hoje. | §9 |
| B-05 | Uma automação do quadro muda o status de itens novos | Fica fora do controle do Flow Dev, como com o Backlog. O resultado diz o que o Flow Dev fez. | V-10 |
| B-06 | O quadro tem Ready, mas não tem In Progress | Publica normalmente. A reivindicação depois mostra o aviso que já existe. | §9 |

## 9. Comportamento que não muda

- QUANDO a Issue for criada sem a opção, o sistema DEVE CONTINUAR A enviar o mesmo conteúdo de hoje (título, corpo e labels, sem responsável) e a colocá-la em Backlog com os pontos de prioridade, deixando a falha no quadro só no log.
- QUANDO o quadro for vinculado, o sistema DEVE CONTINUAR A exigir só a coluna Backlog. A correção em lote continua colocando as Issues em Backlog.
- QUANDO a Issue for publicada, o sistema DEVE CONTINUAR A exigir a reivindicação explícita, sem iniciar planejamento nem execução.
- O sistema DEVE CONTINUAR A deixar só a pessoa autora e administradora publicar.
- QUANDO a prévia for pedida, o sistema DEVE CONTINUAR A fazer as mesmas consultas ao GitHub.
- QUANDO a publicação for incerta, recusada pelo GitHub ou verificada em "Verificar agora", o sistema DEVE CONTINUAR A seguir o fluxo atual.

## 10. Requisitos não funcionais

- **NFR-01 (segurança):** a conta atribuída é definida no servidor. O pedido da tela só diz se a opção está marcada e nunca leva login nem identificador de conta.
- **NFR-02 (cota do GitHub):** o aceite reaproveita a leitura do quadro que já faz. A publicação com a opção acrescenta só uma leitura do quadro, antes de criar. Abrir a tarefa não consulta o GitHub para mostrar o resultado.
- **NFR-03 (tempo):** o resultado final aparece sem recarregar em até 15 s depois de a Issue aparecer como publicada, o intervalo atual de releitura da tela.
- **NFR-04 (acessibilidade):** a opção é uma caixa de seleção com rótulo visível, operável por teclado. As recusas são anunciadas como alerta, e o resultado como status.

## 11. Premissas e dependências

- **P-01:** as respostas do usuário em 2026-11-25 foram lidas assim:
  - "Sim": a opção fica na prévia, como recomendado.
  - "já atribui pelo GitHub": vale o responsável no GitHub.
  - "pode dar o erro por não conter a estrutura desejada": a falta de quadro, de coluna Ready ou de escrita recusa a publicação. A pergunta citava as três causas.
  - "Se a issue já foi criada, não pode ser possível alterar no projeto": nada é refeito nem desfeito depois da criação.
- **P-02:** a segunda tentativa automática de colocar no quadro, que já existe para o Backlog, vale para o Ready. Ela faz parte da própria publicação; não é uma alteração posterior.
- **P-03:** pela documentação do GitHub, só quem tem escrita define responsáveis na criação de uma Issue.
- **P-04:** a feature depende do quadro vinculado e da autorização de repositório com escopo de projetos, que já existem.

---

# Parte 2 — Técnica

## 12. Visão geral da solução

A escolha viaja com a aprovação. `tasks.publish` recebe `assignToSelf`, o controlador faz as conferências da REQ-005 com dados que já lê, e a tentativa (`task_publication_attempts`) guarda a escolha. O worker refaz a conferência e cria a Issue com `assignees: [login]` (DEC-01). Em seguida, confirma o responsável na resposta, coloca a Issue no status de destino (DEC-03) e grava o resultado (DEC-04). O passo a passo está em §16.

Há um precedente no mesmo controlador: `image_permission_denied` já recusa a publicação quando um recurso exige escrita e a conta não tem (`taskPublicationController.ts:50`).

## 13. Componentes e responsabilidades

| Componente | Responsabilidade | Local | Novo/Alterado |
|---|---|---|---|
| Regra da opção | Função pura: quadro, status e escrita → motivo de RN-05 ou `null` | `application/services/tasks/readyAssignmentRules.ts` | Novo |
| Serviço de atribuição | `assertPossible` (aceite e worker) e `settle` (confere o responsável, escolhe Ready ou Backlog, grava o resultado) | `application/services/tasks/readyAssignmentService.ts` | Novo, porque o worker já tem 91 linhas |
| Serviço do quadro | `BacklogPlacementService` vira `BoardPlacementService`: lê os status e coloca no status pedido, com 2 tentativas | `application/services/projects/` | Alterado |
| Contrato e gateway do quadro | Status de destino (DEC-03) | `projectBoardGateway.ts`, `githubProjectBoardGateway.ts` | Alterado |
| Regra do nome Ready | Uma só função para a publicação e para a fila (RN-03) | `projectBoardRules.ts`, `assignedIssueRules.ts` | Alterado |
| Gateway de Issues | `assignees` opcional na criação e responsáveis no recibo. O arquivo já tem 100 linhas, então o recibo vai para `githubIssueReceipt.ts` | `issueGateway.ts`, `infra/github/` | Alterado |
| Controlador e worker de publicação | Recebem a escolha, fazem as conferências e chamam `settle` no lugar de `placeInBacklog` | `taskPublicationController.ts`, `taskPublicationWorkerController.ts` | Alterado |
| Persistência | Colunas de §14, a escolha gravada em `approve` e lida na reivindicação do worker, a gravação do resultado e a leitura de `publication` | `taskPublicationApproval.ts`, `drizzleTaskPublicationWorkerDao.ts`, `drizzleTaskReadDao.ts`, schema | Alterado |
| Entrada tRPC e erros | `assignToSelf` e três motivos novos | `schemas/tasks.ts`, `taskErrors.ts`, `taskErrorMapper.ts` | Alterado |
| Tela | Caixa de seleção na prévia, envio da escolha e mensagens M e R | `PublicationPreview.tsx`, `usePublication.ts`, `publicationClient.ts`, `PublishedResult.tsx`, `taskCopy.ts` | Alterado |

## 14. Modelo de dados

A migration **0054** vem com `_rollback.sql`. A 0052 e a 0053 estão reservadas pelas specs das Issues #6 e #9; confira o journal antes de criar. Ela acrescenta a `task_publication_attempts`:

- `assign_to_self boolean NOT NULL DEFAULT false`: a escolha aprovada.
- `ready_assignment text NULL`: o resultado, com `CHECK (ready_assignment IN ('ready','not_assigned','ready_failed'))` e `CHECK (ready_assignment IS NULL OR assign_to_self)`.

As linhas existentes ficam com `false` e `null`, e a tela não mostra nada novo para elas. O rollback remove as duas colunas.

## 15. Interfaces e contratos

```ts
// tRPC
taskPublishInputSchema.extend({ assignToSelf: z.boolean().default(false) }); // tasks.publish
// tasks.byId → publication: o que já existe +
readyAssignment: null | { state: "pending" | "ready" | "not_assigned" | "ready_failed" | "unconfirmed" };
// TaskErrorReason novos (PRECONDITION_FAILED; mensagens M-1, M-2 e M-3)
"ready_board_missing" | "ready_status_missing" | "assign_permission_denied";

// Quadro
export type BoardStatus = "backlog" | "ready";
export class BoardStatusMissingError extends Error { constructor(readonly status: BoardStatus) { super(status); } }
export interface GitHubProjectBoardGateway {
  resolve(token: string, reference: BoardReference): Promise<ProjectBoard>;          // igual: exige Backlog
  statuses(token: string, boardNodeId: string): Promise<BoardStatus[]>;              // substitui assertBacklog
  place(token: string, item: BacklogItem & { status: BoardStatus }): Promise<void>;  // substitui placeInBacklog
  issuePresence(token: string, target: BoardItemTarget): Promise<IssuePresence>;
}

// Issues
type ApprovedIssueRequest = { /* atual */ assignees?: string[] };  // ausente = corpo igual ao de hoje
type IssueReceipt = { /* atual */ assigneeGithubIds: string[] };    // `assignees[].id` da resposta 201
```

- **`readyAssignment`:** é `null` sem a opção. Com a opção e sem resultado gravado, o relógio da leitura decide o estado: `pending` até 2 minutos depois de `issue_created_at` e `unconfirmed` depois disso.
- **Vínculo do quadro:** `BacklogStatusMissingError` continua em `resolve`, com o mapeamento de `projectsController.ts:50`.
- **Hash do pedido:** o hash de `approvalPayload` só inclui a escolha quando ela é verdadeira. Assim, os pedidos antigos mantêm o hash (B-01).

## 16. Fluxos principais

**F-1 — Aceitar (`publish`)**
1. `requireAuthor`, sem mudança.
2. `resolvePreview`, sem mudança, exceto por devolver também a permissão de escrita e os status do quadro. Sem a opção, falhas de leitura do quadro continuam ignoradas; com a opção, valem a REQ-005 e a REQ-008.
3. `assertPossible`.
4. `approve` grava `assign_to_self`.

**F-2 — Worker**
1. Contexto autorizado, sem mudança. Passa a guardar `canWriteContents` e o login do `GET /user` da elegibilidade.
2. Conferência do snapshot, sem mudança.
3. Com a opção: `assertPossible`. Uma recusa vira `settle(rejected, motivo)`, e a tarefa volta a `draft_ready` (REQ-007).
4. `create`, com `assignees: [login]` quando a opção foi marcada.
5. `settle(created)`, sem mudança.
6. Colocação no quadro:
   - Sem a opção: `place(backlog)`.
   - Com a opção e a conta presente em `assigneeGithubIds`: `place(ready)` com 2 tentativas, que termina em `ready` ou `ready_failed`.
   - Com a opção e sem a conta: `place(backlog)` e `not_assigned`.

   Com a opção, o resultado só é gravado se ainda estiver nulo.

## 17. Decisões técnicas

### DEC-01 — Responsável no próprio pedido de criação
- **Decisão:** enviar `assignees: [login]` no `POST /repos/{owner}/{repo}/issues` e confirmar pela lista `assignees` da resposta 201. O login vem do `GET /user` que o worker já faz antes de criar.
- **Alternativas consideradas:**
  - `POST …/issues/{n}/assignees` depois de criar: uma chamada a mais e uma alteração da Issue já criada, o contrário de "ao criá-la".
  - GraphQL `addAssigneesToAssignable`: exige o node id da conta, que o Flow Dev não guarda.
- **Consequências:**
  - O corpo da criação só muda quando a opção é usada.
  - Um 422 por causa do responsável devolveria a publicação inteira para revisão, com a mensagem atual de conteúdo recusado. É improvável, porque a escrita é conferida duas vezes.

### DEC-02 — Conferir antes de criar e recusar com erro
- **Decisão:** com a opção, quadro, Ready (RN-03) e escrita (RN-04) são conferidos no aceite e antes de criar. Se faltar algum, a publicação é recusada. Escolha do usuário em 2026-11-25.
- **Alternativas consideradas:**
  - Desabilitar a opção na prévia, com o motivo: era a recomendação inicial, e o usuário preferiu o erro.
  - Cair para Backlog sem avisar: esconde o problema.
- **Consequências:**
  - O contrato da prévia não muda.
  - A falta só aparece no clique, e a pessoa refaz a prévia para publicar sem a opção (US-02, cenário 4).

### DEC-03 — Contrato do quadro com status de destino
- **Decisão:** `statuses()` e `place({ status })` substituem `assertBacklog` e `placeInBacklog` e mantêm a gravação da prioridade. A regra do nome Ready vira uma só, usada pela publicação e pela fila (hoje em `assignedIssueRules.ts:7` e `:46`).
- **Alternativas consideradas:**
  - `assertReady` e `placeInReady` em paralelo: duplicam a busca de status e a prioridade.
  - `AssignedIssueGateway.setStatus`, da fila: não grava prioridade e não adiciona o item ao quadro.
- **Consequências:** o serviço do quadro e a correção em lote mudam a chamada, e `resolve` segue exigindo Backlog.

### DEC-04 — Resultado gravado na tentativa, sem refazer
- **Decisão:** duas colunas na tentativa de publicação. Os estados pendente e sem confirmação são calculados na leitura. Nada é refeito nem desfeito depois (escolha do usuário).
- **Alternativas consideradas:**
  - Tabela própria: a relação já é 1:1 com a tentativa.
  - Ler o GitHub ao abrir a tarefa: gasta a cota e mostra o estado atual, não o que o Flow Dev fez.
  - Botão "Tentar de novo": recusado.
- **Consequências:** mudanças feitas depois no GitHub não aparecem, como já acontece com o snapshot da Issue.

## 18. Segurança, privacidade e permissões

- O aceite exige pessoa autora e administradora (`taskPublicationController.ts:69`).
- O worker revalida a sessão, a identidade e a elegibilidade antes de criar.
- A conta atribuída sai do token de quem publica (NFR-01).
- Os logs têm o id da tarefa e o motivo, sem token, login, título nem corpo.

## 19. Observabilidade

Um log `[tasks-worker]` registra o id da tarefa quando o resultado for `not_assigned` ou `ready_failed`, no padrão do log atual de falha do Backlog (`taskPublicationWorkerController.ts:53`). O resultado também fica consultável em `task_publication_attempts.ready_assignment`.

## 20. Migração, rollout e reversão

- **Ordem de implantação:**
  1. Migration 0054.
  2. API. Com `assignToSelf` valendo `false` por padrão, a tela antiga continua funcionando.
  3. Tela.
- **Banco de desenvolvimento:** aplicar a migration logo, porque o `next dev` quebra quando falta coluna.
- **Reversão:** a tela antiga não envia a opção, e o rollback remove as colunas. As Issues já atribuídas e em Ready continuam assim no GitHub.

## 21. Riscos técnicos

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| O GitHub descarta o responsável em silêncio | Baixa, porque a escrita é conferida duas vezes | A Issue fica fora da fila | REQ-010, R-2, V-06 |
| Uma automação do quadro tira a Issue de Ready | Média | A Issue sai da fila | Igual ao Backlog hoje; V-10 |
| A regra do nome Ready diverge entre a publicação e a fila | Média, se duplicada | A Issue fica em Ready e a fila não a vê | DEC-03, V-02 |
| Conflito no número da migration | Média | A migração falha | Conferir o journal |

---

# Parte 3 — Verificação

## 22. Estratégia de testes

Segue a skill `software-testing`, e cada linha da matriz é uma ficha de risco.

- **Ferramentas:** Vitest nos dois pacotes, Testing Library na web e a integração da API com o Postgres descartável em memória (`test:integration`, sem `TEST_DATABASE_URL`).
- **O que roda de verdade em cada nível:**
  - Regras puras, sem dublês.
  - Gateways com o cliente real contra respostas HTTP controladas, como os testes atuais.
  - Publicação e worker com DAOs reais no Postgres e o GitHub simulado do harness `task-publication-case.ts`. A gravação da escolha, a recusa e o resultado são o risco.
  - Tela com as procedures tRPC simuladas.
- **Controle:** o relógio da leitura (limite de 2 minutos) e os ids fixos do harness.
- **Ponta a ponta:** não há Playwright novo, porque os gateways do GitHub não são configuráveis por env. A jornada P1 vira o smoke manual V-10, num repositório e num quadro de teste, nunca no repositório do produto.
- **Sem prova automatizada:** a compatibilidade com o GitHub real (responsável mantido, Ready no ProjectV2, automações) fica para o V-10.

## 23. Matriz de verificação

| ID | Cobre | Falha que detecta | Fronteira real | Casos (resumo) |
|---|---|---|---|---|
| V-01 | RN-03–RN-05, REQ-005, B-06 (regra) | Ready aceito com outro nome; escrita ignorada; ordem trocada | Função pura | Sem quadro, sem Ready ou sem escrita → o motivo certo; " ready " aceito e "Pronto" recusado; várias faltas → a primeira; Ready sem In Progress → `null`; tudo certo → `null` |
| V-02 | DEC-03, REQ-003, RN-03, §9 (Backlog) | Ready com a opção do Backlog; prioridade perdida; Backlog quebrado | Gateway real e fetch controlado | `statuses` lista Backlog e Ready; `place(ready)` usa o id da opção Ready e os pontos; `place(backlog)` envia as mutations de hoje; status ausente → `BoardStatusMissingError` |
| V-03 | DEC-01, REQ-002, REQ-010 (gateway) | Responsável enviado sem pedido; recibo sem os responsáveis | Gateway real e fetch controlado | Sem a opção, o corpo é idêntico ao atual; com ela, envia `assignees:[login]`; o recibo traz os ids; 201 sem a conta → a lista não traz a conta |
| V-04 | REQ-003, REQ-010, REQ-011, P-02 (serviço) | Ready sem confirmação; mais de 2 tentativas; a falha derruba a publicação | Serviço real com gateways e gravação em memória | Confirmado → `ready`; não confirmado → Backlog e `not_assigned`; Ready falha 2 vezes → `ready_failed`, com 2 chamadas; sem a opção → Backlog e nada gravado |
| V-05 | US-02 (cenários 1–3), REQ-005, REQ-006, REQ-008, REQ-009, NFR-02, B-01 | Issue criada apesar da falta; draft perdido; leitura extra; chave reaproveitada | Controlador e DAOs reais no Postgres, GitHub simulado | Cada motivo → `PRECONDITION_FAILED`, a tarefa segue `draft_ready` com a mesma revisão; quadro ilegível → recusa; aceite com uma só leitura do quadro; a tentativa grava `assign_to_self`; mesma chave com outra escolha → `request_key_reused` |
| V-06 | US-01 (cenários 1 e 3), US-03 (cenários 1 e 2), REQ-002–REQ-004, REQ-007, REQ-010, REQ-011, REQ-015, NFR-01, B-02–B-04 | Criação com Ready ausente; outra conta atribuída; resultado não gravado; o caminho sem a opção mudou | Worker e Postgres, GitHub simulado | Ready some antes de criar → `rejected` e nenhuma criação; o login enviado é o do `GET /user`; com a opção → `ready`; não atribuída → `not_assigned` e Backlog; sem a opção → sem `assignees` e Backlog; incerta → nada gravado; resultado gravado não é sobrescrito |
| V-07 | REQ-012–REQ-014, RN-06, §14 | Leitura sem o resultado; pendente para sempre; linhas antigas quebram | DAO de leitura e Postgres com a migration | `null` sem a opção; `pending` antes de 2 minutos e `unconfirmed` depois; estados gravados; linha antiga lê `null`; o rollback remove as colunas |
| V-08 | US-01 (cenário 1), US-02 (cenário 4), REQ-001, REQ-009, RN-01, NFR-04 | Opção marcada por padrão; escolha não enviada; recusa não anunciada | Componentes com procedures simuladas | Caixa desmarcada e rotulada; marcada → `assignToSelf: true`; M-1 a M-3 em alerta; nova prévia volta desmarcada |
| V-09 | US-03 (cenário 3), REQ-012–REQ-014, RN-06, NFR-03 | Mensagem errada por estado; resultado sem a opção; sem atualização | Componentes com procedures simuladas | R-0 a R-4 conforme o estado; `null` não mostra nada; R-0 troca por R-1 na próxima releitura, sem recarregar; a nota da reivindicação explícita continua |
| V-10 | US-01 ponta a ponta, US-02 (cenário 1), B-05 | Partes desconectadas do GitHub real | Manual: Flow Dev local, repositório e quadro de teste | Com a opção → responsável e Ready no GitHub e a Issue na fila; quadro sem Ready → M-2 e nada criado |
| V-11 | §9 | Regressão no caminho sem a opção | Testes existentes | `githubProjectBoardGateway.test.ts`, `projectBoard.test.ts`, `taskPublicationWorkerController.test.ts`, `task-publication*.test.ts` e `DraftFooter.test.tsx` passam, com mudança só nos nomes |

## 24. Definição de pronto

- **Durante a implementação:** `pnpm --dir <pacote> exec vitest run <arquivo>` nos testes afetados.
- **No fim, uma vez:**
  - `pnpm --dir packages/api test`
  - `pnpm --dir packages/api test:integration`
  - `pnpm --dir apps/web test`
  - `pnpm typecheck`
  - `pnpm lint`
- **Banco:** migration 0054 aplicada no banco de desenvolvimento.
- **Smoke:** V-10 feito e registrado.
- **Código:** arquivos com até 100 linhas, funções com até 30, sem comentários novos.
- **Spec:** atualizada com o que mudar durante a implementação.

---

## Questões em aberto

Nenhuma.

## Sugestões fora do escopo

- **Avisar no aceite quando o quadro não tem In Progress:** a reivindicação vai falhar depois (B-06).
- **Reivindicar logo depois de publicar com a opção:** economiza um passo, mas mexe no princípio da reivindicação explícita.
- **Lembrar a última escolha da pessoa:** ajuda quem sempre publica para si.

## Histórico

- 2026-11-25 — Spec criada com as respostas do usuário: opção na prévia, responsável no GitHub, recusa com erro quando falta estrutura e nada alterado depois da criação.
- 2026-11-25 — Implementação das tarefas 01 a 04 concluída. Desvios registrados: a 0054 ficou com lacuna 0052–0053 (reservadas às specs das Issues #6 e #9); a elegibilidade da publicação foi extraída para `taskPublicationEligibility.ts`; a chave do pedido na tela inclui a escolha (`version:previewHash:assignToSelf`); a caixa vive em `AssignToSelfOption.tsx` e o aviso do resultado em `ReadyAssignmentNotice.tsx`. O smoke V-10 contra o GitHub real fica pendente.
