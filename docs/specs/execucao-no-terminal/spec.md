# Spec A: Abrir a execução no terminal a partir do planejamento aprovado

> **Status:** Implementada · **Data:** 2026-11-22 · **Nível:** L4 ancorada (vai para spec-to-tasks) · **Par:** [Spec B — Acompanhamento e artefatos](../acompanhamento-e-artefatos/spec.md), que depende desta
> **Contexto lido:** `apps/web/PRODUCT.md`, `apps/web/src/features/issues/assigned-work/` (`components/PlanningActions.tsx`, `components/PlanningDecisionView.tsx`, `planningPermissions.ts`, `planningCopy.ts`, `workState.ts`), `apps/web/src/features/issues/issue-composer/issueImageModel.ts`, `apps/web/src/features/projects/project-settings/`, `apps/web/src/app/api/task-images/route.ts`, `packages/api/src/infra/agents/` (`agentProviderInfo.ts`, `agentProcess.ts`), `packages/api/src/infra/database/schema/` (`localMachines.ts`, `projectAgentSettings.ts`, `tasks/planning.ts`, `tasks/sources.ts`, `tasks/images.ts`), `packages/api/src/infra/database/dao/issue-deletion/deletionPurge.ts`, `.claude/skills/` (spec-writer, spec-to-tasks, direct-executor, spec-conformance), `docs/specs/agentes-locais-por-assinatura/spec.md`, documentação do Claude Code (`--add-dir` carrega `.claude/skills/` do diretório adicionado).

## Resumo para revisão

- **O que muda:**
  - Com o planejamento aprovado, a pessoa operadora aciona "Abrir no terminal". Um diálogo mostra a pasta, a branch e um prompt editável que já aciona a skill da rota (`/flow-dev:direct-executor` ou `/flow-dev:spec-writer`).
  - No mesmo diálogo, ela anexa imagens, PDFs e arquivos de texto; as imagens da Issue já vêm marcadas.
  - Ao confirmar, abre-se o GNOME Terminal na pasta do clone com o Claude Code com todas as permissões, as skills do Flow Dev disponíveis e o prompt já enviado.
  - Cada pessoa vincula o próprio clone ao projeto nas Configurações.
- **Por quê:** hoje o fluxo para na aprovação, e começar exige montar terminal, pasta, contexto e prompt à mão.
- **Decisões principais:**
  - DEC-01: terminal nativo disparado pelo servidor local.
  - DEC-06: tabela nova de vínculo por pessoa e projeto.
  - DEC-09: anexos enviados um a um e guardados em disco por 7 dias.
  - DEC-10: anexos citados por caminho no prompt.
  - DEC-11: skills do Flow Dev copiadas para uma pasta de contexto da sessão, passada com `--plugin-dir`.
- **Riscos principais:**
  - Um endpoint web que dispara um processo com todas as permissões na máquina. Mitigação: NFR-01, P-01 e Q-01.
  - Diferenças de comportamento do GNOME Terminal e do carregamento de skills, a provar no spike V-00 antes do resto.
- **Como vamos verificar:**
  - unitários do montador de prompt, do validador de remote e da validação de anexos;
  - integração com o Postgres de teste e repositórios git temporários;
  - e2e com lançador falso;
  - smoke manual (V-00, V-10).
- **Pendências:**
  - Q-01: exigir uma variável para ligar a abertura.
  - Q-02: textos padrão por rota.
  - Q-03: conflito de nome com skills do repositório.

---

# Parte 1 — Produto

## 1. Contexto e problema

Depois de publicar a Issue, o agente de planejamento recomenda uma rota (Execução direta, Tech Spec ou PRD), e a pessoa operadora aprova a rota salva. A tela então diz que nenhuma atividade seguinte foi iniciada. A etapa de execução antiga foi removida e ainda não foi reescrita.

O Flow Dev roda na máquina da pessoa, onde o Claude Code já está logado (premissa P-01 da spec de agentes locais), mas não sabe onde fica o clone de cada repositório. O usuário criou, neste repositório, as skills que devem conduzir o trabalho: spec-writer, spec-to-tasks, direct-executor e spec-conformance. Os repositórios dos projetos não têm essas skills.

## 2. Usuários e papéis

- **Pessoa operadora** (quem assumiu a Issue): abre a execução e escolhe os anexos.
- **Membro com acesso ao projeto:** vincula o próprio clone local.
- **Administrador:** não ganha nenhum poder novo; o vínculo local é pessoal.

## 3. Objetivos

- **G1:** partir do planejamento aprovado para uma sessão do Claude Code no repositório certo em um clique, com um prompt que a pessoa revisa antes.
- **G2:** cada pessoa registra uma vez onde está o clone de cada projeto, e o Flow Dev confere que é o repositório certo.
- **G3:** a sessão trabalha com as skills do Flow Dev, seja qual for o repositório.
- **G4:** mandar, junto do prompt, contexto que não está no texto da Issue: imagens, PDFs e arquivos de texto.

## 4. Fora de escopo

- **Acompanhar a sessão e guardar os artefatos:** ficam na Spec B.
- **Terminal embutido no navegador:** decidido terminal nativo (DEC-01).
- **Codex ou outros agentes:** o pedido é o Claude Code.
- **Mudar o status da tarefa na fila ou no quadro:** decidido não mexer no modelo de estados.
- **Abrir a execução antes da aprovação:** decidido só depois de aprovar.
- **Bloquear a abertura com mudanças não commitadas:** decidido só avisar.
- **Clonar o repositório automaticamente:** a pessoa vincula um clone que já existe.
- **Terminais além do GNOME Terminal:** é o ambiente atual (P-02).
- **Anexos em formatos que o Claude não lê** (docx, xlsx, zip): decidido aceitar imagens, PDF e texto.
- **Guardar os anexos para sempre:** decidido apagar depois de 7 dias.
- **Entregar outras skills do Flow Dev** (layered-backend, trpc-nextjs etc.): são regras deste monorepo, não dos projetos.

## 5. Histórias de usuário

