# Aplicação --- Continuação do fluxo após publicação da Issue

## 1. Objetivo

Evoluir a tela atual de Issues para que a publicação no GitHub **não
represente o fim da tarefa**, mas o fim da primeira etapa do ciclo de
desenvolvimento.

A aplicação deve permitir que uma intenção continue visualmente por:

``` text
Intenção
  ↓
Issue
  ↓
Planejamento
  ↓
PRD / Tech Spec / Execução direta
  ↓
Tasks
  ↓
Implementação
  ↓
Review
  ↓
QA
  ↓
PR
```

Nesta entrega, o foco é somente:

``` text
Issue publicada → Planejamento → aprovação da rota
```

------------------------------------------------------------------------

## 2. Princípio de UX

A interface não deve tratar o Markdown, JSON ou logs técnicos como
experiência principal.

A aplicação deve funcionar como uma **Human View do trabalho realizado
por IA**.

A informação técnica continua existindo por baixo, mas o usuário deve
enxergar:

-   o que aconteceu;
-   quem/agente realizou;
-   qual artefato foi produzido;
-   em qual etapa o trabalho está;
-   qual é o próximo passo;
-   por que determinada rota foi recomendada;
-   quais decisões ainda dependem do humano.

------------------------------------------------------------------------

## 3. Aproveitar a tela atual

Não criar um novo menu de planejamento nesta etapa.

O menu **Issues** existente continua sendo o ponto de entrada.

A lista lateral de Issues/intenções continua existindo.

Ao selecionar uma entrada, a área principal passa a representar não
apenas a conversa de criação da Issue, mas o **ciclo de vida daquela
mudança**.

------------------------------------------------------------------------

## 4. Mudança conceitual

Hoje:

``` text
Intenção → Issue → Publicação → Concluído
```

Novo comportamento:

``` text
Intenção → Issue → Publicação
                    ↓
               Planejamento
                    ↓
               Próxima etapa
```

A mensagem atual equivalente a:

> Esta tarefa foi concluída com a publicação da Issue.

deve deixar de representar o encerramento definitivo do trabalho.

Após a publicação, apresentar um estado equivalente a:

``` text
Issue criada com sucesso.

O Dev Control pode analisar esta Issue e recomendar
o próximo passo do desenvolvimento.

[ Analisar próxima etapa ]
```

------------------------------------------------------------------------

## 5. Lifecycle do Work Item

Cada intenção deve começar a ser tratada conceitualmente como um **Work
Item**.

O Work Item representa a mudança completa.

Exemplo:

``` text
Melhorar estados de carregamento
│
├── Intenção
├── Issue #5
├── Planning Decision
├── Tech Spec
├── Tasks
├── Executions
├── Review
├── QA
└── PR
```

Nesta etapa não é obrigatório renomear entidades existentes para
`WorkItem`. O importante é preparar a arquitetura para que a Issue não
seja o contêiner de todo o fluxo.

------------------------------------------------------------------------

## 6. Estados mínimos

Após a publicação da Issue:

``` text
ISSUE_PUBLISHED
      ↓
AWAITING_PLANNING
      ↓
PLANNING_IN_PROGRESS
      ↓
PLANNING_REVIEW
      ↓
PLANNING_APPROVED
```

Também deve existir tratamento de erro/retry compatível com a
arquitetura atual.

Os nomes definitivos podem seguir as convenções já utilizadas pelo
projeto.

------------------------------------------------------------------------

## 7. Ação "Analisar próxima etapa"

Quando a Issue estiver publicada e ainda não possuir planejamento:

``` text
[ Analisar próxima etapa ]
```

Ao acionar:

1.  alterar o estado visual para planejamento em andamento;
2.  chamar o backend;
3.  backend aciona o Dev Control;
4.  Dev Control produz `PlanningDecision`;
5.  persistir o resultado;
6.  renderizar a decisão na Human View;
7.  aguardar decisão humana.

Exemplo durante processamento:

``` text
● Dev Control

Analisando a próxima etapa...
```

------------------------------------------------------------------------

## 8. Human View do Planning Decision

Não renderizar apenas JSON ou Markdown.

Exemplo conceitual:

``` text
Planejamento
────────────────────────────────────

Complexidade
Média

Rota recomendada

Issue
  ↓
PRD
  ↓
Tech Spec
  ↓
Tasks

Por que essa rota?

• Introduz um novo fluxo para o usuário
• Possui impacto em autenticação
• Existem decisões de comportamento

Pendências

⚠ Comportamento das sessões ainda precisa ser definido

[ Alterar rota ]       [ Aprovar planejamento ]
```

------------------------------------------------------------------------

## 9. Controle humano

O Dev Control recomenda uma rota.

O humano deve poder:

``` text
Aprovar planejamento
```

ou:

``` text
Alterar rota
```

Na primeira versão, `Alterar rota` pode oferecer:

-   Execução direta;
-   Tech Spec;
-   PRD.

