# V-45 — Spike do Codex app-server

## Ambiente e método

- Data: 2026-11-23.
- CLI: `codex-cli 0.159.3`; `codex app-server --help` confirmou transporte stdio como padrão e a opção `--listen stdio://`.
- `codex login status`: `Logged in using ChatGPT`.
- O protocolo JSON Schema foi gerado localmente com `codex app-server generate-json-schema --experimental`. Os métodos relevantes incluem `skills/extraRoots/set`, `model/list`, `thread/start`, `thread/resume` e `turn/start`; `item/tool/requestUserInput` aparece como pedido do servidor.
- `spike/probe_initialize.py` inicia um app-server real usando um `CODEX_HOME` temporário com symlink somente para o arquivo de autenticação existente. O relatório não inclui credenciais nem o caminho pessoal.
- Workspace temporário isolado em `/tmp`; nenhum arquivo do projeto real foi aberto pelo processo de teste.

## Evidência executada

| Caso | Resultado observado | Estado |
|---|---|---|
| Versão e ajuda do CLI | `codex-cli 0.159.3`; o comando `app-server` está disponível e documenta stdio. | confirmado |
| Login por assinatura | CLI informa login via ChatGPT. | confirmado |
| `initialize` por JSON-RPC | resposta bem-sucedida do processo real. | confirmado |
| Conversa mínima por stdio | turn real foi iniciado, recebeu a ferramenta/permissão e terminou em `completed`; CLI efetiva 0.159.3. | confirmado |
| skill homônima do clone e do contexto | `skills/list` devolveu ambos os caminhos; `turn/start` com entrada `skill` explícita leu a skill do contexto e o agente respondeu `FLOW_SKILL_USED`. | confirmado |
| Caminho e leitura da skill | `skills/list` expôs o caminho extra e a entrada `skill` explícita com esse caminho produziu o canário do contexto, mesmo havendo skill homônima no clone. O stream capturado não expôs evento de leitura separado. | confirmado por ativação; não há evento dedicado |
| `model/list` | resposta com oito modelos. | confirmado; acesso de inferência e disponibilidade por modelo não provados |
| `requestUserInput` com a flag experimental | pedido real recebido e respondido com sucesso nos três pares de política/sandbox da §7.14: `never/danger-full-access`, `untrusted/workspace-write` e `untrusted/read-only`. | confirmado |
| Ações de arquivo e comandos nos três pares approval/sandbox | clone temporário: em `never/danger-full-access` não houve pedidos; em ambos os pares `untrusted` houve pedidos para escrever arquivo e executar `ls`, `cat README.md`, `pwd` e Python. `ls` veio como `listFiles`, `cat` como `read`; `pwd` e Python vieram como `unknown`. O arquivo só foi criado após aceitar. | comportamento bruto confirmado; tradução efetiva atualizada na §7.14 |
| Edição nativa | Em `untrusted/workspace-write`, a edição nativa de `native-edit.txt` produziu `item/fileChange/requestApproval`; após aceitar, o arquivo existia. | confirmado; habilita tradução específica de “Aceitar edições” |
| `acceptForSession` e persistência entre sessões | primeiro `app-server`: a mesma chamada Python repetida na mesma sessão pediu aprovação uma vez; segundo processo real com o mesmo `CODEX_HOME`: sessão nova pediu uma vez. | confirmado |
| Regra permanente proposta | `acceptWithExecpolicyAmendment` ofereceu a regra original; o processo aceitou a regra e uma segunda sessão em outro diretório executou a mesma chamada sem novo pedido, usando apenas o perfil temporário. | confirmado |
| Interrupção de `sleep 30` | `turn/interrupt` resultou em `interrupted` em menos de 0,01 s; outra sessão em processo separado completou uma turn antes e outra depois da interrupção. | confirmado |
| Retomada após morte de processo | depois de matar com SIGKILL o app-server ocioso, `thread/resume` restaurou o token da conversa; depois de matar durante `sleep 30`, retomou e respondeu corretamente que o comando era `sleep 30`. | confirmado nos dois estados exercitados |
| Entrega de resposta secreta entre web e worker | contrato e proposta de canal estão descritos abaixo e o usuário aprovou `pg_notify`. | confirmado para 01.3; falta prova automatizada da implementação em 02.5 |

O código de protocolo e os testes reais confirmam start, pergunta, skill, aprovação, interrupção e retomada. O caminho da skill é enumerável e a ativação por caminho foi comprovada pelo canário; não existe evento separado de leitura no stream observado. O Codex pede aprovação para qualquer comando em `untrusted`, inclusive `ls`/`cat`; a política efetiva do Flow Dev agora filtra somente ações estruturadas de leitura dentro do clone. Uma ação desconhecida, caminho fora do clone ou comando que misture leitura e escrita pede aprovação. “Aceitar edições” também aceita `fileChange`; “Perguntar tudo” mostra esse pedido. A CLI 0.159.3 é a versão mínima provada, não uma garantia para versões anteriores.

## Proposta para resposta secreta

O fluxo atual grava `answer` pela web no Postgres e o worker consulta essa coluna. O usuário aprovou `pg_notify` efêmero em 2026-11-23. Para cumprir REQ-118/NFR-20, a web envia a resposta somente por notificações e o worker grava `"(resposta oculta)"` no pedido. Como o payload do Postgres tem limite, o transporte usa blocos UTF-8 com id de pedido, id de entrega e sequência; reconstitui em memória e nunca loga conteúdo. A implementação deve limitar tamanho total e expirar blocos incompletos. A entrega usa o Postgres já compartilhado, sem linha durável nem porta nova.