### US-01 — Vincular meu repositório local ao projeto (P1)
Como membro do projeto, quero informar a pasta do meu clone local, para que o Flow Dev abra o Claude no repositório certo.
- **Por que P1:** sem vínculo, não há onde abrir a execução.
- **Teste independente:** salvar uma pasta válida nas Configurações e vê-la como "Verificada", sem tocar em nenhuma tarefa.
- **Cenários de aceite:**
  1. **Dado** o projeto `acme/shop` e um clone em `/home/ana/código/shop` com o remote `git@github.com:acme/shop.git`, **quando** Ana salva essa pasta, **então** a seção "Meu repositório local" mostra a pasta e a data da verificação.
  2. **Dado** a pasta `/home/ana/código/blog`, cujo remote é `acme/blog`, **quando** Ana salva, **então** o Flow Dev recusa com "Esta pasta não é um clone de acme/shop. Remotes encontrados: acme/blog.", e o vínculo anterior continua.
  3. **Dado** que Ana vinculou a pasta dela, **quando** Bruno abre as Configurações do mesmo projeto, **então** vê a própria seção vazia, sem a pasta de Ana.

### US-02 — Abrir a execução no terminal com um prompt editável (P1)
Como pessoa operadora, quero abrir o Claude Code no terminal a partir do planejamento aprovado, com um prompt da tarefa que aciona a skill certa e que eu posso ajustar, para começar o trabalho sem montar o contexto à mão.
- **Por que P1:** é o pedido central.
- **Teste independente:** com um vínculo válido e o planejamento aprovado, acionar a abertura, editar o prompt, confirmar e ver a janela do terminal com o Claude recebendo o texto editado.
- **Cenários de aceite:**
  1. **Dado** a Issue #42 "Trocar 'Entar' por 'Entrar'", com Execução direta aprovada e o vínculo de Ana válido na branch `main` sem mudanças, **quando** Ana aciona "Abrir no terminal", **então** o diálogo mostra a pasta, "Branch: main" e um prompt que começa por `/flow-dev:direct-executor` e contém o título, o link e o corpo da Issue.
  2. **Dado** o mesmo diálogo, **quando** Ana acrescenta "Use o componente Button existente." e confirma, **então** abre uma janela de terminal na pasta vinculada, e o Claude Code inicia com todas as permissões liberadas, com a skill direct-executor disponível, recebendo como primeira mensagem o texto editado.
  3. **Dado** uma Issue com rota Tech Spec aprovada num repositório que não tem a skill spec-writer, **quando** Ana confirma a abertura, **então** o Claude aciona a spec-writer do Flow Dev.
  4. **Dado** que a branch atual tem 3 arquivos modificados, **quando** o diálogo abre, **então** aparece o aviso "Há mudanças não commitadas nesta pasta. O Claude vai trabalhar sobre elas.", e a abertura continua permitida.
  5. **Dado** que Ana não vinculou o clone, **quando** aciona "Abrir no terminal", **então** o diálogo explica que falta o vínculo, leva às Configurações do projeto e não oferece a confirmação.

### US-04 — Mandar mais contexto ao abrir (P2)
Como pessoa operadora, quero anexar imagens, PDFs e arquivos de texto ao prompt de abertura, para que o Claude comece com o contexto que não está na Issue.
- **Por que P2:** US-02 já abre sem anexos; os anexos completam o contexto.
- **Teste independente:** anexar um PDF e um print, abrir e pedir ao Claude, no terminal, que descreva os anexos.
- **Cenários de aceite:**
  1. **Dado** a Issue #42 com 2 imagens anexadas no composer, **quando** Ana abre o diálogo, **então** "Anexos" lista as 2 imagens já marcadas, com nome e tamanho.
  2. **Dado** o diálogo, **quando** Ana anexa `fluxo-login.pdf` (2 MB) e `erro.log` (40 KB) e confirma, **então** o prompt que chega ao Claude termina com a seção "Anexos", que lista os 4 arquivos com o caminho local de cada um, e o Claude consegue lê-los.
  3. **Dado** o diálogo, **quando** Ana tenta anexar `planilha.xlsx`, **então** o arquivo é recusado com "Tipo não aceito. Envie imagens (PNG, JPEG, GIF, WebP), PDF ou arquivos de texto.", e os outros anexos continuam.
  4. **Dado** 10 anexos marcados, **quando** Ana tenta anexar o 11º, **então** o diálogo recusa com "Limite de 10 arquivos por abertura."

US-03 e US-05 estão na Spec B.

## 6. Requisitos funcionais

**Vínculo local**
- **REQ-001** (US-01): O sistema DEVE permitir que cada pessoa com acesso ao projeto salve, troque e remova um vínculo próprio entre o projeto e uma pasta local.
- **REQ-002** (US-01): QUANDO a pessoa salvar uma pasta, o sistema DEVE aceitá-la só se as quatro validações da seção 7.1 passarem.
- **REQ-003** (US-01): SE uma validação falhar, ENTÃO o sistema DEVE recusar com a mensagem da seção 7.1 e manter o vínculo anterior.
- **REQ-004** (US-01): O sistema DEVE mostrar a cada pessoa apenas o próprio vínculo.

**Abertura**
- **REQ-005** (US-02): ENQUANTO o planejamento estiver aprovado, o sistema DEVE oferecer a ação "Abrir no terminal" à pessoa operadora, e a ninguém mais.
- **REQ-006** (US-02): QUANDO a pessoa acionar a ação com vínculo válido, o sistema DEVE mostrar um diálogo com a pasta vinculada, a branch atual e o prompt pré-preenchido num campo editável.
- **REQ-007** (US-02): O sistema DEVE montar o prompt pré-preenchido conforme a seção 7.3, a partir da Issue publicada que o planejamento aprovado analisou.
- **REQ-008** (US-02): SE a pasta vinculada tiver mudanças não commitadas, ENTÃO o diálogo DEVE mostrar o aviso do cenário US-02.4 sem bloquear a abertura.
- **REQ-009** (US-02): SE a pessoa não tiver vínculo para o projeto, ENTÃO o diálogo DEVE explicar a falta, oferecer o caminho para as Configurações e não oferecer a confirmação.
- **REQ-010** (US-02): QUANDO a pessoa confirmar, o sistema DEVE abrir uma janela de terminal na pasta vinculada, com o Claude Code em modo interativo, todas as permissões liberadas e o texto editado (mais a seção "Anexos", se houver) como primeira mensagem.
- **REQ-011** (US-02): SE, no momento de confirmar, a pasta não passar mais nas validações da seção 7.1, ENTÃO o sistema DEVE recusar com "A pasta vinculada não é mais um clone válido de <owner/repo>. Atualize o vínculo nas Configurações." e não abrir nada.
- **REQ-012** (US-02): SE o Claude Code ou o terminal não estiverem disponíveis na máquina, ENTÃO o sistema DEVE recusar com uma mensagem que nomeia o que falta ("Claude Code não encontrado no PATH." ou "GNOME Terminal não encontrado.").
- **REQ-013** (US-02): SE o prompt estiver vazio ou passar de 20.000 caracteres, ENTÃO o sistema DEVE impedir a confirmação e mostrar o limite.
- **REQ-014:** movido para a Spec B.
- **REQ-015** (US-02): SE a mesma confirmação for enviada duas vezes (duplo clique ou reenvio após perder a resposta), ENTÃO o sistema DEVE abrir uma única janela e devolver a mesma sessão.
- **REQ-016 a REQ-024:** movidos para a Spec B.
- **REQ-025** (US-02, US-04): QUANDO a Issue for excluída do Flow Dev, o sistema DEVE excluir junto as sessões e os anexos da tarefa, tanto os registros quanto os arquivos.
- **REQ-026:** movido para a Spec B.