Se a rota for alterada manualmente, persistir:

-   rota recomendada pelo Dev Control;
-   rota escolhida;
-   origem da decisão (`AI` ou `HUMAN_OVERRIDE`).

Isso preserva rastreabilidade.

------------------------------------------------------------------------

## 10. Timeline

A linha vertical já existente na interface deve evoluir gradualmente
para representar o lifecycle da mudança.

Exemplo:

``` text
✓ Intenção
  Issue Author
     │
     ▼
✓ Issue #5
  Publicada no GitHub
     │
     ▼
✓ Planejamento
  Dev Control
  Rota: Tech Spec
     │
     ▼
● Tech Spec
  Em andamento
     │
     ▼
○ Tasks
     │
     ▼
○ Implementação
```

Nesta entrega, implementar somente até `Planning`.

------------------------------------------------------------------------

## 11. Separação entre conversa e fluxo

À medida que o produto crescer, não misturar indefinidamente:

-   mensagens;
-   artefatos;
-   execuções;
-   eventos de lifecycle.

Preparar a tela para conceitos como:

``` text
Fluxo | Conversa | Artefatos | Fontes
```

Não é obrigatório implementar todas essas abas agora.

O objetivo arquitetural é que:

**Conversa** mostre a interação humano/agente.

**Fluxo** mostre a evolução do trabalho.

**Artefatos** mostre Issue, PRD, Tech Spec etc.

**Fontes** mostre contexto utilizado quando relevante.

------------------------------------------------------------------------

## 12. Artefatos

A aplicação deve começar a tratar outputs importantes como artefatos
tipados.

Exemplos futuros:

``` text
IssueArtifact
PlanningDecision
PRDArtifact
TechSpecArtifact
TaskArtifact
ReviewArtifact
QAArtifact
```

Para esta entrega:

``` text
Issue
PlanningDecision
```

são suficientes.

------------------------------------------------------------------------

## 13. Backend --- comportamento esperado

Criar/adaptar endpoints de acordo com a arquitetura atual, sem impor
nomes se já existir um padrão no projeto.

Contrato conceitual:

``` text
POST /work-items/:id/planning
```

Responsabilidade:

-   validar que existe uma Issue publicada;
-   impedir planejamento duplicado indevido;
-   iniciar Dev Control;
-   persistir execução;
-   persistir `PlanningDecision`;
-   atualizar estado do Work Item.

A aprovação pode seguir algo equivalente a:

``` text
POST /work-items/:id/planning/approve
```

Override:

``` text
POST /work-items/:id/planning/override
```

Os endpoints reais devem respeitar o padrão atual da aplicação.

------------------------------------------------------------------------

## 14. Persistência mínima

Guardar pelo menos:

``` text
PlanningDecision
- id
- workItemId / issueId
- recommendedRoute
- selectedRoute
- complexity
- summary
- reasons
- uncertainties
- decisionSource
- status
- createdAt
- approvedAt
```

Não duplicar dados que já estejam corretamente normalizados no modelo
existente.

------------------------------------------------------------------------

## 15. GitHub

A Issue publicada continua vinculada à Issue real no GitHub.

A aplicação deve preservar:

-   repository;
-   issue number;
-   issue URL/identificador;
-   estado de publicação.

O planejamento pertence ao **Flow Dev**, não precisa ser publicado
automaticamente como comentário na Issue.

------------------------------------------------------------------------

## 16. Escopo desta entrega

### Implementar

-   continuação do fluxo após publicação;
-   estado `awaiting planning`;
-   ação para iniciar planejamento;
-   integração com Dev Control;
-   persistência do `PlanningDecision`;
-   Human View da decisão;
-   aprovação da rota;
-   override humano;
-   representação do planejamento na timeline.

### Não implementar ainda

-   PRD Writer;
-   geração do PRD;
-   Tech Spec Writer;
-   geração de Tech Spec;
-   decomposição em Tasks;
-   execução de código;
-   Code Review;
-   QA;
-   PR/Merge readiness.

Essas etapas devem aparecer somente como direção futura quando
necessário, não como funcionalidades falsas.

------------------------------------------------------------------------

## 17. Critérios de aceite

-   Uma Issue publicada não é mais tratada como fim definitivo do fluxo.
-   A tela oferece uma ação clara para iniciar o planejamento.
-   O backend consegue acionar o Dev Control.
-   A resposta do Dev Control é persistida como `PlanningDecision`.
-   A UI apresenta complexidade, rota, motivos e pendências de forma
    legível.
-   O usuário consegue aprovar a recomendação.
-   O usuário consegue escolher uma rota diferente.
-   A aplicação registra quando houve override humano.
-   A timeline representa Issue publicada e Planning como etapas
    distintas.
-   Markdown/JSON bruto não são a visualização principal.
-   O sistema fica preparado para conectar o próximo artefato à mesma
    mudança.
-   Nenhum PRD ou Tech Spec é gerado nesta entrega.
