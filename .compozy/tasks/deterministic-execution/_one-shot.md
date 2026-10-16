# Flow Dev — modo determinístico, Review e QA

## Instrução para execução em uma sessão

Implemente este documento de ponta a ponta no monorepo Flow Dev. Ele é o contrato de escopo desta implementação e contém as decisões já tomadas pelo usuário. Execute investigação, backend, persistência, integração local, interface e verificações na mesma sessão. Não encerre depois de apresentar um plano, criar mocks ou entregar somente uma camada.

Resolva escolhas rotineiras pelo código existente e pelas decisões abaixo. Não solicite novamente aprovação destas decisões. Se faltar uma dependência externa indispensável, conclua tudo que independe dela, registre o bloqueio exato e não simule sucesso. A implementação deste recurso não autoriza disparar tarefas reais de outras Issues para demonstrá-lo.

Não faça commits, push, publicação, deploy nem abra PR como parte desta implementação. A etapa de PR descrita aqui é um comportamento do produto; preserve suas autorizações atuais.

## 1. Objetivo e decisões aprovadas

O Flow Dev deve continuar oferecendo execução por Loops do CompozyOS e acrescentar um modo determinístico usando o Compozy antigo instalado na máquina. O objetivo é dar controle sobre quais etapas executam, quando executam e quais modelos consomem a assinatura.

O modo determinístico possui etapas explícitas, execuções delimitadas, falhas visíveis e novas rodadas iniciadas pelo operador. Determinístico descreve a orquestração: não promete duração, consumo ou respostas idênticas dos agentes.

Decisões obrigatórias:

- Manter os Loops existentes e seus fluxos funcionais.
- Adicionar a escolha entre `Loops` e `Determinístico` ao planejamento da execução da Issue.
- Preservar o modo dos planos existentes; ausência do novo campo significa comportamento legado por Loops, sem converter histórico.
- Adotar o modo determinístico como escolha inicial para novos planos compatíveis, mantendo Loops disponível explicitamente.
- Escolher conexão/provedor, modelo e raciocínio por etapa, conforme as capacidades reais do runtime.
- Na implementação determinística, permitir substituições por tipo de tarefa e por tarefa específica.
- Manter Review como tela própria, aproveitando a experiência existente e usando a review do Compozy antigo no modo determinístico.
- Acrescentar QA como tela e etapa própria após Review no fluxo determinístico com especificação.
- Usar as skills locais `qa-report` e `qa-execution` para planejar e executar QA real de usuário.
- Mostrar resultados, evidências, problemas, decisões humanas e histórico de QA, além da saída textual do agente.
- Não iniciar correção, nova review, reteste ou etapa seguinte silenciosamente no modo determinístico.
- Deixar a integração de QA aos Loops preparada pelo modelo de dados compartilhado, sem exigir reescrever os Loops nesta entrega.

## 2. Contexto confirmado e leitura obrigatória

Na investigação que originou este documento:

- `/home/mauricio/.local/bin/compozy --version` retornou `0.2.15`, commit `8f8908a`.
- O CLI antigo oferece `exec`, `tasks run`, `reviews fix` e `--task-runtime` com seletores por `type` e `id`.
- O projeto usa `@compozy/cli` `0.3.0-beta.29`, com pin em `packages/api/src/application/spec/specPins.ts`.
- A integração atual valida versão e contrato do CompozyOS e chama APIs específicas de Loop. Substituir apenas o executável não oferece compatibilidade.
- O fluxo unificado usa `_spec.md` e documentos companheiros; as skills antigas podem esperar PRD e TechSpec separados. Confirme o contrato real antes de adaptar.
- As skills de QA já estão em `.agents/skills/qa-report/` e `.agents/skills/qa-execution/`. `docs/qa/` ainda não existia na investigação.
- O checkout possui muitas mudanças pré-existentes, inclusive de `issue-deletion`. Não reverta, reescreva nem atribua a esta entrega alterações de terceiros.

Reconfirme caminhos, versões e capacidades no início: essas observações não substituem a inspeção do estado atual.

Leia e aplique:

