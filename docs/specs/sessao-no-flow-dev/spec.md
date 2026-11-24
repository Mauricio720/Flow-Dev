# Spec C: A sessão do Claude dentro do Flow Dev

> **Status:** Implementada (falta a passada manual pela UI do V-31) · **Data:** 2026-11-22 · **Nível:** L4 ancorada (vai para spec-to-tasks) · **Depende de:** [Spec A](../execucao-no-terminal/spec.md) e [Spec B](../acompanhamento-e-artefatos/spec.md), ambas implementadas. Os IDs continuam a numeração delas e nunca se repetem.
> **Contexto lido:** Specs A e B; `packages/api/src/infra/terminal/` (`terminalCommand.ts`, `claudeHookSettings.ts`, `gnomeTerminalLauncher.ts`, `terminalPorts.ts`); `packages/api/src/application/terminal/terminalLauncher.ts`; `packages/api/src/infra/agents/` (`claudeArguments.ts`, `agentProcess.ts`); `packages/api/package.json` (o `tasksWorker` roda com `tsx watch`); `apps/web/src/features/issues/assigned-work/components/` (`TerminalLaunchDialog.tsx`, `ExecutionStage.tsx`, `ExecutionEventList.tsx`); `apps/web/e2e/terminal-execution.spec.ts`, `terminal-tracking.spec.ts`; documentação do Claude Agent SDK (`user-input`: `canUseTool` e `AskUserQuestion`; `typescript`: entrada por streaming, `interrupt()`, `resume`, `reinitialize()`).

## Resumo para revisão

- **O que muda:**
  - "Abrir no terminal" vira "Iniciar sessão". O Claude Code passa a rodar por trás do Flow Dev, e não abre mais a janela do GNOME Terminal.
  - Na tarefa, a pessoa vê a conversa. Ela responde ali as perguntas com opções do Claude, aprova ferramentas, manda a próxima mensagem, interrompe e encerra.
  - A conversa fica guardada. Se o serviço reiniciar, a sessão fica "Interrompida" e é retomada quando a pessoa mandar uma mensagem.
- **Por quê:** a pessoa precisa ir até a janela do terminal para tudo o que o Claude pede, e o Flow Dev só observa (fora de escopo da Spec B).
- **Decisões principais:**
  - DEC-15: Claude Agent SDK num serviço de sessões próprio.
  - DEC-16: o serviço não roda com watch e fica ligado à máquina.
  - DEC-17: a app e o serviço conversam pelo Postgres.
  - DEC-18: os eventos da Spec B chegam por callbacks de hook, sem HTTP.
  - DEC-19: o `claude` usado é o do PATH.
- **Riscos principais:**
  - O SDK pode se comportar de outro jeito com o login local, as skills e o modo "Tudo liberado". O spike V-20 vem antes de tudo.
  - Sessões presas a um processo de longa duração. Mitigação: heartbeat e estado "Interrompida" (REQ-076).
- **Como vamos verificar:**
  - unitários da máquina de estados e dos mapeadores de pedidos;
  - integração do serviço com o Postgres de teste e um runtime roteirizado;
  - um e2e da jornada completa;
  - smoke real (V-20, V-31).
- **Pendências:** nenhuma de produto; P-09 a P-11 dependem do V-20.

---

# Parte 1 — Produto

## 1. Contexto e problema

Na Spec A, a confirmação abre o Claude Code numa janela de terminal, com todas as permissões, na pasta do clone. Na Spec B, a tarefa mostra o estado e os eventos da sessão, e guarda o Markdown que as skills escrevem. Tudo o que o Claude pede, porém, só pode ser respondido no terminal:
- as perguntas com opções (a spec-writer faz várias rodadas);
- a próxima mensagem quando ele termina a vez;
- interromper ou encerrar.

A tarefa só avisa "Aguardando você", e a pessoa precisa achar a janela. A Spec B deixou de fora, de propósito, controlar a sessão pelo Flow Dev. Agora o pedido é trazer esse controle para dentro da aplicação.

## 2. Usuários e papéis

- **Quem abriu a sessão,** enquanto for a operadora da tarefa: conversa com o Claude, responde aos pedidos, interrompe e encerra.
- **Membro com acesso ao projeto e administrador:** veem a conversa em modo leitura (REQ-024).

## 3. Objetivos

- **G7:** tudo o que o terminal pediria à pessoa durante a sessão é respondido na tela da tarefa: perguntas, aprovações, a próxima mensagem, interromper e encerrar.
- **G8:** a conversa fica no Flow Dev, legível depois, e sobrevive a um reinício do serviço.

## 4. Fora de escopo

- **Terminal de verdade no navegador** (TTY, atalhos de teclado, comandos interativos como `/model` e `/config`): a interação é estruturada, não uma emulação.
- **Manter o GNOME Terminal como opção:** decidido substituir.
- **Texto palavra a palavra:** cada mensagem do Claude aparece completa (REQ-057).
- **Trocar o modo de permissões no meio da sessão e o modo de planejamento:** não foram pedidos.
- **Mostrar o raciocínio, a saída das ferramentas e os subagentes:** a REQ-019 continua valendo.
- **Retomar sozinho depois de um reinício:** decidido retomar só com uma mensagem da pessoa.
- **Avisos fora da tela da tarefa** (notificação do navegador, título da aba): não foram pedidos.
- **Controlar uma sessão iniciada em outra máquina:** a sessão roda na máquina de quem abriu.

## 5. Histórias de usuário

### US-06 — Conversar com o Claude na tarefa (P1)
Como pessoa operadora, quero iniciar a sessão e conversar com o Claude na tela da tarefa, para não depender de uma janela de terminal.
- **Por que P1:** sem isso, nenhum dos pedidos tem onde aparecer.
- **Teste independente:** iniciar uma Execução direta, ver o texto do Claude na tarefa e, quando ele terminar a vez, mandar "Rode também o lint" e ver a resposta.
- **Cenários de aceite:**
  1. **Dado** a Issue #42 com Execução direta aprovada e o vínculo de Ana válido, **quando** Ana confirma "Iniciar sessão" no diálogo, **então** nenhuma janela de terminal abre, e em até 10 s a etapa "Sessão do Claude" mostra "Em andamento", o prompt enviado e, em seguida, o texto do Claude.
  2. **Dado** que o Claude terminou a vez e a etapa mostra "Aguardando você", **quando** Ana envia "Rode também o lint", **então** a mensagem aparece na conversa, a etapa volta a "Em andamento", e a resposta do Claude aparece embaixo.
  3. **Dado** que o Claude está no meio da vez, **quando** Ana envia "Use o Button existente", **então** a mensagem aparece como "Na fila" até o Claude recebê-la.
  4. **Dado** que o serviço de sessões não está rodando, **quando** Ana abre o diálogo, **então** vê "O serviço de sessões do Flow Dev não está rodando. Inicie o Flow Dev com pnpm dev e tente de novo.", e a confirmação não aparece.