**Anexos**
- **REQ-027** (US-04): O diálogo de abertura DEVE permitir anexar arquivos dos tipos da seção 7.6, por seleção e por arrastar e soltar.
- **REQ-028** (US-04): QUANDO o diálogo abrir, o sistema DEVE listar as imagens da Issue publicada como anexos já marcados, na ordem em que aparecem no corpo, e a pessoa pode desmarcá-las.
- **REQ-029** (US-04): SE um arquivo for de tipo não aceito, ou o conteúdo não corresponder ao tipo, ENTÃO o sistema DEVE recusá-lo com a mensagem da seção 7.6, sem afetar os demais.
- **REQ-030** (US-04): SE um anexo passar de 10 MB, ou a abertura passar de 10 arquivos ou de 30 MB somados (contando as imagens da Issue marcadas), ENTÃO o sistema DEVE recusar o anexo que estoura e dizer qual limite.
- **REQ-031** (US-04): QUANDO a pessoa confirmar, o sistema DEVE entregar os anexos marcados como arquivos locais que o Claude pode ler e acrescentar ao fim do prompt a seção "Anexos" da seção 7.3.
- **REQ-032** (US-04): ENQUANTO um anexo estiver sendo enviado, o diálogo DEVE mostrar o progresso dele e impedir a confirmação; SE o envio falhar, ENTÃO o diálogo DEVE oferecer "Tentar de novo" só para esse anexo.
- **REQ-033** (US-04): O sistema DEVE apagar os arquivos dos anexos 7 dias depois do último sinal da sessão. A abertura conta como sinal; com a Spec B, cada evento e o encerramento também contam.
- **REQ-034:** movido para a Spec B.
- **REQ-035** (US-04): SE a pessoa fechar o diálogo sem abrir a sessão, ENTÃO o sistema DEVE descartar os anexos enviados em até 24 h.

**Skills do Flow Dev**
- **REQ-036** (US-02): O sistema DEVE disponibilizar à sessão as skills da seção 7.7, mesmo que o repositório do projeto não as tenha.
- **REQ-037** (US-02): O prompt pré-preenchido DEVE começar pelo comando da skill da rota aprovada (seção 7.3).
- **REQ-038** (US-02): SE uma skill da seção 7.7 não existir no Flow Dev no momento de abrir, ENTÃO o sistema DEVE recusar com "Skill <nome> não encontrada no Flow Dev." e não abrir nada.
- **REQ-039** (US-02): O sistema DEVE entregar a cada sessão as skills como estavam no momento da abertura; mudanças posteriores nas skills do Flow Dev não alteram sessões já abertas.
- **REQ-040** (US-02): QUANDO a sessão abrir, a tarefa DEVE mostrar "Execução aberta no terminal por <pessoa> às HH:MM" no lugar de "A próxima atividade ainda não foi iniciada."

## 7. Regras de negócio

### 7.1 Validação do vínculo (na hora de salvar e de novo na hora de abrir)

| # | Regra | Mensagem ao falhar |
|---|---|---|
| 1 | Caminho absoluto, até 1.024 caracteres | "Informe o caminho completo da pasta, começando por /." |
| 2 | A pasta existe e pode ser lida | "Pasta não encontrada: <caminho>." |
| 3 | A pasta é a raiz de um repositório git | "Esta pasta não é a raiz de um repositório git." ou, numa subpasta, "Escolha a raiz do repositório: <raiz>." |
| 4 | Algum remote aponta para o repositório do projeto (HTTPS ou SSH, com ou sem `.git`, sem diferenciar maiúsculas) | "Esta pasta não é um clone de <owner/repo>. Remotes encontrados: <lista>." |

### 7.2 Estados da sessão
Na Spec B.

### 7.3 Prompt pré-preenchido

Ordem:
1. comando e instrução da rota;
2. `Issue #<n> — <título>` e o link;
3. corpo da Issue;
4. `Rota aprovada: <rota> · Complexidade: <nível>`;
5. motivos do planejamento, em lista;
6. pendências informadas, em lista ("Nenhuma" se vazio);
7. se houver anexos, a seção `Anexos (leia antes de começar):`, com uma linha por anexo: nome original, tipo e caminho local absoluto.

A seção Anexos é acrescentada na confirmação, fora do campo editável, e não conta no limite de 20.000; o diálogo mostra uma prévia dela. Se o total passar de 20.000 caracteres, o corpo é cortado e termina em "[corpo cortado — leia a Issue completa no link]".

Comando e instrução por rota (texto inicial, ver Q-02):
- **Execução direta:** "/flow-dev:direct-executor Implemente a Issue abaixo. Rode as verificações do projeto antes de terminar e resuma o que mudou e o que foi verificado. Não faça commit, push nem PR sem eu pedir."
- **Tech Spec ou PRD** (um texto só, porque a spec-writer produz num único documento a parte de produto e a técnica e decide sozinha o nível de detalhe): "/flow-dev:spec-writer Escreva a spec da Issue abaixo e pare para minha revisão. Não implemente ainda."

### 7.4 Permissões

| Ação | Operadora | Membro com acesso | Admin (sem ser operadora) |
|---|---|---|---|
| Salvar, trocar ou remover o próprio vínculo | sim | sim | sim |
| Ver o vínculo de outra pessoa | não | não | não |
| Abrir no terminal (planejamento aprovado) | sim | não | não |
| Anexar arquivos e marcar ou desmarcar as imagens da Issue | sim | não | não |