- `AGENTS.md`, `/home/mauricio/.codex/RTK.md` e `.agents/rules/code-standards.md`.
- `apps/web/AGENTS.md`, `apps/web/PRODUCT.md` e `apps/web/DESIGN.md`.
- `.agents/skills/layered-backend/SKILL.md`, `trpc-nextjs/SKILL.md` e `nextjs-folder-structure/SKILL.md`.
- As skills disponíveis `compozy`, `impeccable`, `vercel-react-best-practices` e `cy-final-verify` nas partes aplicáveis.
- As duas skills de QA e as referências que governam cada artefato utilizado.
- `.agents/rules/e2e-testing.md` antes de criar ou alterar E2E.
- A documentação local relevante em `apps/web/node_modules/next/dist/docs/` antes de escrever código Next.js.
- A skill local `skill-creator` somente se for necessário alterar uma skill; prefira adaptar a invocação e a captura.

As cópias das rules em `.agents/rules/` e `.claude/rules/` devem continuar iguais. Se alterar uma skill existente nos dois diretórios, mantenha as cópias correspondentes coerentes.

## 3. Fluxo do produto

Fluxo determinístico com especificação:

```mermaid
flowchart LR
  P[Planejamento aprovado] --> S[Spec]
  S --> SA[Aprovação da Spec]
  SA --> T[Tarefas]
  T --> TA[Aprovação das tarefas]
  TA --> I[Implementação]
  I --> R[Review]
  R --> Q[QA]
  Q --> PR[Pull Request]
```

As setas representam pré-requisitos, não disparos automáticos. Aprovar documentos não inicia a próxima etapa. Concluir uma execução não inicia outra chamada ao agente sem ação explícita.

Na primeira entrega, preserve a rota de execução direta, incluindo seu tratamento atual de resultado parcial, e os planos legados por Loops. Não acrescente obrigatoriedade de Spec, Review ou QA a essa rota como efeito colateral. QA obrigatório neste documento pertence aos novos planos determinísticos com especificação.

A escolha de modo pertence ao plano e é congelada no snapshot das execuções. Só pode mudar enquanto o plano for editável e não houver trabalho iniciado sob ele; use as revisões e bloqueios existentes. Trocar modo não converte execuções ativas nem apaga resultados. Não implemente mistura arbitrária de executores dentro da implementação de uma mesma Issue nesta entrega.

## 4. Modelos por etapa e tarefa

Cada operação que chama um agente deve ter configuração própria, inclusive:

| Operação | Configuração |
| --- | --- |
| Spec | Conexão, modelo e raciocínio |
| Criação de tarefas | Conexão, modelo e raciocínio |
| Implementação | Padrão, substituições por tipo e por tarefa |
| Executar review | Conexão, modelo e raciocínio |
| Corrigir achados da review | Configuração independente do revisor |
| Planejar QA | Configuração para `qa-report` |
| Executar QA | Configuração para `qa-execution` |
| Corrigir bugs de QA | Configuração independente da execução de QA |
| Retestar QA | Configuração explícita; pode herdar a execução de QA |
| Preparar/publicar PR, conforme política atual | Configuração própria quando houver chamada ao agente |

Reutilize os padrões persistidos do projeto quando existirem. Complete o mínimo necessário para que novos planos tenham padrões editáveis, sem criar outra área administrativa extensa. A precedência na implementação deve ser: tarefa específica > tipo da tarefa > padrão da etapa > padrão do projeto.

Identificadores de tarefa devem ser exatamente os do manifesto aprovado. A interface precisa listar tarefas reais e mostrar o modelo efetivo de cada uma. Não ofereça apenas um campo livre de flags. Detecte substituições órfãs após uma nova versão do pacote de tarefas.

Não ofereça provedores/modelos de uma versão do Compozy como se estivessem automaticamente disponíveis na outra. Valide runtime, conexão autenticada, catálogo, modelo e raciocínio antes de iniciar. Contas distintas do mesmo provedor precisam respeitar o isolamento atual; se o CLI não conseguir selecionar uma conexão de forma inequívoca, apresente incompatibilidade em vez de usar outra conta silenciosamente.

Alterações de configuração valem para novas execuções/tentativas. Preserve no histórico o snapshot resolvido de conexões, versão do executor, modelos, raciocínio e substituições. Uma tarefa já em andamento não muda de modelo por edição da tela. Não substitua modelos indisponíveis automaticamente.

## 5. Convivência entre Compozy antigo e CompozyOS

Crie contratos de execução proporcionais em `application/` e implementações em `infra/`. Separe a identidade da etapa do mecanismo que a executa: regras de Review e de liberação da PR não devem depender exclusivamente de `kind: loop` ou de um nome de Loop.