O worker mantém `LISTEN` antes de aceitar respostas e só consome conteúdo quando o id ainda está no registro de pedidos pendentes. A transição condicional `answerIfPending` grava somente marcador, ator e estado; então o worker resolve a promise do runtime com o texto mantido em memória e a web observa a confirmação pela linha. O worker envia uma confirmação efêmera pelo Postgres para a requisição web associar o resultado, sem incluir resposta. Sem listener ou pedido pendente, nenhum marcador é gravado e a API devolve falha de entrega; o segredo não é retido para retry. Id de entrega e estado impedem duplicatas; concorrência com cancelamento tem um vencedor. Uma queda antes do consumo descarta a notificação e a resposta continua não entregue; recuperação cancela pedidos pendentes. Uma queda após gravar marcador e antes de resolver a promise interrompe a conversa e não repete o segredo. Isso altera DEC-17 para esta exceção. O handshake e as garantias de payload, concorrência e logs ainda serão provados na IT-506/V-47k.

## Registro de execução

- 2026-11-23 — 01.1 parcial: `rtk codex --version`, `rtk codex app-server --help`, `rtk codex login status`, geração local do JSON Schema e `rtk python3 -I docs/specs/sessao-do-codex/spike/probe_initialize.py /tmp/flow-dev-codex-repo`. Resultado: CLI/login disponíveis; `initialize`, `skills/extraRoots/set` e `model/list` reais passaram. A prova de skill e perguntas não foi executada; nenhum teste de permissão/retomada foi executado. Nenhum segredo apareceu na saída. A autenticação foi acessada por symlink temporário, sem cópia ou alteração do perfil pessoal.
- 2026-11-23 — DEC-17: usuário aprovou entrega transitória de respostas secretas por `pg_notify`, sem persistência do texto. Contrato de implementação detalhado acima; precisa de teste de integração real e falha fechada quando o worker não confirma.
- 2026-11-23 — V-45c: `rtk python3 -I docs/specs/sessao-do-codex/spike/probe_initialize.py /tmp/flow-dev-codex-repo --questions`. A ferramenta experimental `item/tool/requestUserInput` chegou e a resposta foi aceita nos três modos; as três turns terminaram em `completed`. A autenticação usou CODEX_HOME temporário; o roteiro respondeu com a primeira opção recebida e não registrou conteúdo sensível.
- 2026-11-23 — V-45b: `rtk python3 -I docs/specs/sessao-do-codex/spike/probe_initialize.py /tmp/flow-dev-codex-repo --skill`. `skills/list` mostrou a skill homônima do clone e a do contexto; a entrada `skill` apontou para o caminho do contexto e o agente retornou o canário `FLOW_SKILL_USED`, não o do clone. V-45i segue parcial: sem evento de leitura capturado; repetição interrompida após 90 s.
- 2026-11-23 — V-45d parcial: `rtk python3 -I docs/specs/sessao-do-codex/spike/probe_initialize.py /tmp/flow-dev-codex-repo --permissions`. Os modos `untrusted` emitiram três pedidos cada e o modo `never` nenhum; o arquivo foi criado nos três. O roteiro ainda não associa cada pedido à ação individual, então não confirma a tabela da §7.14. Saída sanitizada registrada; nenhum conteúdo de comando foi guardado.
- 2026-11-23 — V-45e: `rtk python3 -I docs/specs/sessao-do-codex/spike/probe_initialize.py /tmp/flow-dev-codex-repo --session-approval`. O `acceptForSession` suprimiu a segunda aprovação da mesma chamada dentro da sessão; um segundo processo real iniciado com o mesmo perfil temporário pediu aprovação novamente. Só a decisão e a contagem foram registradas.
- 2026-11-23 — V-45f: `rtk python3 -I docs/specs/sessao-do-codex/spike/probe_initialize.py /tmp/flow-dev-codex-repo --persistent-rule`. O processo usou o objeto de regra oferecido pelo servidor em `acceptWithExecpolicyAmendment`; uma nova sessão em outro diretório não pediu aprovação para a mesma chamada. O CODEX_HOME era temporário e removido após a prova.
- 2026-11-23 — V-45g: `rtk python3 -I docs/specs/sessao-do-codex/spike/probe_initialize.py /tmp/flow-dev-codex-repo --resume`. SIGKILL no app-server ocioso e durante `sleep 30`; `thread/resume` restaurou a conversa nos dois casos, incluindo o contexto do comando em execução. Nenhuma falha de retomada foi observada.
- 2026-11-23 — V-45h: `rtk python3 -I docs/specs/sessao-do-codex/spike/probe_initialize.py /tmp/flow-dev-codex-repo --interrupt`. `turn/interrupt` encerrou o `sleep 30` como `interrupted` em menos de 5 s; processo/sessão B separado permaneceu responsivo.
- 2026-11-23 — V-45d reteste: com auth e configuração/regras pessoais apenas montadas por symlink no CODEX_HOME temporário, os modos `untrusted/workspace-write` e `untrusted/read-only` pediram aprovação para `ls` e `cat README.md`, além da escrita, `pwd` e Python. `never/danger-full-access` não pediu. A expectativa “leituras não pedem” não foi satisfeita; manter V-45d pendente até fechar a nova tradução da §7.14.