### US-07 — Responder às perguntas do Claude (P1)
Como pessoa operadora, quero responder na tarefa às perguntas com opções que o Claude faz, para que a skill continue sem eu ir ao terminal.
- **Por que P1:** a spec-writer para nessas perguntas, e é o pedido mais frequente.
- **Teste independente:** numa sessão de Tech Spec, responder às perguntas da spec-writer na tarefa e ver o Claude seguir com as respostas.
- **Cenários de aceite:**
  1. **Dado** que a spec-writer pergunta "Quem pode ver os comentários?" com as opções "Só membros (Recomendado)" e "Qualquer pessoa", **quando** a tela atualiza, **então** a etapa mostra "Precisa de você", com a pergunta, as duas opções com as descrições e a opção "Outra".
  2. **Dado** duas perguntas no mesmo pedido, a segunda de escolha múltipla, **quando** Ana responde só a primeira, **então** "Enviar respostas" continua desabilitado; quando ela marca duas opções na segunda e envia, **então** o Claude continua, e a conversa mostra as duas perguntas com as respostas.
  3. **Dado** uma pergunta aberta, **quando** Ana escolhe "Outra" e escreve "Só o autor e os administradores", **então** o Claude recebe esse texto como resposta.
  4. **Dado** que Ana respondeu numa aba, **quando** ela tenta enviar a mesma pergunta em outra aba, **então** vê "Este pedido já foi respondido.", e nada muda.

### US-08 — Aprovar as ferramentas do Claude (P2)
Como pessoa operadora, quero escolher o modo de permissões ao iniciar e aprovar na tarefa as ferramentas que ele pedir, para controlar o que o Claude faz no meu clone.
- **Por que P2:** o padrão continua "Tudo liberado", como hoje.
- **Teste independente:** iniciar com "Aceitar edições, perguntar comandos", aprovar `pnpm test` e recusar `rm -rf dist` com um motivo.
- **Cenários de aceite:**
  1. **Dado** o diálogo de abertura, **quando** abre, **então** o modo de permissões vem em "Tudo liberado", e a sessão não pede aprovação de nenhuma ferramenta.
  2. **Dado** uma sessão em "Aceitar edições, perguntar comandos", **quando** o Claude quer rodar `pnpm test`, **então** a etapa mostra "Precisa de você", com "Rodar comando: pnpm test", a descrição do Claude e os botões "Permitir", "Permitir sempre (Bash(pnpm test:*))" e "Recusar".
  3. **Dado** esse pedido, **quando** Ana escolhe "Permitir sempre", **então** o comando roda, a regra é gravada nas configurações locais do projeto no clone, e a próxima sessão desse clone roda `pnpm test` sem pedir.
  4. **Dado** um pedido para `rm -rf dist`, **quando** Ana recusa com "Não apague o build, só rode o lint", **então** o comando não roda, e o Claude recebe o motivo e continua.

### US-09 — Interromper e encerrar (P2)
Como pessoa operadora, quero interromper a vez do Claude e encerrar a sessão pela tarefa, para corrigir o rumo ou terminar o trabalho.
- **Por que P2:** sem isso, a pessoa pode esperar o Claude terminar a vez.
- **Teste independente:** interromper durante um comando longo e, depois, encerrar.
- **Cenários de aceite:**
  1. **Dado** que o Claude está rodando `pnpm build`, **quando** Ana aciona "Interromper", **então** em até 5 s a etapa mostra "Aguardando você", e a conversa registra "Interrompido por você".
  2. **Dado** uma pergunta pendente, **quando** Ana interrompe, **então** a pergunta aparece como "Cancelada".
  3. **Dado** uma sessão em "Aguardando você", **quando** Ana aciona "Encerrar" e confirma, **então** a etapa mostra "Encerrada", os artefatos da última vez são capturados, e a conversa fica só para leitura.

### US-10 — Retomar depois de um reinício (P2)
Como pessoa operadora, quero que uma sessão cortada por um reinício possa continuar de onde parou, para não perder o contexto da conversa.
- **Por que P2:** reinícios são raros, mas apagam uma conversa longa.
- **Teste independente:** parar e subir o serviço com a sessão aberta, mandar uma mensagem e ver o Claude responder lembrando a conversa.
- **Cenários de aceite:**
  1. **Dado** uma sessão em "Precisa de você", **quando** o serviço reinicia, **então** a sessão mostra "Interrompida" com "Sessão interrompida às 14:32. Envie uma mensagem para retomar.", e a pergunta aparece como "Cancelada".
  2. **Dado** essa sessão, **quando** Ana envia "Pode seguir com a opção recomendada", **então** a conversa continua com o mesmo histórico do Claude, e a etapa volta a "Em andamento".
  3. **Dado** uma sessão interrompida antes de o Claude chegar a iniciar, **quando** Ana envia uma mensagem, **então** a sessão vai para "Encerrada" com "Não foi possível retomar a conversa. Abra uma nova sessão."

## 6. Requisitos funcionais

**Abertura** (substitui o terminal da Spec A)
- **REQ-051** (US-06): QUANDO a pessoa confirmar a abertura, o sistema DEVE iniciar a sessão do Claude Code dentro do Flow Dev, na pasta vinculada, com o prompt, os anexos e as skills da Spec A, sem abrir janela de terminal. Substitui a REQ-010.
- **REQ-052** (US-08): O diálogo DEVE oferecer o modo de permissões com as opções da seção 7.11, com "Tudo liberado" selecionado, e a sessão DEVE seguir o modo escolhido do início ao fim.
- **REQ-053** (US-06): SE o serviço de sessões não estiver rodando na máquina, ENTÃO o diálogo DEVE mostrar a mensagem do cenário US-06.4 e não oferecer a confirmação; o `open` DEVE recusar pelo mesmo motivo.
- **REQ-054** (US-06): SE o Claude Code não conseguir iniciar a sessão (por exemplo, sem login), ENTÃO a sessão DEVE ir para "Falhou ao abrir" com o motivo informado pelo Claude Code.
- **REQ-081** (US-06): SE o serviço não começar a sessão em 60 s depois da confirmação, ENTÃO a sessão DEVE ir para "Não confirmada" com "O Flow Dev não conseguiu iniciar o Claude. Confira se o serviço de sessões está rodando." (é a REQ-021 com a mensagem nova).

**Conversa**
- **REQ-055** (US-06): A etapa "Sessão do Claude" DEVE mostrar, em ordem cronológica, as mensagens da pessoa, o texto do Claude em Markdown, os eventos resumidos da Spec B e os pedidos com a resposta dada.
- **REQ-056** (US-06): O sistema NÃO DEVE mostrar nem guardar o raciocínio do Claude, a saída das ferramentas nem as mensagens dos subagentes.
- **REQ-057** (US-06): QUANDO o Claude concluir um texto ou abrir um pedido, o sistema DEVE mostrá-lo em até 3 s a quem estiver com a tarefa aberta.
- **REQ-058** (US-06): ENQUANTO a sessão não estiver num estado final, quem pode controlá-la (REQ-080) DEVE poder enviar uma mensagem de 1 a 20.000 caracteres; SE o Claude estiver no meio da vez, ENTÃO a mensagem DEVE aparecer como "Na fila" até ele recebê-la.
- **REQ-059** (US-06): O sistema DEVE entregar a mensagem ao Claude exatamente como digitada, inclusive comandos como `/flow-dev:spec-to-tasks`.
- **REQ-060** (US-06): SE a mesma mensagem for enviada duas vezes (duplo clique, reenvio depois de perder a resposta), ENTÃO o sistema DEVE entregá-la uma vez só.
- **REQ-061** (US-06): O sistema DEVE guardar a conversa até a Issue ser excluída, e mostrá-la também ao expandir uma sessão anterior no histórico (REQ-023).
- **REQ-062** (US-06): QUANDO a Issue for excluída, o sistema DEVE excluir junto as mensagens e os pedidos das sessões dela.