Mantenha o CompozyOS e seus pins atuais para Loops. Acrescente resolução e diagnóstico próprios para o CLI antigo, usando caminho configurável no ambiente do conector/worker, sem gravar o caminho pessoal acima como padrão de produção.

Verifique a forma correta de consultar versão em cada CLI: o antigo foi confirmado com `--version`, enquanto o código atual usa `version` para o CompozyOS. Verifique `--help` antes de usar flags.

Não execute `upgrade`, não rebaixe a dependência atual e não relaxe a verificação do pin do CompozyOS para aceitar `0.2`. Isole estado, configuração, sockets e daemons das duas versões por mecanismos realmente suportados; confirme se variáveis como `COMPOZY_HOME` são reconhecidas antes de depender delas. Preserve o acesso autorizado às credenciais nativas sem copiá-las para artefatos ou logs.

O caminho determinístico local precisa funcionar com o CLI antigo mesmo quando o CompozyOS não estiver disponível. Revise inicialização, catálogo, autorização de execução e preparação do checkout: não deixe uma dependência acidental do catálogo ou daemon `0.3` bloquear o modo `0.2`. Para execução em worker gerenciado, forneça a capacidade quando o binário antigo estiver configurado; quando ausente, mostre indisponibilidade antes de enfileirar, preservando o suporte local.

Use processos com argumentos estruturados e diretório de trabalho explícito; não monte shell com conteúdo de Issue, modelo ou caminhos. Confirme suporte real a desabilitar commits automáticos, recuperação, tentativas e paralelismo, inclusive quando configurações globais do usuário habilitarem essas opções.

Pontos de partida, sujeitos à confirmação pelo CLI instalado:

```text
compozy tasks run <slug> --stream --no-recovery --max-retries 0
compozy tasks run <slug> --task-runtime type=backend,ide=<runtime>,model=<model>
compozy tasks run <slug> --task-runtime id=task_03,ide=<runtime>,model=<model>
compozy reviews fix <slug> --round <N> --concurrent 1 --batch-size 1 --no-recovery --max-retries 0
compozy exec --prompt-file <arquivo> --format json --persist --no-recovery --max-retries 0
```

Esses exemplos não são comandos para executar contra o próprio Flow Dev durante a implementação. Acrescente somente flags confirmadas. `--task-runtime id=...` escolhe runtime, não filtra tarefas. Não invente `--task-id` ou garantia de pausa entre tarefas.

Uma ação `Implementar` pode executar sequencialmente todas as tarefas pendentes do pacote aprovado. O limite explícito é essa etapa; ela não deve iniciar Review ou QA. Uma retomada não repete tarefas cuja conclusão esteja comprovada para a versão atual.

Transporte de eventos, identificadores de runs, reconciliação e cancelamento precisam refletir a execução real. `exit 0` sozinho não prova implementação, review limpa ou QA aprovado. Perder o processo cliente não prova que o daemon terminou. Após resposta incerta, reconcilie a mesma execução antes de permitir outra que duplique trabalho.

## 6. Documentos e pacote aprovado

Preserve a experiência de Spec e os documentos aprovados atuais. Não obrigue o usuário a recriar uma Spec aprovada porque o CLI antigo usa outra organização de arquivos.

Investigue as skills realmente disponíveis em cada runtime. Adapte a entrada do CLI antigo para consumir os documentos aprovados. Quando uma skill exigir `_prd.md` e `_techspec.md`, produza uma representação derivada e rastreável do pacote aprovado, sem inventar requisitos nem editar os originais. Registre hashes e a relação com a versão de origem. Não faça conversão com cortes frágeis de strings ou inferência silenciosa de requisitos ausentes.

O slug e o diretório `.compozy/tasks/<slug>/` usados no checkout precisam ser estáveis por Issue e evitar colisões entre projetos/Issues. Respeite o manifesto e a ordem de dependências aprovados. Preserve arquivos de progresso na retomada e valide se pertencem ao mesmo pacote.

Instale/disponibilize apenas as skills necessárias ao runtime, usando os mecanismos existentes do projeto. Um `compozy setup` global que sobrescreva as skills do usuário não é solução para a integração.

## 7. Tela de Review determinística

Reaproveite a aba/tela existente de Review. Adapte os textos ao modo selecionado: o texto atual de repetição automática pertence aos Loops e não deve descrever o modo determinístico.

Ofereça ações separadas:

1. **Executar review:** invocar `cy-review-round` pelo CLI antigo, com escopo no pacote e código atuais.
2. **Corrigir achados:** processar uma rodada identificada usando `reviews fix`, com o modelo de correção.
3. **Executar nova review:** gerar uma nova rodada sobre o código corrigido, sem apagar a anterior.

Exiba lista e detalhe dos achados, severidade, arquivo/local quando disponível, justificativa, status e relação com correções. Inclua rodada atual, histórico, modelo efetivo, andamento e falhas de captura.

Leia os contratos reais de `cy-review-round` e `cy-fix-reviews` antes de interpretar `reviews-NNN/issue_*.md`. Não crie `_meta.md` se a skill proibir. Uma review sem achados pode não criar diretório; registre um resultado explícito validado da execução para representar uma rodada limpa. Ausência de arquivos, saída vazia ou finalização manual não comprovam review limpa.

Toda review avalia uma identidade de código: commit base mais digest das alterações relevantes, inclusive arquivos não rastreados do worktree. Saídas e logs gerados não devem causar invalidação circular. Corrigir todos os arquivos de achados não libera QA/PR: exija nova review limpa do código resultante.

Se correções de QA alterarem o código posteriormente, a review anterior fica desatualizada para liberação. Solicite revalidação explícita sobre o código atual e preserve seu histórico.

## 8. Etapa de QA e visualização

### 8.1 Contrato das skills

O QA destas skills é uma pessoa representada por uma persona percorrendo jornadas reais nas interfaces públicas do produto. As suítes automatizadas são pré-condições e gates, não substitutos das sessões.

Use uma árvore durável por projeto em `docs/qa/`, ou caminho configurado dentro do repositório conforme o contrato das skills. Se ausente, `qa-report` faz bootstrap. Não crie uma árvore concorrente por Issue ou rodada.

Planejamento mantém personas, jornadas com Mermaid, cenários, charters de sessão, templates e registro de bugs. Execução atualiza veredictos dos cenários, relatórios datados, evidências, debriefs e o registro de bugs. `state.csv` é uma visão gerada; não deve ser editado nem virar a fonte de verdade.

Uma retomada continua o mesmo relatório. Novas execuções recebem identidade distinta, inclusive quando ocorrem no mesmo dia e escopo; resolva colisões preservando o layout aceito pela skill, por exemplo incluindo um sufixo de execução no escopo. Nunca sobrescreva relatório anterior.

### 8.2 Ações e limites

A tela QA contém **Planejamento** e **Execução**, com modelos próprios e ações explícitas para planejar, iniciar sessões, retomar, corrigir achados e retestar. Planejar não chama o navegador automaticamente.

`qa-execution` possui um ciclo de correção na própria skill. Nesta integração determinística, a invocação inicial deve ser explicitamente de diagnóstico e registro. Correções e retestes só ocorrem em ações posteriores do operador. Transmita essa política na invocação, preservando o governor da skill para qualquer correção autorizada. Não permitir commits automáticos nessa invocação; use identidade de alterações do worktree enquanto não houver commit e nunca fabrique um SHA para preencher o relatório.

Preserve bloqueios humanos, limites de sessão e cortes de escopo. Mostre estimativa de escopo em sessões e tempo planejado, sem prometer custo. Limites de duração/consumo encerram ou interrompem com resultado honesto; não viram novas chamadas de recuperação.

A skill prevê sessões longas e passes adicionais. Não remova esses requisitos silenciosamente para economizar: declare o que foi executado, omitido ou bloqueado e o motivo. Não exponha como opção uma redução incompatível com a skill sem uma política explícita e refletida no relatório.

### 8.3 Conteúdo da tela

| Visão | Conteúdo obrigatório |
| --- | --- |
| Resumo | Escopo, ambiente, versão/digest do código, estado da execução e prontidão |
| Jornadas | Jornadas previstas, percorridas e ausentes; fluxo Mermaid quando disponível |
| Sessões | Charter, persona, dispositivo/rede/idioma, tour, duração prevista/real e resultado |
| Cenários | Expectativa, veredicto real, bugs vinculados, correção e reteste |
| Evidências | Capturas nos checkpoints/falhas e referências ao que foi confirmado |
| Problemas | Impacto para usuário, severidade, reprodução, estado e evidências |
| Decisões humanas | Verificação pendente, instruções exatas, opções e recomendação |
| Histórico | Execuções, modelos, relatórios e conclusões anteriores sem sobrescrita |
| Verificações automatizadas | Comando e resultado dos gates, distintos da cobertura de jornadas |