### 7.5 Limites

- **Prompt editável:** 1 a 20.000 caracteres.
- **Caminho:** até 1.024 caracteres.
- **Anexos:** 10 arquivos e 30 MB somados por abertura, 10 MB por arquivo, nome original de até 255 caracteres; ficam 7 dias (REQ-033).

### 7.6 Anexos

| Tipo | Aceito quando | Mensagem ao recusar |
|---|---|---|
| Imagem | PNG, JPEG, GIF ou WebP, com a assinatura do formato no início do arquivo | "Tipo não aceito. Envie imagens (PNG, JPEG, GIF, WebP), PDF ou arquivos de texto." |
| PDF | Começa com `%PDF` | a mesma |
| Texto | Extensão `.md .txt .json .csv .yaml .yml .xml .log .html .css .sql .ts .tsx .js .jsx .py .go .rs .java .rb .php .sh`, conteúdo UTF-8 válido, sem bytes nulos | a mesma |
| Tamanho | até 10 MB | "Arquivo maior que 10 MB." |
| Quantidade e total | até 10 arquivos e 30 MB somados | "Limite de 10 arquivos por abertura." ou "Os anexos passariam de 30 MB." |
| Repetido | mesmo conteúdo já anexado | "Este arquivo já está anexado." (mantém o primeiro) |

### 7.7 Skills entregues à sessão

As skills vêm de `.claude/skills/` do Flow Dev: **spec-writer**, **spec-to-tasks**, **direct-executor** e **spec-conformance**. A rota escolhe a skill do comando inicial: Execução direta usa direct-executor; Tech Spec e PRD usam spec-writer. As outras ficam disponíveis para a pessoa acionar na mesma sessão, por exemplo `/spec-to-tasks` depois de aprovar a spec.

## 8. Casos de borda e erros

| ID | Situação | Comportamento esperado | Ref. |
|---|---|---|---|
| B-01 | Refazer o planejamento depois de uma sessão | A ação some enquanto a nova recomendação está em revisão e volta com a nova aprovação, usando a nova rota | REQ-005 |
| B-02 | O remote `origin` é um fork, e o `upstream` é `acme/shop` | Aceita, porque um remote bate | 7.1 #4 |
| B-03 | HEAD destacado | O diálogo mostra "HEAD destacado (a1b2c3d)" no lugar da branch | REQ-006 |
| B-04 | A pessoa deixa de ser operadora com o diálogo aberto | A confirmação é recusada com a mensagem de permissão atual | REQ-005 |
| B-08 | Caminho com espaços e acentos (`/home/ana/Área de trabalho/shop`) | Vincula e abre normalmente | REQ-002, REQ-010 |
| B-09 | Prompt com aspas, `$(...)`, crases e quebras de linha | Chega ao Claude exatamente como digitado | NFR-01 |
| B-12 | Issue com mais de 10 imagens | Marca as 10 primeiras e avisa "N imagens da Issue ficaram desmarcadas pelo limite." | REQ-028, REQ-030 |
| B-13 | Nome de arquivo com acentos, espaços, `../` ou `/` | O arquivo é gravado com um nome gerado e seguro; o nome original aparece no prompt | NFR-06 |
| B-14 | A pessoa retoma a sessão no terminal depois dos 7 dias | Os anexos não existem mais | REQ-033 |
| B-15 | Uma imagem da Issue some do Flow Dev entre o diálogo e a confirmação | A sessão abre sem ela, com o aviso "1 imagem da Issue não está mais disponível." | REQ-031 |
| B-16 | A pessoa apaga o comando da skill do prompt | A sessão abre sem acionar skill nenhuma, e as skills continuam disponíveis | REQ-036 |

B-05, B-06, B-07, B-10 e B-11 estão na Spec B.

## 9. Comportamento que não muda

- QUANDO o planejamento for aprovado, o sistema DEVE CONTINUAR A não iniciar nenhuma atividade sozinho; a sessão só abre pela ação da pessoa.
- QUANDO uma sessão abrir, o sistema DEVE CONTINUAR A manter o status do planejamento, da tarefa, da fila e do quadro como estão.
- O sistema DEVE CONTINUAR A não escrever no GitHub; o que o Claude fizer no terminal é responsabilidade da sessão da pessoa.
- QUANDO o Issue Author ou o Planejamento rodarem, o sistema DEVE CONTINUAR A usar a configuração isolada de hoje, sem as skills nem os anexos desta feature.
- O sistema DEVE CONTINUAR A restringir a edição dos detalhes, do quadro e dos agentes do projeto aos administradores.
- QUANDO não houver nenhuma sessão, a tela aprovada DEVE CONTINUAR A mostrar "A próxima atividade ainda não foi iniciada."
- QUANDO a pessoa anexar imagens no composer da Issue, o sistema DEVE CONTINUAR A guardá-las e publicá-las como hoje; a abertura só lê essas imagens.
- O sistema NÃO DEVE alterar a configuração global do Claude Code da pessoa (`~/.claude`) nem o repositório do projeto para entregar as skills.

## 10. Requisitos não funcionais

- **NFR-01** (segurança): a abertura DEVE executar só o Claude Code com argumentos fixos, mais o prompt como um único argumento literal, sem passar por um shell. A pasta DEVE vir do vínculo salvo e validado, nunca da requisição.
- **NFR-05** (acessibilidade): o diálogo tem rótulos em todos os campos, prende o foco e fecha com Esc. O contador de caracteres, o progresso e os erros dos anexos são anunciados.
- **NFR-06** (segurança): os anexos DEVEM ser gravados com nomes gerados pelo sistema, numa pasta da sessão fora do clone, legível só pelo dono. Só a pessoa operadora da tarefa pode enviá-los.

NFR-02, NFR-03 e NFR-04 estão na Spec B.

## 11. Premissas e dependências