**Perguntas**
- **REQ-063** (US-07): QUANDO o Claude fizer perguntas com opções, o sistema DEVE mostrar cada uma com o título curto, o texto, as opções (rótulo, descrição e, se houver, a prévia) e o tipo de escolha (única ou múltipla).
- **REQ-064** (US-07): Cada pergunta DEVE aceitar também a resposta "Outra", com texto livre de 1 a 2.000 caracteres.
- **REQ-065** (US-07): QUANDO a pessoa enviar as respostas, o sistema DEVE entregá-las ao Claude, e a conversa DEVE registrar cada pergunta com a resposta.
- **REQ-066** (US-07): O envio de um pedido com várias perguntas DEVE ficar desabilitado enquanto alguma delas estiver sem resposta.

**Aprovações**
- **REQ-069** (US-08): ENQUANTO o modo não for "Tudo liberado", QUANDO o Claude quiser usar uma ferramenta que o modo e as regras do projeto não liberam, o sistema DEVE mostrar o pedido com a ferramenta e o que ela vai fazer (seção 7.10).
- **REQ-070** (US-08): O pedido de aprovação DEVE oferecer "Permitir", "Recusar" (com motivo opcional de até 2.000 caracteres, entregue ao Claude) e, quando o Claude Code sugerir uma regra, "Permitir sempre" com a regra à vista.
- **REQ-071** (US-08): QUANDO a pessoa escolher "Permitir sempre", o sistema DEVE gravar a regra nas configurações locais do projeto no clone, como o terminal faz, e as sessões seguintes desse clone DEVEM respeitá-la.
- **REQ-072** (US-08): ENQUANTO o modo for "Tudo liberado", o sistema NÃO DEVE pedir aprovação de ferramentas; as perguntas com opções continuam aparecendo.

**Pedidos em geral**
- **REQ-067** (US-07, US-08): SE um pedido já tiver sido respondido ou cancelado, ENTÃO o sistema DEVE recusar uma nova resposta com "Este pedido já foi respondido." ou "Este pedido não está mais aberto.", sem mudar nada.
- **REQ-068** (US-07, US-08): ENQUANTO um pedido estiver pendente, o sistema DEVE mantê-lo aberto sem prazo, até a pessoa responder, interromper ou encerrar.

**Interromper e encerrar**
- **REQ-073** (US-09): ENQUANTO o Claude estiver no meio da vez, quem controla a sessão DEVE poder interromper; o sistema DEVE parar a vez em até 5 s e cancelar os pedidos pendentes, e a sessão DEVE ir para "Aguardando você". Se Stop chegar enquanto um pedido ainda estiver pendente, Interromper continua disponível e cancela esse pedido; sem vez ativa e sem pedido pendente, aplica-se B-30.
- **REQ-074** (US-09): QUANDO a pessoa confirmar "Encerrar" ("Encerrar a sessão? O Claude para, e a conversa fica só para leitura."), o sistema DEVE parar o Claude, cancelar os pedidos pendentes, capturar os artefatos (REQ-043) e levar a sessão a "Encerrada".
- **REQ-075** (US-09): ENQUANTO a sessão estiver num estado final, a etapa DEVE mostrar a conversa só para leitura, sem campo de mensagem e sem controles.

**Reinício**
- **REQ-076** (US-10): SE o serviço de sessões parar com sessões ativas, ENTÃO, ao voltar, ele DEVE levá-las a "Interrompida", cancelar os pedidos pendentes e registrar na conversa a nota do cenário US-10.1.
- **REQ-077** (US-10): QUANDO a pessoa enviar uma mensagem a uma sessão "Interrompida", o sistema DEVE retomar a mesma conversa do Claude, com o histórico, e entregar a mensagem.
- **REQ-078** (US-10): SE a conversa não puder ser retomada, ENTÃO a sessão DEVE ir para "Encerrada" com a mensagem do cenário US-10.3, e a mensagem enviada DEVE aparecer como "Não entregue".
- **REQ-079** (US-10): O sistema NÃO DEVE retomar uma sessão interrompida sem uma mensagem da pessoa.
- **REQ-082** (US-10): Nas sessões dentro do Flow Dev, o aviso "Sem sinal desde HH:MM" da REQ-022 NÃO DEVE aparecer; a queda do serviço é tratada pela REQ-076.

**Permissão**
- **REQ-080** (US-06–US-10): Só a pessoa que abriu a sessão, enquanto for a operadora da tarefa, DEVE poder enviar mensagens, responder a pedidos, interromper e encerrar. As demais pessoas que veem a tarefa veem tudo em modo leitura.

## 7. Regras de negócio

### 7.2 Estados da sessão (amplia a Spec B)

| De | Para | Quando |
|---|---|---|
| — | Abrindo | a pessoa confirmou (REQ-051) |
| Abrindo | Falhou ao abrir | o Claude Code não iniciou (REQ-054) |
| Abrindo | Não confirmada | 60 s sem o serviço começar (REQ-081) |
| Abrindo, Não confirmada, Aguardando você, Interrompida | Em andamento | o Claude começou a vez: início, mensagem entregue, retomada |
| Em andamento | Precisa de você | abriu uma pergunta ou aprovação |
| Precisa de você | Em andamento | todos os pedidos abertos foram respondidos |
| Em andamento, Precisa de você | Aguardando você | o Claude terminou a vez, ou a pessoa interrompeu |
| qualquer estado não final | Interrompida | o serviço caiu ou o processo do Claude morreu sem encerramento (REQ-076) |
| qualquer estado não final | Encerrada | a pessoa encerrou, ou a retomada falhou (REQ-074, REQ-078) |

Encerrada e Falhou ao abrir continuam finais. As sessões antigas, abertas no terminal, seguem a tabela da Spec B.

### 7.4 Permissões (complementa as Specs A e B)

| Ação | Quem abriu, sendo operadora | Operadora que não abriu | Membro ou admin |
|---|---|---|---|
| Escolher o modo de permissões na abertura | sim | (abre a própria sessão) | não |
| Enviar mensagem, responder, interromper, encerrar | sim | não | não |
| Ver a conversa, os pedidos e as respostas | sim | sim, leitura | sim, leitura |

### 7.5 Limites (complementa as Specs A e B)

- **Mensagem da pessoa:** 1 a 20.000 caracteres.
- **Resposta "Outra" e motivo da recusa:** até 2.000 caracteres.
- **Texto do Claude guardado:** até 50.000 caracteres por mensagem; o que passar é cortado e termina em "[mensagem cortada]".
- **Conteúdo exibido num pedido de aprovação:** até 20.000 caracteres, com o mesmo corte.
- **Tela:** as 200 entradas mais recentes da conversa (mensagens, eventos e pedidos), com "N entradas anteriores não exibidas".

### 7.9 Perguntas