Cobertura principal significa jornadas percorridas por personas no ciclo. Não substitua isso por quantidade de testes ou cenários verdes. Exiba omissões e bloqueios, evitando apresentar uma execução encerrada como QA aprovado.

Leia `state-schema.md` e `status-and-reporting.md`: os enums dos cenários e da matriz não são iguais. Existe também uma inconsistência entre a lista de seis estados da matriz e as referências a `Fail` nas regras de fechamento. Resolva com um mapeamento explícito e conservador que preserve falha no cenário/bug e impeça prontidão falsa; registre a decisão técnica. Não normalize falha ou estado desconhecido para sucesso.

### 8.4 Captura, histórico e evidências

Os documentos das skills são a fonte do conteúdo de QA. A aplicação projeta esses dados em DTOs validados e guarda snapshots por execução; os cenários vivos podem mudar sem reescrever resultados históricos. Um índice estruturado derivado é permitido, sem criar um segundo registro autoritativo de bugs/cenários mantido manualmente.

Capture progresso incremental a partir de documentos realmente escritos e eventos de execução; não invente ações do navegador. Estado incompleto ou malformado durante uma gravação deve preservar a última captura válida e indicar sincronização pendente. Encerramento com artefatos inválidos é falha de captura, não aprovação.

Evidências são ignoradas pelo Git por padrão. Capture-as pelo conector/worker e disponibilize-as por leitura autenticada ligada à Issue e à execução. Não dependa de URL de arquivo local nem de servir o checkout por diretório público. Respeite raiz, tamanho, MIME e vínculos de acesso, rejeitando traversal, symlinks externos e referências a arquivos do host. Se uma evidência não puder ser preservada, exiba indisponibilidade explicitamente.

Relatórios Markdown e Mermaid são conteúdo não confiável: use os mecanismos de sanitização e renderização existentes, sem HTML ou scripts executáveis. Não publique tokens, credenciais, caminhos privados ou logs brutos no DTO.

### 8.5 Pré-condições e prontidão

Verifique as pré-condições das skills: aplicação acessível em ambiente dedicado com comportamento real, autenticação/dados próprios para QA e suítes automatizadas verdes. Não use produção, não contorne o produto por writes diretos no banco durante uma sessão e não use mocks para declarar dogfooding real.

Dependências ausentes de navegador, ambiente ou credenciais geram bloqueios com instruções e permitem continuar apenas as jornadas que sejam realmente executáveis. Não instale ferramentas ou execute outro produto sem necessidade comprovada.

O agente executor deve executar a suíte de saída requerida pela skill uma vez e registrar o resultado. Sessões concluídas, execução técnica concluída e prontidão para PR são estados distintos.

Para novos planos determinísticos com especificação, liberar PR exige implementação concluída, review limpa válida para o código atual e QA com veredicto `ready`, evidências/gates obrigatórios válidos e sem pendências que impeçam prontidão. `ready with blocked items`, skips sem justificativa suficiente e decisões humanas pendentes não liberam PR automaticamente. Não acrescente um bypass novo nesta entrega.

## 9. Persistência, autorização e concorrência

Reutilize o ciclo de vida, revisões, leases, snapshots e idempotência existentes. Acrescente migrações compatíveis sem reescrever histórico legado.

Persistir o necessário para modo do plano, configurações resolvidas, substituições por tarefa, operações de Review/QA, identidade de código, rodadas, snapshots de resultados e referências de evidências. Separe operação técnica de resultado de domínio: um processo pode terminar com achados, bloqueios ou artefatos inválidos.

Cada ação de escrita deve ter identidade idempotente, autorização no servidor, precondições atualizadas e bloqueio do worktree. Cliques repetidos não iniciam agentes duplicados. Conteúdo pertence ao projeto/Issue autorizado; leitura de histórico e evidência exige a mesma proteção.

Conector desconectado, worker reiniciado, lease vencido ou parada solicitada não comprovam término. Reconciliar antes de admitir uma nova escrita. Cancelamento deve alcançar o trabalho real do CLI/daemon e preservar arquivos, branch, worktree e PR. Reiniciar o servidor não inicia sessões ou correções por conta própria.