- **P-01:** o Flow Dev roda na própria máquina da pessoa, que tem o Claude Code logado (mesma premissa da spec de agentes locais). Ver Q-01.
- **P-02:** Linux com GNOME Terminal, que é o ambiente atual (Cinnamon, `gnome-terminal` instalado).
- **P-03:** Claude Code 2.1.329, a versão instalada.
- **P-04:** a sessão usa o login e a configuração pessoal do Claude Code da pessoa (DEC-05).
- **P-05:** "a Issue que o planejamento analisou" é o snapshot referenciado pela decisão aprovada.
- **P-06:** o Claude Code lê imagens, PDFs e texto pelo caminho local citado no prompt, carrega as skills de um plugin passado com `--plugin-dir` (o `--add-dir` abre um diálogo de confirmação a cada sessão e foi descartado) e aceita `/flow-dev:<skill>` no prompt inicial. Confirmado no V-00 (ver [v00-spike.md](v00-spike.md)).

---

# Parte 2 — Técnica

## 12. Visão geral da solução

Os anexos sobem um a um antes da confirmação, por um route handler multipart parecido com `task-images`. Ele valida cada arquivo, guarda numa área de staging em disco e devolve um id.

A confirmação chama a mutation `tasks.terminal.open`:
1. O controller confere a operadora e a aprovação, revalida o checkout e as skills e cria a sessão.
2. Monta a pasta da sessão em `$XDG_STATE_HOME/flow-dev/terminal-sessions/<sessionId>/` (`0700`). A subpasta `contexto/` recebe `.claude/skills/` com cópias das skills da seção 7.7 e `anexos/` com os arquivos.
3. Dispara `gnome-terminal` desanexado, por `execFile`, com o `claude` interativo e `--plugin-dir <sessão>/contexto`.

O `--plugin-dir` carrega as skills como plugin `flow-dev`, e o Claude lê os anexos pelo caminho absoluto, sem tocar no clone nem no `~/.claude`. A Spec B acrescenta a esse comando o `--settings` com os hooks.

## 13. Componentes e responsabilidades

| Componente | Responsabilidade | Local | Novo/Alterado |
|---|---|---|---|
| Seção "Meu repositório local" | Ver, salvar e remover o próprio vínculo (US-01) | `apps/web/src/features/projects/project-settings/components/LocalCheckout*.tsx` | Novo |
| `TerminalLaunchDialog` + ação | Preflight, prompt editável, avisos, confirmação, linha da REQ-040 (US-02) | `apps/web/src/features/issues/assigned-work/components/`; `PlanningActions.tsx`, `planningCopy.ts` | Novo / Alterado |
| `AttachmentPicker` | Seleção, arrastar e soltar, progresso, imagens da Issue marcadas (US-04) | mesma pasta | Novo |
| Route handlers de anexos | Recebem o multipart e removem um anexo do staging | `apps/web/src/app/api/terminal-attachments/route.ts` e `[attachmentId]/route.ts` | Novo |
| `LocalCheckoutController` + DAO | Regras de vínculo (REQ-001–004) | `packages/api/src/controllers/`, `application/`, `infra/database/dao/` | Novo |
| `TerminalSessionController` | preflight e open | `packages/api/src/controllers/` | Novo |
| `TerminalPromptBuilder` | Seção 7.3, função pura | `packages/api/src/application/services/terminal/` | Novo |
| `TerminalAttachmentService` | Seção 7.6, dedupe, staging, entrega na sessão, limpeza de 24 h e 7 dias | mesma pasta | Novo |
| `SessionContextBuilder` | Pasta da sessão: cópia das skills (7.7) e anexos | `packages/api/src/infra/terminal/` | Novo |
| `AttachmentFileStore` | Staging, pasta da sessão, permissões e remoção em disco | mesma pasta | Novo |
| `GitCheckoutInspector` | Raiz, remotes, branch e sujeira via `git` por `execFile` | mesma pasta | Novo |
| `GnomeTerminalLauncher` | Linha de comando e disparo desanexado | mesma pasta | Novo |
| DAO de `task_images` | Listar e ler as imagens citadas no corpo do snapshot | `packages/api/src/infra/database/dao/` | Alterado |
| Expurgo de exclusão | Inclui sessões e anexos (REQ-025) | `infra/database/dao/issue-deletion/deletionPurge.ts` | Alterado |
| Routers | `projects.localCheckout.*`, `tasks.terminal.*` | `packages/api/src/routers/` | Alterado |

Contratos em `application/`, implementações em `infra/` (`layered-backend`); lançador, inspetor e file store por interface, para fakes em teste.

## 14. Modelo de dados

Migration `0046_terminal_execution.sql` com rollback `0046_terminal_execution_rollback.sql` em `packages/api/drizzle/`.

- **`project_local_checkouts`**: `user_id` uuid FK users (cascade), `project_id` uuid FK projects (cascade), `path` text (1–1.024), `verified_at` timestamptz, `version` int ≥ 1, `updated_at`. PK (`user_id`, `project_id`).
- **`task_terminal_sessions`**: `id` uuid, `task_id` FK (cascade), `project_id`, `user_id`, `planning_decision_id` FK, `route` text (check nas 3 rotas), `request_key` uuid, `checkout_path` text, `branch` text null, `dirty` bool, `opened_at`, `last_signal_at` (começa igual a `opened_at`; a Spec B atualiza), `files_removed_at` null, `launch_failed_at` null e `launch_error` text null (estado `launch_failed`). Unique (`user_id`, `request_key`) para REQ-015; índice (`task_id`, `opened_at` desc). A Spec B acrescenta colunas por migration própria.
- **`task_terminal_attachments`**: `id` uuid, `task_id` FK (cascade), `user_id`, `session_id` FK null (nulo = em staging), `origin` text (check: `upload`, `issue_image`), `task_image_id` FK null (set null), `original_name` text (1–255), `stored_name` text, `content_type` text, `byte_size` int (1 a 10 MB), `sha256`, `created_at`. Unique (`user_id`, `task_id`, `sha256`) onde `session_id` é nulo; índice (`session_id`).

As imagens da Issue são as `task_images` cujos ids aparecem no corpo do snapshot, achadas com os mesmos padrões de `issueImageModel.ts` (`flow-image:` e a URL publicada), na ordem do texto. **Dados existentes:** nenhum backfill; as tabelas legadas `local_machines` e `local_project_links` ficam intocadas (DEC-06).

## 15. Interfaces e contratos

