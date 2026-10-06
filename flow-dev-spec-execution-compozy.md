# Aplicação --- Execução da etapa de Spec com o Compozy

Documento de contexto para a criação do PRD desta funcionalidade. Reúne o
objetivo, o estado atual do Flow Dev, o que se sabe sobre o Compozy e as
decisões que o PRD precisa tomar.

Levantamento feito em 05/10/2026.

------------------------------------------------------------------------

## 1. Objetivo

Hoje o Flow Dev leva uma intenção até o **planejamento aprovado**: a Issue
é publicada, o Dev Control recomenda uma rota e o autor aprova. A jornada
para ali; nada é executado depois da aprovação.

Esta funcionalidade continua o ciclo a partir desse ponto:

``` text
Issue publicada → Planejamento aprovado → Spec (PRD / Tech Spec / Tasks)
```

A ideia central:

-   botões na tela do Flow Dev disparam o **Compozy** para executar o
    fluxo de spec da rota aprovada;
-   a tela mostra o trabalho do agente **enquanto ele acontece**, não só o
    resultado final;
-   quando o agente pergunta algo ou pede uma aprovação, o autor responde
    pela própria tela.

------------------------------------------------------------------------

## 2. Onde o Flow Dev está hoje

### Ciclo completo previsto

``` text
Intenção → Issue → Planejamento → PRD / Tech Spec / Execução direta
→ Tasks → Implementação → Review → QA → PR
```

O ciclo e os princípios de UX (Human View, timeline, separação entre
conversa e fluxo) estão em `flow-dev-planning-application.md`. O PRD do
planejamento está em
`.compozy/tasks/flow-dev-planning-application/_prd.md`.

### O que o planejamento entrega

-   Rotas possíveis: `direct_execution`, `tech_spec`, `prd`.
-   Estados do planejamento: `awaiting`, `in_progress`, `failed`,
    `review`, `approved`.
-   A decisão guarda rota recomendada, rota escolhida, complexidade,
    resumo, razões e incertezas.
-   Planejamento aprovado é somente leitura.
-   Só o autor inicia, repete, escolhe rota e aprova. Os demais membros
    apenas leem.
-   Incertezas não bloqueiam a aprovação e continuam disponíveis para a
    etapa seguinte.

O PRD do planejamento declara como fora de escopo a geração de PRD e de
Tech Spec dentro da aplicação. Esta funcionalidade é essa continuação.

### Como o backend executa o planejamento

-   Contrato: `packages/api/src/application/planning/planningGateway.ts`,
    com um único método `analyze`, que devolve o envelope completo.
-   Implementação:
    `packages/api/src/infra/planning/devControlPlanningGateway.ts`, que faz
    um `POST` para `/flow-dev/planning/v1` no Dev Control (aplicação irmã
    em `../Dev_Control`) e espera a resposta inteira.
-   Configuração por `PLANNING_BASE_URL` e `PLANNING_API_KEY`. A URL
    precisa ser `https` ou `http` em loopback.
-   Um worker separado (`packages/api/src/cli/tasksWorker.ts`) processa as
    operações com registro durável, idempotência, recuperação e rejeição
    de resultado obsoleto.
-   Procedimentos tRPC em `packages/api/src/routers/taskPlanning.ts`:
    `start`, `retry`, `selectRoute`, `approve`, `submission`.

### Como a tela acompanha o planejamento

-   A tela fica em `apps/web/src/features/issues/issue-composer/`
    (`PlanningStage`, `PlanningActions`, `PlanningRouteSelector`,
    `PlanningTimeline`).
-   O acompanhamento é por **polling** (`hooks/usePolling.ts`).
-   Não há subscription tRPC nem stream de eventos no backend.

Consequência: o modelo atual é requisição e resposta. Mostrar o agente
trabalhando ao vivo exige uma capacidade que o Flow Dev ainda não tem.

------------------------------------------------------------------------

## 3. O que é o Compozy

O Compozy é um runtime local para agentes de código: um binário único com
um daemon na máquina, que controla sessões, fila de tarefas, memória e
automações, e conduz CLIs de agente (Claude Code, Codex e outros).