Integrar os novos runs à interrupção e às fences de `issue-deletion`: excluir uma Issue não pode deixar implementação, review ou QA antigos escrevendo no checkout depois de o registro ser removido. Considere também perda de acesso e credencial revogada durante uma execução.

O progresso precisa indicar etapa, tarefa/sessão quando disponível, ação atual e última atualização; não exponha logs enormes como interface principal. Mostre métricas de consumo somente quando fornecidas realmente pelo runtime e preserve ausência como ausência.

## 10. Locais de integração a investigar

Estes caminhos existiam na investigação; use-os como pontos de partida e confirme a responsabilidade antes de alterar:

- `packages/api/src/application/services/task-flow/flowContracts.ts`, `planShape.ts`, `planProposal.ts`, `retryRuntimeBindings.ts` e `taskFlowViews.ts`.
- `packages/api/src/application/services/task-flow/loopOrder.ts`, `pullRequestAction.ts` e `pullRequestRelease.ts`: atualmente reconhecem Review por Loop.
- `packages/api/src/infra/taskFlowWorkerComposition.ts`, `infra/spec/compozy/routingExecutor.ts` e `snapshotRunExecutor.ts`.
- `packages/api/src/infra/local-execution/localNativeCommandAgent.ts`, `localActionExecutor.ts`, `localLoopRunExecutor.ts`, `pinnedCompozy.ts` e os coletores de artefatos.
- `packages/api/src/application/services/local-execution/localProtocol.ts` e os contratos/capacidades do conector.
- `packages/api/src/infra/spec/compozy/unifiedPrompt.ts`, `application/spec/specPins.ts` e `infra/softwareComposition.ts`.
- Schemas, routers, controllers, DAOs e migrações correspondentes a planos, runs, pacotes e autorização.
- `apps/web/src/features/issues/assigned-work/spec/unified/`: `PlanEditor`, `RuntimePicker`, editores de retry, `ReviewGuide`, `flowStages`, `flowTabs`, `useFlowCommands` e visualização humana dos documentos.
- `packages/api/resources/` e a distribuição de skills para cada runtime.

Coloque novas telas/componentes no contexto de produto existente. Não crie um dashboard paralelo desconectado da Issue. Preserve design, responsividade, navegação, estados vazios, estados de erro e acessibilidade por teclado. Reutilize os componentes de seleção de runtime e inferência de tipos tRPC.

## 11. Testes e critérios de aceite

Implemente testes que provem comportamentos, principalmente:

| ID | Critério |
| --- | --- |
| AC-01 | Planos existentes continuam nos Loops; novo plano permite escolher e persistir modo determinístico. |
| AC-02 | O conector executa o CLI antigo no caminho determinístico sem chamar APIs de Loop ou exigir daemon `0.3`. |
| AC-03 | Duas versões podem coexistir sem sobrescrever binário, skills, configuração ou estado uma da outra. |
| AC-04 | Cada operação usa seu modelo efetivo; override por tarefa vence tipo e padrão; configuração inválida bloqueia antes de iniciar. |
| AC-05 | Modelos/conexões indisponíveis e raciocínio incompatível produzem diagnóstico claro, sem fallback oculto. |
| AC-06 | Snapshot aprovado chega intacto ao executor; representações antigas derivadas não alteram requisitos ou arquivos aprovados. |
| AC-07 | Implementação executa tarefas pendentes na ordem válida, sem iniciar Review automaticamente nem repetir conclusões válidas após retomada. |
| AC-08 | Clique duplicado, resposta incerta e reinício não criam uma segunda execução do mesmo trabalho. |
| AC-09 | Cancelamento chega ao trabalho real; leases e desconexão não são confundidos com término; exclusão da Issue cerca os novos runs. |
| AC-10 | Review cria rodada capturável, mostra achados e permite corrigir com outro modelo. |
| AC-11 | Correções não são review limpa; rodada limpa requer prova explícita, incluindo o caso válido sem diretório de achados. |
| AC-12 | Review do código antigo não libera o código alterado; concluir manualmente Review não produz aprovação técnica. |
| AC-13 | QA planeja sem executar sessões e executa sem disparar correções automáticas; cada ação usa configuração própria. |
| AC-14 | Tela de QA exibe jornadas, sessões/personas, resultados, bugs, evidências, decisões humanas, gates e histórico. |
| AC-15 | Retomada continua relatório existente; duas novas execuções do mesmo dia não se sobrescrevem. |
| AC-16 | Documentos em atualização/inválidos não viram sucesso nem apagam a última captura válida. |
| AC-17 | Falha, bloqueio, omitido, não executado e aprovado permanecem distintos; execução encerrada não significa prontidão. |
| AC-18 | Evidências preservadas abrem após refresh/reconexão; leitura indevida, traversal e symlink externo são rejeitados. |
| AC-19 | Correção de QA exige reteste e revalidação da Review; histórico anterior permanece legível. |
| AC-20 | PR no novo fluxo só libera com os gates atuais válidos; rota direta e Loops legados mantêm seu comportamento. |
| AC-21 | Catálogo, leitura, comandos e evidências respeitam projeto, sessão, operador e revogação de acesso. |
| AC-22 | Interface mantém o modo selecionado ao recarregar, estados acessíveis e operação em viewport estreita. |