```ts
projects.localCheckout.get({ projectId }) → { path: string; verifiedAt: string; version: number } | null
projects.localCheckout.save({ projectId, path, expectedVersion?: number }) → { path; verifiedAt; version }
projects.localCheckout.remove({ projectId }) → { removed: true }
// erros: checkout_path_invalid | checkout_not_found | checkout_not_git_root(root?) | checkout_remote_mismatch(remotes[]) | version_conflict

tasks.terminal.preflight({ projectId, taskId }) → {
  checkout: { path: string; branch: string | null; detachedSha: string | null; dirty: boolean } | null;
  defaultPrompt: string; maxPromptLength: 20000;
  issueImages: Array<{ id; name; contentType; byteSize; preselected: boolean }>;
}
tasks.terminal.open({ projectId, taskId, prompt, requestKey: uuid, attachmentIds: uuid[], issueImageIds: uuid[] })
  → { sessionId: string; unavailableIssueImages: number }
// erros: operator_required | planning_not_approved | checkout_missing | checkout_invalid | skill_missing(name)
//        | claude_unavailable | terminal_unavailable | terminal_disabled | prompt_invalid | attachment_missing | attachment_limit
tasks.byId → + terminal: { lastOpened: { userName: string; openedAt: string } | null }
```

**Anexos:** `POST /api/terminal-attachments` (multipart: `projectId`, `taskId`, `file`) devolve `201 { id, name, contentType, byteSize }`; `DELETE /api/terminal-attachments/:id` devolve `204`. Erros: `{ reason }` com `attachment_type_rejected | attachment_too_large | attachment_limit | attachment_duplicate | operator_required | session_required | origin_denied`.

**Comando** (formato provado no V-00, ver [v00-spike.md](v00-spike.md); a Spec B acrescenta `--settings`):

```text
gnome-terminal --working-directory=<checkout> -- claude --dangerously-skip-permissions --plugin-dir <sessão>/contexto -- <prompt>
```

## 16. Fluxos principais

**Anexar (REQ-027–032, REQ-035)**
1. O diálogo envia cada arquivo assim que ele é escolhido.
2. O handler confere a mesma origem, a sessão e a operadora.
3. O service aplica a seção 7.6 (extensão e assinatura), o limite de staging da pessoa na tarefa e o dedupe por `sha256`.
4. O arquivo é gravado com nome gerado (`0600`), e a linha é criada com `session_id` nulo.

**Abrir (REQ-005–015, REQ-036–040)**
1. `preflight` checa a sessão autenticada e a operadora (mesma regra de `workAuthorization`) e se a decisão está `approved`. Lê o checkout; o inspetor devolve branch e sujeira; o builder monta o prompt; lista as imagens da Issue.
2. `open` repete as checagens. Se já existe sessão com esse `request_key`, devolve-a (REQ-015).
3. Revalida o checkout (7.1); confere `claude` e `gnome-terminal` no PATH e as quatro skills em `.claude/skills/`.
4. Numa transação, cria a sessão, liga os anexos em staging (conferindo dono, tarefa e estado) e cria as linhas das imagens da Issue marcadas.
5. Fora da transação, o `SessionContextBuilder` copia as skills para `contexto/.claude/skills/`, move os anexos e escreve as imagens da Issue com nomes `NN-<nome-seguro>.<ext>`; o builder acrescenta a seção Anexos. Em seguida, o lançador dispara o terminal (`detached`, `unref`).
6. Se o disparo falhar, a pasta é apagada, e a sessão fica registrada com `launch_failed` (a Spec B mostra esse estado). A resposta é `terminal_unavailable`.

**Limpeza (REQ-033, REQ-035):** sem job novo. A cada `preflight` e `open`, apaga o staging com mais de 24 h e as pastas de sessão com `last_signal_at` há mais de 7 dias, marcando `files_removed_at`.

## 17. Decisões técnicas

### DEC-01 — Terminal nativo disparado pelo servidor local
- **Decisão:** o servidor do Next, que roda na máquina (P-01), dispara `gnome-terminal` por `execFile`.
- **Alternativas consideradas:** terminal no navegador com xterm.js e node-pty, que traz dependência nativa, um canal WebSocket e uma superfície de ataque bem maior (recusado pelo usuário); só copiar o comando, sem integração.
- **Consequências:** a pessoa usa o Claude Code completo; só funciona com o Flow Dev local e com o GNOME Terminal.

### DEC-05 — A sessão não é isolada
- **Decisão:** ela usa o login, as skills, o CLAUDE.md e os hooks pessoais, com `--dangerously-skip-permissions`.
- **Alternativas consideradas:** o isolamento dos agentes de planejamento (`--setting-sources ""`, ambiente filtrado), que tiraria da pessoa as ferramentas dela numa sessão interativa que ela pediu com tudo liberado.
- **Consequências:** o comportamento do Claude depende também da configuração da pessoa, além das skills do Flow Dev.

### DEC-06 — Tabela nova de vínculo por pessoa e projeto
- **Decisão:** `project_local_checkouts`.
- **Alternativas consideradas:** reaproveitar `local_project_links`, que é presa a `local_machines`, credenciais e pareamento do conector removido, e exige `machine_id`.
- **Consequências:** o modelo é simples; as tabelas legadas continuam sem uso.

### DEC-09 — Anexos enviados antes da confirmação e guardados em disco
- **Decisão:** cada arquivo vai para `/api/terminal-attachments` assim que é escolhido, fica em staging em disco e é ligado à sessão na confirmação; o banco guarda só os metadados.
- **Alternativas consideradas:** mandar tudo em base64 na mutation tRPC, com até 30 MB num JSON, sem progresso por arquivo e com reenvio de tudo em caso de falha; guardar o conteúdo no banco, como `task_images`, quando a retenção é de só 7 dias e o Claude precisa do arquivo em disco de qualquer jeito.
- **Consequências:** progresso e nova tentativa por arquivo (REQ-032); o backup do banco não cobre os anexos, o que é coerente com a retenção curta.

### DEC-10 — Anexos citados por caminho
- **Decisão:** o prompt lista o caminho absoluto de cada anexo, e o Claude o lê com as próprias ferramentas.
- **Alternativas consideradas:** colar o conteúdo no prompt, o que estoura o limite de 20.000 caracteres e não serve para imagens e PDFs; copiar para dentro do clone, o que sujaria a pasta da pessoa (recusado).
- **Consequências:** o Claude decide quando ler cada anexo.