- Uma chamada do Claude pode trazer de 1 a 4 perguntas, que formam um pedido e são respondidas juntas.
- A resposta de cada pergunta é o rótulo da opção, os rótulos marcados (escolha múltipla) ou o texto de "Outra".
- A prévia de uma opção é mostrada como Markdown, em fonte monoespaçada, como no terminal.

### 7.10 O que o pedido de aprovação mostra

| Ferramenta | Mostra |
|---|---|
| Comando (Bash) | "Rodar comando:", o comando inteiro e a descrição do Claude |
| Editar arquivo (Edit, MultiEdit) | "Editar <caminho relativo>" e cada trecho antes e depois |
| Criar arquivo (Write) | "Criar <caminho relativo>" e o conteúdo |
| Buscar na web (WebFetch, WebSearch) | a URL ou a busca |
| Qualquer outra (MCP, NotebookEdit…) | o nome da ferramenta e a entrada formatada |

Leituras dentro do clone não pedem aprovação nos modos que perguntam, como no terminal.

### 7.11 Modos de permissões

| Opção no diálogo | Comportamento |
|---|---|
| **Tudo liberado** (padrão) | Nenhuma ferramenta pede aprovação; é o comportamento atual da Spec A |
| **Aceitar edições, perguntar comandos** | Edições de arquivo no clone seguem sozinhas; comandos e as demais ferramentas pedem aprovação, salvo as regras já liberadas |
| **Perguntar tudo** | Edições, comandos e as demais ferramentas pedem aprovação, salvo leituras e regras já liberadas |

## 8. Casos de borda e erros

| ID | Situação | Comportamento esperado | Ref. |
|---|---|---|---|
| B-22 | A pessoa deixa de ser operadora com a sessão aberta | A sessão continua; ela e a nova operadora veem em leitura, com "Só quem abriu a sessão, enquanto for a operadora, pode responder." | REQ-080 |
| B-23 | Mensagem "Na fila" quando o serviço cai | Na retomada, ela é a mensagem que retoma a conversa | REQ-077 |
| B-24 | O Claude termina a vez e logo abre uma pergunta, ou pergunta dentro de um subagente | A pergunta aparece do mesmo jeito; só o texto dos subagentes fica de fora | REQ-056, REQ-063 |
| B-25 | A pessoa envia `/exit` ou outro comando interativo do terminal | A mensagem é entregue como digitada; a resposta do Claude Code aparece na conversa; para terminar, a pessoa usa "Encerrar" | REQ-059 |
| B-26 | "Permitir sempre" num clone em que `.claude/settings.local.json` é versionado | O Claude Code 2.1.330 **não grava** a regra nesse caso (smoke V-31, `v20-spike.md`): o pedido é respondido e o comando roda, mas a próxima sessão pergunta de novo. Sem o arquivo versionado, a regra é gravada | REQ-071 |
| B-27 | A aplicação web cai, e o serviço de sessões continua | O Claude segue; os pedidos esperam; tudo aparece quando a tela volta | REQ-068 |
| B-28 | Sessões antigas, abertas no GNOME Terminal | Aparecem no histórico como "Aberta no terminal", só com os eventos e sem campo de mensagem | 7.2 |
| B-29 | O Claude produz um texto com mais de 50.000 caracteres | Fica guardado cortado, com "[mensagem cortada]" | 7.5 |
| B-30 | Interromper sem vez ativa nem pedido pendente (corrida com o fim da vez) | Não muda nada e não mostra erro | REQ-073 |
| B-31 | Duas sessões ativas da mesma pessoa em tarefas diferentes | Cada uma tem a própria conversa e os próprios pedidos | REQ-055 |

## 9. Comportamento que não muda

- O vínculo local, o prompt editável, os anexos e as skills entregues DEVEM CONTINUAR como a Spec A define; muda só onde a sessão roda e o modo de permissões.
- Os eventos resumidos, a skill ativa e a captura de artefatos DEVEM CONTINUAR como a Spec B define, com os mesmos resumos e os mesmos limites.
- A sessão DEVE CONTINUAR A usar o login, o CLAUDE.md, as skills e os hooks pessoais do Claude Code da pessoa (DEC-05).
- Fora a regra de "Permitir sempre" (REQ-071), o sistema DEVE CONTINUAR A não escrever no clone, no `~/.claude` nem no GitHub.
- QUANDO o Issue Author ou o Planejamento rodarem, o sistema DEVE CONTINUAR A usar a configuração isolada de hoje.
- QUANDO uma sessão mudar de estado, o sistema DEVE CONTINUAR A manter o status do planejamento, da tarefa, da fila e do quadro.
- A confirmação antes de abrir uma segunda sessão na mesma tarefa (REQ-014) e a trava `FLOW_DEV_TERMINAL_ENABLED` (Q-01 da Spec A) DEVEM CONTINUAR.

## 10. Requisitos não funcionais

- **NFR-10** (desempenho): uma mensagem ou resposta enviada DEVE chegar ao Claude em até 2 s no p95 local; texto e pedidos do Claude, em até 3 s na tela (REQ-057).
- **NFR-11** (confiabilidade): falha ao gravar um evento ou uma mensagem NÃO DEVE parar o Claude. O serviço DEVE marcar as sessões órfãs em até 30 s depois de subir.
- **NFR-12** (segurança): o serviço DEVE iniciar só sessões criadas na mesma máquina e pelo mesmo usuário do sistema operacional. Ele executa só o `claude` local, com argumentos fixos, sem shell, e não abre nenhuma porta de rede nova.
- **NFR-13** (privacidade): além do que a NFR-04 já guarda, ficam no banco o texto da conversa e o conteúdo exibido nos pedidos (comandos e edições propostas), visíveis só a quem vê a tarefa.
- **NFR-14** (acessibilidade): mensagens e pedidos novos são anunciados numa região `aria-live="polite"`. Cada pergunta é um grupo rotulado de botões de opção ou caixas de seleção. Os pedidos e os controles funcionam pelo teclado. No campo de mensagem, Ctrl+Enter envia e Enter quebra a linha.

## 11. Premissas e dependências

- **P-09:** o Claude Agent SDK para TypeScript, apontado para o `claude` do PATH (2.1.330), usa o login da pessoa sem chave de API, como o `claude -p` dos agentes locais já faz. Confirmada no V-20 (2026-11-23).
- **P-10:** o `canUseTool` recebe as perguntas (`AskUserQuestion`) também em "Tudo liberado", e as aprovações vêm com as regras sugeridas. Devolver `updatedPermissions` com destino `localSettings` grava `.claude/settings.local.json` no clone. Confirmada no V-20: as perguntas chegam também em `bypassPermissions`, e as sugestões já trazem o destino `localSettings`.
- **P-11:** a retomada por `resume` com o id da sessão do Claude funciona depois de o processo morrer, inclusive no meio de uma ferramenta. Confirmada no V-20.
- **P-12:** a aplicação web e o serviço de sessões rodam na mesma máquina, com o mesmo usuário do sistema operacional.
- **Dependência:** Specs A e B implementadas.

---

# Parte 2 — Técnica

## 12. Visão geral da solução

