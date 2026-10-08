# Como funciona a execução da spec (fluxo unificado)

## Resumo

No modo padrão, ao iniciar uma ação (por exemplo "Criar spec"), o Flow Dev cria uma cópia local isolada do repositório, roda um agente dentro de um container e guarda o resultado no banco para você revisar. O clone de trabalho da pessoa autora e o GitHub não são alterados por esse modo.

Se a pessoa autora escolher **Projeto local vinculado**, o worker monta a pasta configurada no servidor no lugar do checkout isolado. Nesse modo, o agente vê os arquivos locais, inclusive `.env` e alterações não versionadas, e pode modificar a pasta. A opção só aparece quando `SPEC_LOCAL_PROJECT_PATH` aponta para a raiz de um Git cujo `origin` corresponde ao repositório GitHub da tarefa. O Flow Dev registra essa pasta no catálogo do CompozyOS ao iniciar a ação. Configure o mesmo valor em `apps/web/.env.local`, usado pelo servidor web e pelo worker.

O container continua em rede própria. Ter `.env` disponível não garante acesso a um banco ou serviço apontado para `localhost` da máquina; esses serviços precisam estar acessíveis pela rede do container para que testes de integração funcionem.

## Passo a passo

1. **Fila.** O app grava a execução no banco com o estado "Na fila", junto com o modelo, a conexão e o checkout escolhidos. Nada roda dentro do servidor web.
2. **Worker.** O processo `taskflow:worker` (subido pelo `pnpm dev` da API) pega a execução da fila.
3. **Checkout isolado.** O worker clona o repositório em `~/flow-dev-workspaces/<projeto>/<task>/checkout`. É uma cópia separada do seu clone.
4. **Container.** O worker sobe um container Podman (`flow-run-<id>`) com essa cópia montada em `/workspace`. O container é rootless, tem sistema de arquivos somente leitura (exceto `/workspace` e a área de trabalho do CompozyOS) e roda numa rede própria.
5. **Credencial.** A conta Codex/Claude fica só no host. Ela entra no container como uma credencial temporária, válida para aquela execução.
6. **Agente.** Dentro do container, o CompozyOS roda o agente com a skill da ação (`cy-create-spec` ou `cy-create-tasks`). O agente escreve os arquivos em `/workspace/.flow-spec/`. O prompt o proíbe de executar commit, push ou publicação.
   Se o agente pedir uma decisão de Produto ou Técnica, a execução mostra a pergunta. A pessoa autora responde por opção ou texto, e a mesma sessão continua.
7. **Pacote.** Ao terminar, o worker lê `.flow-spec/`, valida os arquivos e grava o pacote no banco. Ele aparece em "Pacote de spec", onde você revisa e aprova.
8. **Limpeza.** O container é removido. O checkout permanece em disco.

Depois de aprovar a spec, a interface oferece **Preparar tarefas**. Depois de aprovar as tarefas, oferece um Loop de implementação disponível no catálogo. O worker coloca os documentos aprovados em `.compozy/tasks/<id da tarefa>/` antes de iniciar o Loop. Cada início continua sendo uma escolha explícita da pessoa autora.

## O que NÃO acontece

- Não cria branch.
- Não faz commit nem push.
- No checkout isolado, não altera o seu clone do repositório. No projeto local vinculado, pode alterar a pasta escolhida.
- Só o que você aprovar no pacote é usado nas etapas seguintes.

## Como acompanhar uma execução

Na lista **Execuções** da tarefa, o estado é atualizado automaticamente e a última atividade pública do agente aparece durante a execução. O worker coleta atividade aproximadamente a cada 5 segundos; a tela atualiza os dados a cada 2 segundos. O Flow Dev acompanha mensagens, chamadas de ferramenta e etapas do runtime, removendo credenciais e caminhos privados antes de mostrá-las. Cada execução também mostra o tempo desde a solicitação, a proveniência do runtime e uma explicação segura do resultado conhecido.

| O que ver | Comando |
| --- | --- |
| Container rodando | `podman ps` |
| Log do CompozyOS no container | `podman logs -f flow-run-<id da execução>` |
| Arquivos gerados pelo agente | `ls ~/flow-dev-workspaces/<projeto>/<task>/checkout/.flow-spec` |
| Estado no banco | tabela `task_execution_runs`, coluna `state` |

Enquanto o agente lê o repositório e gera o texto, é normal não existir `.flow-spec/`. O tempo exibido conta desde a solicitação, incluindo espera na fila; ele não representa somente o tempo ativo do agente. Se a execução permanecer ativa por mais de 10 a 15 minutos, trate como suspeita e olhe o log do container.

## Requisitos de ambiente

- `pnpm dev` na raiz, que sobe o web e os dois workers (`tasksWorker` e `taskFlowWorker`).
- Fora do VS Code, ou com `LD_PRELOAD` removido: a extensão Console Ninja injeta essa variável e quebra o `podman`.
- Em `/admin/software/compozy`, as quatro verificações verdes (aplicação, conta, runtime e host).
- `SPEC_RUNTIME_IMAGE` apontando para a imagem `localhost/flow-spec-runtime@sha256:…` construída com `packages/api/runtime/build.sh`.

## Lacunas conhecidas

- A tela mostra a última atividade segura recebida do agente, mas ainda não apresenta um histórico completo de logs. Para inspecionar os logs completos do container, use os comandos da tabela acima.
- O primeiro uso real do container com uma conta Codex ainda está sendo validado.
- A rede de saída do container ainda não tem o endurecimento final, e a URL real do proxy de documentação não está definida.
- O caminho `.flow-spec/` precisa ser confirmado contra o que o `cy-create-spec` realmente grava.
- Os casos de teste de feature-gate e qa-release (E2E-001 a E2E-007 e afins) continuam pendentes.