Use fakes/fixtures de processo e artefatos para testes de parser, transporte e integração: eles não devem consumir assinaturas ou alterar GitHub real. Esses testes provam a integração, não equivalem a um QA real aprovado. O teste de cancelamento deve representar trabalho persistente no daemon, não somente o processo cliente.

Acrescente E2E focado nos fluxos visíveis: seleção do modo/modelos, Review determinística, QA com evidências/bloqueio e liberação da PR. Use o ambiente isolado exigido pelas rules; não crie mutações reais de produção.

## 12. Verificações e entrega

Antes das mudanças, registre o estado do checkout e os limites da tarefa. Durante a implementação, agrupe edições e rode testes afetados e typecheck do pacote, conforme `AGENTS.md`. Não aumente timeouts nem reduza workers para mascarar lentidão.

No final, execute uma vez as suítes completas dos pacotes alterados e os checks pertinentes, usando o prefixo `rtk` conforme as instruções locais:

```bash
rtk pnpm --dir packages/api test
rtk pnpm --dir packages/api test:integration
rtk pnpm --dir packages/api typecheck
rtk pnpm --dir apps/web test
rtk pnpm --dir apps/web typecheck
rtk pnpm lint
rtk pnpm --dir apps/web build
rtk pnpm --dir apps/web exec playwright test <specs-afetados>
```

Confirme os scripts antes de executar. A integração da API sobe PostgreSQL descartável sozinha; não defina `TEST_DATABASE_URL` localmente. O build e E2E focado são pertinentes porque esta entrega altera fluxos visíveis. Depois de falhas, repita o que falhou até corrigir e confirme com a suíte completa correspondente conforme as regras do projeto.

Atualize `PRODUCT.md` e a documentação operacional necessária: como configurar o CLI antigo, como escolher modo/modelos, como executar as rodadas e como interpretar QA. Não apresente integrações incompletas como implementadas. Se a árvore de QA do próprio Flow já existir, atualize os cenários afetados para `untested`; se não existir, planeje os novos cenários com `qa-report`, sem inventar resultados de sessão.

Entregue um resumo com arquivos/responsabilidades alterados, migrações, configuração necessária, evidências dos comandos e limitações reais. Compare AC-01 a AC-22 com a implementação. Não declare sucesso total baseado somente em typecheck, build, saída do agente ou snapshots da UI.

## 13. Checklist de execução

Use esta lista como acompanhamento nesta mesma sessão. Só marque um item depois de implementado e verificado no escopo correspondente.

- [x] Investigar contratos atuais, CLI antigo, skills e estado do checkout.
- [ ] Implementar modo do plano, capacidades e snapshots retrocompatíveis.
- [ ] Implementar configuração e seleção de modelos por operação/tipo/tarefa.
- [ ] Integrar o CLI antigo com progresso, reconciliação, cancelamento e isolamento.
- [ ] Compatibilizar entrada aprovada de Spec/Tasks e execução sequencial.
- [ ] Implementar Review determinística, rodadas e captura de achados.
- [ ] Implementar planejamento/execução de QA e captura incremental dos documentos.
- [ ] Implementar evidências autenticadas, histórico e invalidação por alteração de código.
- [ ] Adaptar telas existentes de plano/modelos/Review e acrescentar a tela QA.
- [ ] Aplicar gates de PR e preservar rota direta e Loops legados.
- [ ] Verificar fences de exclusão, autorização, concorrência e retomada.
- [ ] Executar testes/checks, atualizar documentação e reportar evidências e lacunas.