Um processo novo, o **serviço de sessões** (`packages/api/src/cli/terminalSessionsWorker.ts`), roda sem watch, ao lado do `tasksWorker`. Ele mantém um heartbeat por máquina e, a cada 1 s, assume as sessões novas da sua máquina e despacha o que a web gravou: mensagens, respostas, interromper e encerrar.

Cada sessão é um `query()` do Claude Agent SDK no modo de entrada por streaming, dentro do clone, com o plugin `contexto/` da Spec A. O que sai dela vai para o banco:
- o texto do Claude vira mensagens;
- os callbacks de hook alimentam o `TerminalEventController` da Spec B sem mudança;
- cada `canUseTool` vira um pedido que espera resposta.

A web só lê e escreve no banco, e a etapa consulta uma linha do tempo incremental a cada 1,5 s. Os fluxos estão na seção 16.

## 13. Componentes e responsabilidades

| Componente | Responsabilidade | Local | Novo/Alterado |
|---|---|---|---|
| `TerminalLaunchDialog` | Modo de permissões, serviço fora do ar, "Iniciar sessão" (REQ-052, REQ-053) | `apps/web/src/features/issues/assigned-work/components/` | Alterado |
| `ExecutionStage` | Vira "Sessão do Claude" e hospeda a conversa; sessões antigas como hoje (B-28) | mesma pasta | Alterado |
| `SessionConversation`, `QuestionRequestCard`, `PermissionRequestCard`, `SessionComposer`, `SessionControls` | Linha do tempo, pedidos (7.9, 7.10), mensagem, Interromper e Encerrar; Markdown pelo renderizador do `ArtifactViewer` | mesma pasta | Novo |
| `useSessionTimeline` | Polling incremental a 1,5 s com a sessão ativa | `.../assigned-work/hooks/` | Novo |
| `TerminalSessionController` | `open` grava a sessão sem disparar nada; `preflight` informa o serviço | `packages/api/src/controllers/` | Alterado |
| `SessionInteractionController` | REQ-080 e as procedures `tasks.session.*` | mesma pasta | Novo |
| `SessionSupervisor`, `SessionRequestBroker` | Heartbeat, órfãs, assumir sessões, despacho; `canUseTool` → pedido → resposta | `packages/api/src/application/services/terminal/` | Novo |
| `PermissionRequestSummarizer`, `AnswerMapper` | 7.10 e 7.9, funções puras | mesma pasta | Novo |
| `TerminalSessionStateMachine` | Transições da 7.2 | mesma pasta | Alterado |
| `ClaudeSessionRuntime` (porta) | Contrato da §15 | `packages/api/src/application/terminal/` | Novo |
| `AgentSdkSessionRuntime`, `ScriptedSessionRuntime`, `machineIdentity` | SDK real; roteiro para testes (`FLOW_DEV_SESSION_FAKE_SCRIPT`, só com `NODE_ENV=test`); `host_id` por hostname e usuário | `packages/api/src/infra/terminal/` | Novo |
| `GnomeTerminalLauncher`, `ClaudeSessionSettingsWriter`, `buildTerminalCommand` | Removidos com os testes deles | mesma pasta | Removido |
| Route handler de eventos | Fica para as sessões antigas ainda abertas | `apps/web/src/app/api/terminal-sessions/events/route.ts` | Sem mudança |
| Routers e scripts | `tasks.session.*`; SDK com versão fixada; `sessions:worker`; `dev` sobe o serviço sem watch | `packages/api/src/routers/`, `packages/api/package.json` | Alterado |

## 14. Modelo de dados

Migrations `0048_session_interaction.sql` e `0049_session_preparation.sql`, com rollbacks correspondentes.

- **`task_terminal_sessions`** (colunas novas):
  - `runtime` text, com check em `terminal` e `flow_dev`; o default `terminal` cobre as linhas existentes;
  - `permission_mode` text, com check em `bypass`, `accept_edits` e `ask_all`, default `bypass`;
  - `host_id` text null e `worker_id` text null;
  - `interrupt_requested_at` e `end_requested_at` null;
  - `prepared_at` null até o contexto, os anexos e o prompt final estarem prontos; o worker só assume sessões `opening`/`unconfirmed` preparadas;
  - o check de `status` ganha `asking` e `interrupted`.
- **`terminal_session_hosts`**: `host_id` text PK, `worker_id` text, `heartbeat_at` timestamptz. O serviço está "rodando" quando `heartbeat_at` tem menos de 15 s.
- **`task_terminal_messages`**: `id` uuid, `session_id` FK (cascade), `role` text (check: `user`, `assistant`, `system`; `system` guarda as notas de interrupção e de retomada), `content` text (≤ 50.000), `truncated` bool, `request_key` uuid null, `delivered_at` null (nulo em `user` = na fila), `undelivered` bool default false, `occurred_at`. Unique (`session_id`, `request_key`); índice (`session_id`, `occurred_at`).
- **`task_terminal_requests`**: `id` uuid, `session_id` FK (cascade), `kind` text (check: `question`, `permission`), `tool_use_id` text, `payload` jsonb (as perguntas, ou a ferramenta, o conteúdo exibido e a regra sugerida), `status` text (check: `pending`, `answered`, `cancelled`), `answer` jsonb null, `answered_by` FK users null, `created_at`, `answered_at` null. Índice (`session_id`, `status`).

**Dados existentes:** as sessões atuais ficam com `runtime = terminal` e continuam pela Spec B. A migration 0049 inicializa `prepared_at` nas sessões antigas ainda em `opening`/`unconfirmed`; isso só mantém o comportamento de abertura que já existia. A exclusão da Issue já apaga as sessões em cascata, o que cobre a REQ-062. Basta confirmar o `deletionPurge.ts` com as tabelas novas.

## 15. Interfaces e contratos

```ts
tasks.terminal.preflight → + { sessionService: { running: boolean } }
tasks.terminal.open({ ..., permissionMode: "bypass" | "accept_edits" | "ask_all" }) → { sessionId }
// erro novo: session_service_offline. Saem: terminal_unavailable e "GNOME Terminal não encontrado".

tasks.session.timeline({ projectId, taskId, sessionId, after?: string }) → {
  status; canControl: boolean; hiddenEntries: number; cursor: string;
  pending: { requestIds: string[] };
  entries: Array<
    | { type: "message"; id; role: "user" | "assistant" | "system"; content; truncated; queued; undelivered; at }
    | { type: "event"; id; kind; summary; at }
    | { type: "question"; id; status; questions: Question[]; answers?: Record<string, string[] | string>; at }
    | { type: "permission"; id; status; tool; display: { title; body }; suggestedRule: string | null;
        decision?: "allow" | "allow_always" | "deny"; reason?: string; at }> }
tasks.session.send({ projectId, taskId, sessionId, content, requestKey })
tasks.session.answerQuestion({ projectId, taskId, requestId, answers: Record<string, { labels: string[]; other?: string }> })
tasks.session.decidePermission({ projectId, taskId, requestId, decision, reason? })
tasks.session.interrupt({ projectId, taskId, sessionId }) / tasks.session.end(idem)
// erros: session_control_denied | session_not_active | request_closed | request_answered | message_invalid | answer_incomplete
```

**Porta do runtime** (o contrato que o supervisor e os fakes compartilham):