### Duas linhas de versão

| Linha | Situação |
| --- | --- |
| `0.2.15` | Depreciada. Só recebe correções críticas no branch `legacy/v0.2`. É a versão instalada na máquina de desenvolvimento. |
| `0.3` ("CompozyOS") | Linha atual, em beta. Última versão vista: `v0.3.0-beta.29`, de 01/10/2026. |

**A funcionalidade deve mirar a linha 0.3.** A 0.2.15 não deve ser usada
como base.

### Como este repositório usa o Compozy hoje

As quatro funcionalidades em `.compozy/tasks/` foram especificadas com as
skills da 0.2.15, rodando manualmente dentro de uma sessão de agente. Cada
pasta tem:

``` text
.compozy/tasks/<slug>/
  _prd.md            _user_stories.md
  _techspec.md       _tests.md
  _tasks.md          task_01.md ... task_NN.md
  adrs/              reviews-001/
```

------------------------------------------------------------------------

## 4. Superfícies de integração da 0.3

Tudo nesta seção vem da documentação pública e do guia de migração. **Nada
foi instalado nem testado.**

### API HTTP

-   Tudo fica sob `/api`.
-   A referência é gerada de `openapi/compozy.json`, então existe contrato
    OpenAPI para gerar um cliente tipado.
-   O CLI e a API operam o mesmo estado do daemon.
-   Transportes citados: HTTP, socket Unix, SSE e WebSocket.

### Sessões

-   Uma sessão é durável: tem workspace, política de permissão e histórico
    de eventos, e sobrevive a reinícios do daemon.
-   Fluxo: criar a sessão, enviar prompts, acompanhar os eventos.
-   Os streams aceitam retomada por `Last-Event-ID`.
-   Estado de uma sessão:
    `GET /api/workspaces/{workspace_id}/sessions/{session_id}`.

### Perguntas e aprovações do agente

-   Perguntas de esclarecimento e pedidos de permissão viram registros
    duráveis, chamados de *interactions*.
-   Leitura:
    `GET /api/workspaces/{workspace_id}/sessions/{session_id}/interactions`.
-   O cliente responde por essa mesma superfície; os resultados possíveis
    incluem `applied`, `answered`, `already-resolved` e `queue-full`.

### Loops

-   Um loop é um trabalho com objetivo, verificação, limites de parada e
    resultados nomeados, executado pelo daemon sem supervisão.
-   Loops empacotados: `implement-tasks` e `review-and-fix`.
-   Mostram progresso ao vivo, podem pausar em aprovação humana e podem
    ser cancelados.

### MCP

-   Existe `compozy mcp serve`, que entrega a clientes MCP externos
    confiáveis uma projeção da API vinculada ao workspace.
-   As tools expostas não foram verificadas.
-   O MCP atende quando quem chama é um agente. Para botões numa aplicação
    web, a API HTTP com stream é o encaixe mais direto.

### O que mudou no fluxo de spec

| Na 0.2.15 | Na 0.3 |
| --- | --- |
| `cy-create-prd` | Removida, sem sucessora empacotada |
| `cy-create-techspec` | Removida, sem sucessora empacotada |
| (não existia) | `cy-create-spec` |
| `cy-create-tasks` | Mantida |
| `compozy tasks run <slug>` | `compozy loop run --name implement-tasks --input slug=<slug>` |
| `compozy reviews fix <slug>` | `compozy loop run --name review-and-fix --input task_name=<slug>` |
| `compozy exec "prompt"` | `compozy session new` e depois `compozy session prompt <id>` |

As skills mantidas vêm numa extensão que a documentação chama de
`spec-cycle` e o guia de migração de `dev-cycle`. A árvore
`.compozy/tasks/<slug>/` continua sendo usada.

------------------------------------------------------------------------

## 5. O que ainda não foi verificado

O PRD não deve tratar estes pontos como fatos:

-   o que `cy-create-spec` gera, e se cobre PRD e Tech Spec ou só um
    deles;