### DEC-11 — Skills copiadas para uma pasta de contexto passada com `--plugin-dir`
- **Decisão:** a cada abertura, as quatro skills são copiadas para `<sessão>/contexto/skills/` (a pasta `contexto/` é um plugin `flow-dev`, com `.claude-plugin/plugin.json`), e a sessão recebe `--plugin-dir <sessão>/contexto`; a pasta `contexto/anexos/` guarda os anexos.
- **Alternativas consideradas:**
  - `--add-dir` apontando para a raiz do Flow_Dev, que expõe o código todo e carrega todas as skills, commands e agents do monorepo;
  - instalar em `~/.claude/skills`, que altera a configuração global da pessoa (recusado na seção 9);
  - empacotar como plugin com `--plugin-dir`, que exige manifesto e muda os nomes para o namespace do plugin;
  - copiar para o clone, que suja o repositório.
- **Consequências:** cada sessão tem uma cópia fixa (REQ-039), útil para a Spec B saber qual versão produziu cada artefato. O conflito com uma skill de mesmo nome no repositório depende do V-00 e da Q-03.

## 18. Segurança, privacidade e permissões

- **Autorização nos controllers, perto dos dados:**
  - operadora e decisão aprovada em `open` e `preflight`, e nos route handlers de anexos;
  - dono do vínculo em `localCheckout.*`.

  A UI só esconde.
- **Sem shell (NFR-01):** `execFile` com array de argumentos; o `--` antes do prompt impede que um texto começando por `-` vire flag; o caminho vem do banco e é revalidado.
- **Anexos:**
  - envio com sessão e mesma origem; tipo conferido pela assinatura;
  - o nome original nunca vira caminho;
  - `open` só aceita ids da mesma pessoa e tarefa que ainda estão em staging;
  - um documento anexado pode trazer instruções para o Claude: ele é tratado como contexto da própria pessoa, e o Flow Dev não filtra.
- **Prompt visível no `ps`** para outros usuários da mesma máquina: aceitável sob P-01.
- **Abuso:** com o Flow Dev exposto na rede, seria possível abrir terminais com permissão total no servidor. Ver Q-01.

## 19. Observabilidade

Logs com o prefixo `[terminal]`:
- abertura (sessão, tarefa, rota, sem o prompt);
- falha de disparo, com o motivo;
- skill ausente;
- anexo recusado (motivo, tipo e tamanho, sem o nome);
- limpeza de pastas (quantas foram removidas).

## 20. Migração, rollout e reversão

**Ordem:** migration 0046, depois a API e por fim a UI, sem flag, salvo se a Q-01 decidir o contrário. A Spec B vem depois, com a migration 0047.

**Rollback:** apaga as três tabelas. Os arquivos em `$XDG_STATE_HOME/flow-dev/` ficam no disco e podem ser apagados à mão. Os terminais já abertos continuam funcionando.

## 21. Riscos técnicos

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| `gnome-terminal` trata `--working-directory`, `--` ou argumentos longos de outro jeito | média | alto | V-00 antes de tudo; lançador atrás de interface |
| O Claude não carrega as skills do plugin ou não aciona `/flow-dev:<skill>` no prompt inicial | baixa | alto | V-00 provou; o `--add-dir` foi descartado por abrir um diálogo a cada sessão (DEC-11) |
| Uma skill de mesmo nome no repositório tem precedência sobre a do Flow Dev | média | médio | V-00 mede; Q-03 |
| O Claude não lê um anexo pelo caminho (PDF grande, imagem) | baixa | médio | V-00 confere; P-06 |
| Diálogo de confirmação do modo de permissões na primeira vez | alta | baixo | a pessoa aceita no terminal; a Spec B trata o atraso (B-11) |
| Prompt visível no `ps` | certa | baixo | P-01; nada sensível no prompt além da Issue |

---

# Parte 3 — Verificação

## 22. Estratégia de testes

- **Unitários (Vitest):** builder do prompt, normalização de remotes, validação de tipo e assinatura dos anexos, montagem da linha de comando. Funções puras, sem fakes.
- **Integração (`packages/api test:integration`, Postgres descartável):**
  - DAOs e controllers com o banco real;
  - `GitCheckoutInspector` contra repositórios git temporários;
  - `AttachmentFileStore` e `SessionContextBuilder` num diretório temporário;
  - lançador falso (fronteira de I/O).
- **Route handlers de anexos:** testados com o controller ligado ao banco de teste.
- **Componentes (RTL):** seção de vínculo, diálogo e `AttachmentPicker`.
- **E2E (Playwright):** um spec com repositório git temporário e lançador falso, ligado por variável de ambiente só em teste.
- **Smoke manual:** V-00 e V-10 com o GNOME Terminal e o Claude reais.

## 23. Matriz de verificação