```ts
interface ClaudeSessionRuntime {
  start(input: { sessionId; cwd; prompt; contextDir; permissionMode; handlers: RuntimeHandlers }): RuntimeHandle;
  resume(input: { sessionId; claudeSessionId; cwd; contextDir; permissionMode; firstMessage; handlers }): RuntimeHandle;
}
interface RuntimeHandle { push(text: string): void; interrupt(): Promise<void>; close(): Promise<void>; }
type RuntimeHandlers = {
  onAssistantText(text: string): void; onHook(payload: HookPayload): void;
  onPermission(req: { toolName; input; toolUseId; suggestions }): Promise<PermissionResult>;
  onExit(outcome: { kind: "ended" | "crashed" | "failed"; detail?: string }): void;
};
```

As opções exatas do `query()` (`plugins`, `settingSources`, `pathToClaudeCodeExecutable`, `permissionMode` com `allowDangerouslySkipPermissions`, `toolConfig.askUserQuestion.previewFormat: "markdown"`, `hooks`, `resume`) foram fixadas no V-20 e estão em [v20-spike.md](v20-spike.md). No `answerQuestion`, a resposta de múltipla escolha segue como array; o SDK aceita array e texto separado por vírgula.

## 16. Fluxos principais

**Iniciar (REQ-051–054, REQ-081)**
1. `preflight` e `open` fazem as checagens da Spec A, mais o heartbeat do `host_id` local (`session_service_offline`). O `open` cria a sessão `opening` ainda não preparada; depois prepara `contexto/`, entrega os anexos, grava o prompt final e marca `prepared_at`.
2. O supervisor assume somente uma sessão `opening`/`unconfirmed` preparada, com `UPDATE … WHERE worker_id IS NULL`, para iniciar uma vez só; então lê o prompt completo e chama `runtime.start`.
3. A primeira mensagem do SDK grava `claude_session_id` e leva a sessão a `running`. Uma falha de spawn ou de login leva a `launch_failed` (REQ-054).

**Pedido (REQ-063–072)**
1. O broker grava o pedido `pending` com o payload do summarizer, e a sessão vai a `asking`.
2. A resposta passa pela REQ-080 e por `UPDATE … SET status = 'answered' WHERE status = 'pending'`; zero linhas resulta em `request_answered` ou `request_closed` (REQ-067).
3. O supervisor resolve a promessa com o `AnswerMapper`: perguntas viram `allow` com `updatedInput: { questions, answers }`; "Permitir sempre" leva `updatedPermissions` da sugestão, com destino `localSettings`; "Recusar" vira `deny` com o motivo. Sem pendentes, a sessão volta a `running`.

**Mensagem, interromper e encerrar (REQ-058–060, REQ-073–075)**
1. `send` insere a mensagem `user` com `request_key`, sem `delivered_at`. O supervisor passa as mensagens não entregues, em ordem, ao `handle.push` e grava `delivered_at`.
2. `interrupt` e `end` só gravam `*_requested_at`. Um `end` gravado antes de o serviço assumir a sessão impede o início do Claude: o serviço a encerra sem chamar o `runtime.start`. Uma interrupção sem vez ativa é descartada ao assumir, retomar ou marcar a sessão como órfã. O supervisor chama `interrupt()` ou `close()` e resolve os pendentes como `deny` ("Interrompido pela pessoa"). No `end`, a captura da Spec B roda como no `SessionEnd`.

**Reinício (REQ-076–079)**
1. Ao subir com um `worker_id` novo, o serviço leva a `interrupted` as sessões não finais do seu `host_id` que têm outro `worker_id`: grava a nota `system` e cancela os pedidos. Um `onExit(crashed)` faz o mesmo com uma sessão.
2. Uma mensagem numa sessão `interrupted` aciona `runtime.resume` com `claude_session_id`, e essa mensagem entra como `firstMessage`. Se não houver `claude_session_id`, ou se o `resume` falhar, a sessão vai a `ended` (`resume_failed`), e a mensagem fica `undelivered` (REQ-078).

## 17. Decisões técnicas

### DEC-15 — Sessão conduzida pelo Claude Agent SDK
- **Decisão:** `query()` do SDK no modo de entrada por streaming, com `canUseTool` para perguntas e aprovações e `interrupt()` para parar a vez.
- **Alternativas consideradas:**
  - xterm.js e node-pty, já recusados na Spec A: só emulam a tela, sem pedidos estruturados;
  - `claude -p --input-format stream-json` com o protocolo de controle feito à mão: é o que o SDK mantém oficialmente;
  - GNOME Terminal com hooks que bloqueiam: o terminal fica travado esperando a app (recusado pelo usuário).
- **Consequências:** pedidos tipados; dependência nova, com versão fixada; perdem-se o TTY e os comandos interativos (B-25).

### DEC-16 — Serviço próprio, sem watch, ligado à máquina
- **Decisão:** `terminalSessionsWorker` com `tsx` sem watch; só assume sessões do seu `host_id`.
- **Alternativas consideradas:** o `tasksWorker`, que roda com `tsx watch` e reiniciaria (matando a sessão) sempre que o Claude editasse o próprio Flow Dev; o servidor do Next, que recarrega módulos e não é dono natural de processos longos.
- **Consequências:** mais um processo no `pnpm dev`; mudar o código do serviço exige reiniciá-lo, e o reinício cai na REQ-076.

### DEC-17 — A app e o serviço conversam pelo Postgres
- **Decisão:** mensagens, respostas e controles são linhas; o serviço consulta a cada 1 s e a tela a cada 1,5 s. Exceção aprovada para respostas secretas do Codex: a aplicação envia o conteúdo por `pg_notify` efêmero ao worker, que só depois de receber e validar a notificação grava o marcador `(resposta oculta)` e resolve o runtime em memória.
- **Alternativas consideradas:** HTTP ou WebSocket entre os dois, com porta e autenticação novas (contra a NFR-12); persistir a resposta secreta em linha (contra REQ-118/NFR-20); `LISTEN/NOTIFY` para respostas comuns, desnecessário para a NFR-10.
- **Consequências:** respostas comuns continuam auditáveis e resistentes a reinícios. O segredo não é durável nem repetido: sem worker/listener ativo, pedido pendente ou confirmação do worker, a resposta falha sem gravar marcador. Uma queda após o consumo encerra a conversa sem replay. Essa exceção usa a conexão Postgres compartilhada e não abre uma porta nova.

### DEC-18 — Eventos da Spec B por callbacks de hook do SDK
- **Decisão:** sem `--settings` HTTP nas sessões novas; os callbacks dos mesmos seis hooks entregam o mesmo payload ao `TerminalEventController`.
- **Alternativas consideradas:** manter os hooks HTTP com token: dois caminhos de estado e um segredo sem necessidade.
- **Consequências:** sem token nem `privado/settings.json` nas sessões novas; as fixtures do V-15 valem, e o V-20 confirmou o payload de `UserPromptSubmit`, `PostToolUse` e `Stop`. `SessionStart` e `SessionEnd` não chegam pelo SDK (V-20h): o runtime os sintetiza, o primeiro ao receber a mensagem `init` e o segundo no fim da sessão. `Notification` não é entregue e deixa de ser necessário, porque o "Precisa de você" vem dos pedidos.