-   o formato e os tipos dos eventos do stream de uma sessão;
-   o formato exato de uma *interaction* e de sua resposta;
-   como a API HTTP autentica chamadas;
-   quais tools o `compozy mcp serve` expõe;
-   o nome correto da extensão (`spec-cycle` ou `dev-cycle`);
-   a estabilidade da API entre betas.

Um spike com a 0.3 isolada resolve a maior parte: criar uma sessão, rodar
`cy-create-spec` num slug de teste e capturar eventos e interações reais.

------------------------------------------------------------------------

## 6. Restrições conhecidas

-   **O Compozy é local.** Binário, daemon, CLI do agente autenticado e
    checkout do repositório precisam estar na mesma máquina. Não roda em
    ambiente serverless.
-   **O Flow Dev atende vários projetos e repositórios.** O Compozy
    trabalha por workspace, que é um diretório com o repositório clonado.
    Alguém precisa garantir esse checkout para cada projeto.
-   **A 0.3 é beta.** Foram 29 betas até 01/10/2026; a API pode mudar.
-   **O estado da 0.2 não migra.** O guia manda começar com estado limpo e
    não há migrador de configuração.
-   **A instalação é global.** A máquina de desenvolvimento tem a 0.2.15
    com outros projetos registrados no daemon.
-   **Um botão na web dispara um agente com acesso a arquivos.** A
    política de permissão da sessão precisa ser restritiva por padrão.
-   **Padrões do repositório.** O backend segue camadas (contrato em
    `application/`, implementação em `infra/`), e as regras de código
    limitam arquivos a 100 linhas e funções a 30.

------------------------------------------------------------------------

## 7. Decisões que o PRD precisa tomar

### Produto

1.  **Escopo da entrega.** Só a geração da spec, ou também Tasks,
    implementação e review?
2.  **Rotas.** O que cada rota aprovada dispara: `prd`, `tech_spec` e
    `direct_execution`. A rota `prd` segue depois para Tech Spec?
3.  **PRD e Tech Spec separados ou spec única.** A 0.3 só traz
    `cy-create-spec`. O Flow Dev mantém as duas rotas, adapta para a spec
    única, ou recria as skills antigas por conta própria?
4.  **Perguntas do agente.** Como a tela apresenta uma pergunta, quem
    pode responder e o que acontece se ninguém responder.
5.  **Revisão e aprovação.** O autor aprova cada artefato antes de seguir
    para o próximo, como já faz no planejamento?
6.  **O que aparece ao vivo.** Texto do agente, chamadas de ferramenta,
    progresso por etapa. O princípio de Human View pede que log bruto seja
    detalhe opcional.
7.  **Cancelamento e repetição.** O autor pode interromper uma execução?
    Repetir aproveita a sessão anterior ou começa outra?
8.  **Leitores.** Membros que não são o autor acompanham a execução ao
    vivo ou só veem o resultado?
9.  **Destino dos artefatos.** Ficam só no Flow Dev, vão para o
    repositório do projeto em `.compozy/tasks/<slug>/`, ou ambos? Há
    commit, branch ou PR?

### Dependências para a Tech Spec

Estes pontos não são decisão de produto, mas limitam o que o PRD pode
prometer:

-   onde o worker e o daemon rodam, e como cada projeto ganha um checkout;
-   como os eventos chegam ao navegador (hoje só existe polling);
-   persistência dos eventos para reconexão sem perda de histórico;
-   como a execução se relaciona com o Dev Control, que hoje faz o
    planejamento;
-   comportamento quando o daemon está indisponível ou a versão do
    Compozy muda.

------------------------------------------------------------------------

## 8. Fontes

-   Site e documentação: <https://www.compozy.com/docs/>
-   Referência da API: <https://www.compozy.com/docs/api/>
-   Sessões: <https://www.compozy.com/docs/sessions/>
-   Loops: <https://www.compozy.com/docs/loops/>
-   Migração da 0.2 para a 0.3: <https://www.compozy.com/docs/migration/>
    e `MIGRATION_GUIDE.md` em <https://github.com/compozy/compozy>
-   Brief do planejamento: `flow-dev-planning-application.md`
-   PRD do planejamento:
    `.compozy/tasks/flow-dev-planning-application/_prd.md`