| ID | Cobre | Componente | Nível(is) | Casos (resumo) |
|---|---|---|---|---|
| V-00 | DEC-01, DEC-10, DEC-11, P-02, P-06 | spike manual | smoke | terminal abre na pasta com acentos; prompt literal com aspas e `$()`; `/direct-executor` no prompt inicial aciona a skill copiada; skill de mesmo nome no repositório: qual vale; o Claude lê imagem, PDF e texto da pasta `contexto/` |
| V-01 | US-01 (1–3), REQ-001–004, 7.1, B-02, B-08 | `LocalCheckoutController` + inspetor | integração + unidade | salva válido; recusa cada regra de 7.1 com a mensagem; subpasta indica a raiz; fork aceito; SSH/HTTPS/maiúsculas; isolamento entre pessoas; conflito de versão |
| V-02 | REQ-007, REQ-037, 7.3, B-16 | `TerminalPromptBuilder` | unidade | ordem das seções; Execução direta com `/direct-executor`; Tech Spec e PRD com o mesmo texto de `/spec-writer`; pendências vazias; corte do corpo em 20.000; seção Anexos fora do limite |
| V-03 | REQ-005, REQ-009, REQ-011–013, REQ-015, REQ-038, 7.4, B-01, B-04 | `TerminalSessionController` | integração | não operadora recusada; planejamento em revisão recusado; sem vínculo; pasta inválida na abertura; claude, terminal ou skill ausentes; prompt vazio ou longo; mesmo `requestKey` devolve a mesma sessão; falha no disparo registra `launch_failed` |
| V-04 | NFR-01, B-09, REQ-036, REQ-039, seção 9 (sem tocar `~/.claude`) | lançador + `SessionContextBuilder` | unidade + integração | argumentos sem shell; `--` antes do prompt; `--plugin-dir` aponta para `contexto/`; as 4 skills copiadas; mudar a skill depois não altera a cópia; `~/.claude` e o clone intocados |
| V-09 | US-02 (1–5), REQ-006, REQ-008, REQ-010, REQ-040, B-03, NFR-05 | `TerminalLaunchDialog` + `PlanningActions` | componente | prompt editável; branch e HEAD destacado; aviso de sujeira; sem vínculo leva às Configurações; contador e limite; foco e Esc; linha "Execução aberta…" depois de abrir |
| V-10 | US-01, US-02, US-04 ponta a ponta | fluxo completo | e2e + smoke | vincula repositório temporário, aprova, anexa um `.md` e um PNG, abre com texto editado; o lançador falso recebe exatamente o texto mais a seção Anexos, e os arquivos e as skills existem em `contexto/`; o smoke real repete com o Claude |
| V-11 | REQ-025, seção 9 | expurgo de exclusão + planejamento | integração | excluir a Issue apaga sessões e anexos (linhas e arquivos); imagens do composer inalteradas; aprovar não abre nada; status do planejamento e da fila inalterados; agentes de planejamento sem `--add-dir` nem `--plugin-dir` |
| V-12 | US-04 (3–4), REQ-027, REQ-029, REQ-030, REQ-035, 7.6, B-13, NFR-06 | `TerminalAttachmentService` + route handlers de anexos | unidade + integração | cada tipo aceito; assinatura falsa recusada; texto com byte nulo recusado; 10 MB, 10 arquivos e 30 MB; duplicata; `../` vira nome seguro; não operadora recusada; staging com mais de 24 h removido |
| V-13 | US-04 (1–2), REQ-028, REQ-031, REQ-033, B-12, B-14, B-15 | `open` com anexos + `AttachmentFileStore` + builder | integração | imagens da Issue na ordem do corpo; mais de 10 deixa 10 marcadas; arquivos `0600` na pasta da sessão; seção Anexos com os caminhos; imagem sumida segue com aviso; pasta removida 7 dias após o último sinal |
| V-14 | REQ-032, NFR-05 | `AttachmentPicker` | componente | seleção e arrastar e soltar; progresso; confirmação bloqueada durante o envio; "Tentar de novo" só no que falhou; desmarcar imagem da Issue; erros anunciados |

V-05 a V-08 estão na Spec B.

## 24. Definição de pronto

- V-00 executado e o resultado registrado em `docs/specs/execucao-no-terminal/v00-spike.md`, com a §15 ajustada.
- `pnpm --dir packages/api test` e `pnpm --dir packages/api test:integration` passando.
- `pnpm --dir apps/web test` e o spec e2e novo (`pnpm --dir apps/web test:e2e <spec>`) passando.
- `pnpm typecheck`, `pnpm lint` e `pnpm build` (há rotas novas) passando.
- Smoke V-10 real feito uma vez pela UI.
- Nenhum `[PRECISA ESCLARECER]`; Q-01 a Q-03 respondidas; spec atualizada com o que mudou.

---

## Questões em aberto

- **Q-01 (respondida: sim, 2026-11-22):** a abertura exige `FLOW_DEV_TERMINAL_ENABLED=true` no `.env.local`; sem ela, `open` recusa com `terminal_disabled`.
  - **Sugestão:** sim. É uma trava barata contra o abuso da §18 caso o Flow Dev rode exposto, e quem usa localmente liga uma vez.
  - **Impacto se ficar em aberto:** muda a REQ-012 (mais uma mensagem) e o rollout.
- **Q-03 (decidida no V-00):** os comandos usam o namespace do plugin (`/flow-dev:<skill>`), que sempre vale a skill do Flow Dev; pergunta original: se o repositório do projeto tiver uma skill com o mesmo nome (ex.: o próprio Flow Dev, que tem spec-writer), qual deve valer?
  - **Sugestão:** a do Flow Dev, para que os artefatos da Spec B saiam sempre no mesmo formato. Se o V-00 mostrar que o Claude prefere a do repositório, as cópias passam a se chamar `flow-spec-writer` etc., e o comando da 7.3 acompanha.
  - **Impacto se ficar em aberto:** decide o nome das cópias e o comando inicial.
- **Q-02 (sem resposta; valem os textos da 7.3):** os textos da 7.3 estão bons, em especial "não faça commit, push nem PR sem eu pedir" e "pare para minha revisão"?
  - **Sugestão:** manter; dá para editar a cada abertura.
  - **Impacto se ficar em aberto:** nenhum na arquitetura.

## Sugestões fora do escopo

- Vincular a pasta direto do diálogo de abertura, sem ir às Configurações: tira um passo no primeiro uso.
- Aceitar outros terminais (Konsole, kitty, `x-terminal-emulator`) por configuração.
- O botão "Copiar comando" como alternativa quando o terminal não está disponível.
- Registrar na sessão o hash de cada skill entregue: ajuda a futura feature que usa os artefatos a saber com qual versão da skill cada um foi produzido.
- Limpar as tabelas legadas `local_*` do conector removido.

## Histórico

- 2026-11-22 — Criação da spec.
- 2026-11-22 — Anexos no diálogo de abertura, a pedido do usuário (US-04, REQ-027–035, 7.6, NFR-06, P-06, DEC-09, DEC-10, V-12–V-14).
- 2026-11-22 — Skills do Flow Dev entregues à sessão e acionadas pelo prompt (REQ-036–040, 7.7, DEC-11, Q-03). A spec foi dividida porque passou do limite de tamanho: acompanhamento e artefatos foram para a Spec B, com os mesmos IDs (US-03, REQ-014, REQ-016–024, REQ-026, REQ-034, 7.2, NFR-02–04, DEC-02–04, DEC-07, DEC-08, B-05–07, B-10, B-11, V-05–V-08). REQ-033 passou a contar a partir do último sinal.
- 2026-11-22 — Tech Spec e PRD passam a usar o mesmo prompt de `/spec-writer` (7.3, V-02), porque a skill produz as duas partes num documento só. As três rotas do planejamento continuam como estão.
- 2026-11-22 — Implementada. Mudanças em relação ao plano: `--plugin-dir` no lugar de `--add-dir` e comandos `/flow-dev:<skill>` (V-00); `projectId` nas entradas e no multipart; `terminal_disabled` (Q-01); `launch_failed_at` e `launch_error`; o lançador passa só um ambiente permitido (sem `CLAUDE*`); `useDialogFocus` promovido para `src/hooks/`.