### DEC-19 — O `claude` do PATH, não o embutido no SDK
- **Decisão:** `pathToClaudeCodeExecutable` aponta para o `claude` achado pelo `ToolLocator`.
- **Alternativas consideradas:** o CLI do pacote, que pode diferir em versão e comportamento do que a pessoa usa e a REQ-012 confere.
- **Consequências:** atualizar o Claude Code pode mudar o protocolo; o V-20 registra a versão mínima, e o `preflight` a confere.

### DEC-20 — Modos de permissão mapeados para o SDK
- **Decisão:** os modos da 7.11 viram `bypassPermissions`, `acceptEdits` e `default`.
- **Alternativas consideradas:** `default` com um `canUseTool` que libera tudo menos as perguntas, plano B se o V-20 negar a P-10.
- **Consequências:** "Tudo liberado" se comporta como o `--dangerously-skip-permissions` de hoje. O V-20 confirmou o plano A (`bypassPermissions` com `allowDangerouslySkipPermissions`); o plano B não foi preciso.

### DEC-21 — Conversa e pedidos em tabelas próprias
- **Decisão:** `task_terminal_messages` e `task_terminal_requests`, separadas de `task_terminal_events`.
- **Alternativas consideradas:** novos tipos de evento, cujo `summary` tem 500 caracteres e não tem ciclo de vida.
- **Consequências:** a linha do tempo junta três fontes por horário; os eventos da Spec B ficam intactos.

## 18. Segurança, privacidade e permissões

- **Autorização no controller,** perto dos dados: REQ-080 conferida a cada chamada de `tasks.session.*` (B-22); leitura da tarefa em `timeline`. O serviço só aceita o que a NFR-12 permite e usa o `checkout_path` gravado na abertura.
- **Respostas validadas contra o payload:**
  - `answerQuestion` só aceita rótulos que existem no pedido, ou o texto de "Outra" dentro do limite;
  - "Permitir sempre" usa a regra sugerida que ficou gravada; a pessoa não escreve uma regra livre.
- **Conteúdo guardado** (NFR-13): comandos e edições propostas podem ter segredos e são visíveis a quem vê a tarefa, como os artefatos. O Markdown é renderizado com o HTML escapado (NFR-09).
- **"Tudo liberado" continua padrão:** é o mesmo risco da Spec A, com a trava `FLOW_DEV_TERMINAL_ENABLED`.

## 19. Observabilidade

Logs com o prefixo `[session]`:
- serviço iniciado, com o `host_id` e quantas órfãs foram marcadas;
- sessão assumida, iniciada, retomada, interrompida, encerrada ou com falha (motivo, sem o conteúdo);
- pedido aberto e respondido (tipo e ferramenta, sem a entrada);
- erros do SDK.

O heartbeat em `terminal_session_hosts` serve como verificação de saúde no `preflight`.

## 20. Migração, rollout e reversão

**Ordem:**
1. V-20 registrado.
2. Migration 0048.
3. Serviço de sessões e runtime.
4. Mudança no `open`, com o lançador do GNOME removido.
5. UI.

O `pnpm dev` passa a subir o serviço; em produção, roda-se `pnpm --dir packages/api sessions:worker`. As sessões antigas que ainda estiverem abertas no terminal continuam recebendo eventos pelo endpoint HTTP.

**Rollback:** reverter o código traz de volta o terminal. As sessões `flow_dev` ativas ficam sem serviço e, na Spec B, aparecem como "Não confirmada" ou no último estado. O rollback da migration apaga as conversas e os pedidos; exporte `task_terminal_messages` antes, se houver conversas que importam.

## 21. Riscos técnicos

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| O SDK com o `claude` do PATH não usa o login local, ou não carrega o plugin `flow-dev` | baixa | alto | V-20 primeiro; o `claude -p` já roda por assinatura |
| As perguntas não chegam ao `canUseTool` em `bypassPermissions` | média | alto | V-20; plano B da DEC-20 |
| O `resume` não restaura uma vez cortada no meio de uma ferramenta | média | médio | V-20; REQ-078 encerra com uma mensagem clara |
| Um processo de longa duração vaza memória ou fica órfão | média | médio | heartbeat; `close()` no fim; `processGroup` dos agentes reaproveitado para matar o grupo |
| Uso da assinatura pelo SDK fora do que os termos da Anthropic permitem | baixa | alto | uso pessoal, na própria máquina, igual aos agentes locais; revisar os termos antes de distribuir o Flow Dev a terceiros |
| O polling de 1 s pesa com muitas sessões | baixa | baixo | índices em `status` e `delivered_at`; `LISTEN/NOTIFY` fica como evolução |

---

# Parte 3 — Verificação

## 22. Estratégia de testes

Base: `software-testing` (uma ficha de risco por linha, fronteiras reais).

- **Fronteiras reais:**
  - Postgres descartável (`packages/api test:integration`) em tudo que envolve fila, idempotência, `UPDATE … WHERE status` e recuperação, porque o risco ali é SQL e concorrência;
  - a renderização real dos componentes (RTL).
- **Dublês:**
  - o `ClaudeSessionRuntime` é trocado pelo `ScriptedSessionRuntime`, porque o Claude real é lento, custa e varia;
  - o relógio é controlado nos testes de 60 s e de heartbeat;
  - a compatibilidade com o SDK real é provada à parte, no V-20 e no V-31.
- **Uma jornada e2e:** iniciar → texto → pergunta → aprovação → mensagem → encerrar, com o serviço rodando o runtime roteirizado.
- **Sem prova automática:** a compatibilidade real do SDK com o Claude Code instalado, que fica com o smoke manual (V-20, V-31).

## 23. Matriz de verificação

| ID | Cobre | Falha que detecta | Fronteira real | Casos (resumo) |
|---|---|---|---|---|
| V-20 | P-09–P-11, DEC-15, DEC-18–20, B-25 | o SDK não faz o que a spec supõe | spike manual, Claude real, repositório temporário | login local; skill do plugin pelo prompt; pergunta em `bypassPermissions`; `localSettings` grava e vale na sessão seguinte; `resume` após `kill -9`; `interrupt()` num `sleep 30`; hooks iguais às fixtures do V-15; pedido aberto 30 min; `/exit` |
| V-21 | 7.2, REQ-017, REQ-081, REQ-082 | transição proibida aceita | máquina de estados pura | transições novas; finais continuam finais; `asking` só sai sem pendentes |
| V-22 | 7.9, 7.10, 7.5, REQ-063, REQ-064, REQ-066, REQ-070 | rótulo inexistente aceito; regra livre em "Permitir sempre"; corte errado | summarizer e mapeador puros | única, várias, múltipla; "Outra" no limite e acima; cada ferramenta da 7.10; 20.000 cortados |
| V-23 | REQ-058–060, REQ-067, REQ-080, 7.4, B-22 | quem não pode controla; mensagem ou resposta dupla | `SessionInteractionController` + Postgres | operadora que não abriu, membro e ex-operadora recusados; mesmo `requestKey` gera uma linha; respostas concorrentes: uma vence; limites da mensagem; sessão final recusa |
| V-24 | REQ-051–054, REQ-065, REQ-068, REQ-069, REQ-071, REQ-072, NFR-12, B-27, B-31 | sessão de outra máquina assumida; resposta não chega; início duplo | supervisor + Postgres + runtime roteirizado | só o próprio `host_id`; dois ciclos assumem uma vez; resposta resolve com `updatedInput`; "Permitir sempre" com `localSettings`; "Tudo liberado" sem aprovação; pedido segue pendente sem a web; falha de spawn leva a `launch_failed` |
| V-25 | REQ-073–075, B-30 | interrupção não cancela pedidos; encerrar sem captura | supervisor + Postgres + roteiro + clone temporário | interrupt cancela pendentes; sem vez ativa não faz nada; end captura o `.md` e leva a `ended` |
| V-26 | REQ-076–079, NFR-11, B-23 | órfã fica "Em andamento"; retomada sozinha; mensagem perdida | supervisor + Postgres + roteiro, relógio controlado | `worker_id` novo marca `interrupted` com a nota; mensagem na fila retoma; sem `claude_session_id`: `ended` e "Não entregue" |
| V-27 | REQ-055–057, REQ-061, REQ-062, NFR-13, B-24, B-29 | raciocínio, saída ou subagente gravados; sobra depois da exclusão | roteiro → recorder + Postgres; expurgo | só o assistente principal; 50.000 cortado; eventos iguais aos do caminho HTTP; exclusão apaga tudo; cursor e 200 entradas |
| V-28 | US-06–US-09 na tela, REQ-063–066, REQ-070, REQ-075, NFR-14, B-22, B-28 | enviar sem todas as respostas; controles para quem só lê | componentes (RTL) | opções, prévia, múltipla, "Outra"; aprovação com regra e motivo; "Na fila"; confirmação ao encerrar; leitura para os outros e nos finais; "Aberta no terminal"; `aria-live`; Ctrl+Enter |
| V-29 | REQ-052, REQ-053, 7.11, US-08.1 | padrão diferente de "Tudo liberado"; confirmação com o serviço fora | diálogo (RTL) + `open` com Postgres | três modos e o padrão; serviço fora bloqueia a tela e o `open`; `permission_mode` gravado |
| V-30 | US-06–US-09 ponta a ponta | partes desconectadas | Playwright + web + serviço com roteiro + Postgres de teste | inicia em "Aceitar edições"; texto; 2 perguntas; permite um comando; mensagem; encerra; outra pessoa em leitura |
| V-31 | US-07, US-08.3, US-10 com o Claude real, B-26 | o que o roteiro não reproduz | smoke manual pela UI | spec-writer respondida pela tela; "Permitir sempre" grava no clone; reiniciar e retomar |
| V-32 | Seção 9, REQ-014 | regressão nas Specs A e B | testes existentes + Postgres | prompt, anexos e skills; captura; sessões antigas; agentes de planejamento; `FLOW_DEV_TERMINAL_ENABLED`; segunda sessão |

## 24. Definição de pronto

- V-20 executado e registrado em `docs/specs/sessao-no-flow-dev/v20-spike.md`, com a §15 e a DEC-20 ajustadas ao resultado.
- `pnpm --dir packages/api test` e `pnpm --dir packages/api test:integration` passando.
- `pnpm --dir apps/web test` e o spec e2e novo (`pnpm --dir apps/web test:e2e e2e/session-conversation.spec.ts`), mais os afetados `terminal-execution.spec.ts` e `terminal-tracking.spec.ts`, passando.
- `pnpm typecheck`, `pnpm lint` e `pnpm build` passando.
- Smoke V-31 feito uma vez pela UI.
- Specs A e B com os itens substituídos marcados; esta spec atualizada com o que mudou na implementação.

---

## Questões em aberto

Nenhuma de produto. As premissas P-09 a P-11 são fatos a confirmar no V-20; se uma falhar, o plano B está na DEC-20 e nos riscos.

## Sugestões fora do escopo

- Aviso no título da aba ou notificação do navegador quando o Claude precisar de você: tira a necessidade de ficar olhando a tarefa.
- Destaque "Precisa de você" na fila e no quadro.
- Trocar o modo de permissões durante a sessão (o `setPermissionMode` do SDK permite).
- `LISTEN/NOTIFY` no lugar do polling, se a latência incomodar.
- Remover o endpoint de eventos HTTP e o token da Spec B quando não houver mais sessões `runtime = terminal` ativas.
- Carregar entradas anteriores às 200 mais recentes da conversa.

## Histórico

- 2026-11-22 — Criação da spec. Decisões do usuário: substituir o terminal; as quatro interações (perguntas, próxima mensagem, interromper e encerrar, aprovar ferramentas); texto do Claude mais resumos; conversa no Postgres; "Tudo liberado" como padrão; "Permitir sempre" gravado no projeto; após reinício, "Interrompida" e retomada com a mensagem da pessoa.
- 2026-11-23 — V-20 executado (`v20-spike.md`): P-09, P-10 e P-11 confirmadas; DEC-20 fica no plano A. Mudou o V-20h: o SDK não entrega `SessionStart`, `SessionEnd` nem `Notification` aos callbacks, e a DEC-18 passa a sintetizar os dois primeiros no runtime. No V-20b, o prompt `/flow-dev:…` aciona a skill sem chamada da ferramenta Skill.
- 2026-11-23 — Implementada (tarefas 01 a 07, `_tasks.md`). Desvios em relação ao plano:
  - o prompt final fica em `<sessão>/prompt.md` (sem coluna nova) e o serviço o lê ao iniciar;
  - a `timeline` devolve, além das entradas novas, as que mudaram depois do cursor (pedido respondido, mensagem entregue ou não entregue), e o cliente troca por `id`; o cursor é o instante da última mudança, com 2 s de folga;
  - a leitura da `timeline` usa `requireRead` com memória de 5 s, e quem não vê o projeto recebe `NOT_FOUND`, como o resto do produto, e não `FORBIDDEN`;
  - `claimOpening` também assume sessões "Não confirmada" sem dono (a 7.2 as leva a "Em andamento");
  - o serviço é uma lista de passos (`OrphanRecoveryStep`, `OpeningStep`, `SessionResumeStep`, `MessageDeliveryStep`, `AnswerDispatchStep`, `SessionControlsStep`) e usa um `SessionStatusDao` para as transições;
  - `ClaudeSessionSettingsWriter` virou `FileSessionSettingsRemover` (as sessões antigas ainda apagam o token ao terminar);
  - o botão que confirma o encerramento diz "Encerrar sessão";
  - **B-26 não se confirmou** (acima);
  - os e2e V-30a, V-30b e V-32g estão escritos e `test.fixme`, como os V-10a e V-19 (a tela do trabalho exige GitHub controlado); o smoke V-31 foi feito pelas procedures com o Claude real, e a passada manual pela UI continua pendente;
  - o `SessionStart` e o `SessionEnd` são sintetizados pelo runtime (V-20h), e a autenticação falha (`authentication_failed`) antes de qualquer texto é tratada como "Falhou ao abrir".
  - correções da review-001: parar o serviço agora abandona os processos do Claude em vez de encerrar as sessões (`RuntimeHandle.abandon()`), para a REQ-076 valer também na parada normal; o roteiro dos e2e é por clone; o `workSeed` foi corrigido.
