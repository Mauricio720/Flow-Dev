---
name: Flow Dev
description: Console onde a conversa com o Issue Author é um branch de git, desenhado como mapa de trilhos.
colors:
  ground: "#eceef1"
  surface: "#f5f6f8"
  raised: "#ffffff"
  ink: "#14161b"
  ink-2: "#454a55"
  ink-3: "#5f6571"
  line: "#d1d5db"
  grid: "#dfe2e7"
  lane-project: "#2446d8"
  lane-project-ink: "#1f3cbf"
  lane-project-wash: "#e2e7fb"
  lane-github: "#d24e17"
  lane-github-ink: "#a83c0e"
  lane-github-wash: "#f9e5da"
  lane-clarify: "#b77a06"
  lane-clarify-ink: "#7f5400"
  lane-clarify-wash: "#f6ebd1"
  lane-merge: "#12805a"
  lane-merge-ink: "#0c6546"
  lane-merge-wash: "#dcefe6"
  label-frontend-ink: "#5b2fc4"
  label-frontend-wash: "#ece5fc"
  label-backend-ink: "#0a6170"
  label-backend-wash: "#d9eff2"
  label-infra-ink: "#a61e55"
  label-infra-wash: "#fbe1eb"
  label-docs-ink: "#55610a"
  label-docs-wash: "#eef1d0"
typography:
  display:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "2.5rem"
    fontWeight: 600
    lineHeight: 1.05
    letterSpacing: "-0.035em"
    fontFeature: "\"ss01\", \"cv11\""
  headline:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.03em"
  title:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 600
    lineHeight: 1.375
  body:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.625
  label:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 500
    lineHeight: 1.43
  caption:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.33
  mono:
    fontFamily: "Geist Mono, ui-monospace, monospace"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.4
rounded:
  xs: "4px"
  sm: "6px"
  md: "8px"
  lg: "12px"
  full: "9999px"
spacing:
  cell: "24px"
  gutter: "72px"
  gutter-compact: "52px"
  rail: "256px"
  sources: "288px"
  thread: "768px"
  topbar: "48px"
  tool-row: "36px"
components:
  button-publish:
    backgroundColor: "{colors.lane-merge}"
    textColor: "{colors.ground}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "40px"
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.ground}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "0 20px"
    height: "48px"
  button-secondary:
    backgroundColor: "{colors.raised}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "40px"
  button-ghost:
    textColor: "{colors.ink-3}"
    rounded: "{rounded.md}"
    padding: "0 10px"
    height: "36px"
  input-field:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    padding: "8px 12px"
  composer:
    backgroundColor: "{colors.raised}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    padding: "14px 16px 12px"
  chip-suggestion:
    backgroundColor: "{colors.lane-clarify-wash}"
    textColor: "{colors.lane-clarify-ink}"
    rounded: "{rounded.full}"
    padding: "4px 12px"
  chip-label:
    textColor: "{colors.ink-2}"
    typography: "{typography.mono}"
    rounded: "{rounded.full}"
    padding: "2px 10px"
  ref-tag-project:
    backgroundColor: "{colors.lane-project-wash}"
    textColor: "{colors.lane-project-ink}"
    typography: "{typography.mono}"
    rounded: "{rounded.sm}"
    padding: "4px 8px"
  ref-tag-github:
    backgroundColor: "{colors.lane-github-wash}"
    textColor: "{colors.lane-github-ink}"
    typography: "{typography.mono}"
    rounded: "{rounded.sm}"
    padding: "4px 8px"
  draft-block:
    backgroundColor: "{colors.raised}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "16px 20px"
---

# Design System: Flow Dev

## Overview

**Creative North Star: "O Mapa de Trilhos do Branch"**

A conversa com o Issue Author é desenhada como um grafo de commits lido como mapa de metrô. Um trilho principal em tinta desce pela calha esquerda; cada consulta de tool se ramifica a 45° numa lane da cor da sua fonte, marca uma parada por chamada e volta ao trilho; o draft é o nó de merge; publicar estende o trilho em verde até o nó `origin #N`. O chão é cinza-papel frio, com uma grade de 24px que o próprio usuário liga e desliga, porque a grade é o sistema de coordenadas em que as lanes encaixam.

A densidade é de ferramenta, não de marketing: linhas de altura fixa, colunas fixas, texto solto ao lado de nós, sem balões. Só duas coisas ganham caixa na thread: o draft (o merge, a única coisa que vai ao GitHub) e o composer (o HEAD tracejado, o ponto onde o próximo commit nasce). A cor é informação: quatro lanes, cada uma com três degraus (traço, tinta de texto, wash), e o resto da interface é neutra.

Ainda em aberto, fora do sistema: letreiro de sinalização além da Geist, leader lines do painel de contexto até as lanes e coordenadas na grade. Até serem construídos, nenhuma superfície deve inventá-los.

Claro e escuro são dois mundos completos derivados das mesmas custom properties; a escuridão não inverte a hierarquia, só troca o papel pelo quadro-negro.

**Key Characteristics:**
- Trilho principal em tinta, lanes octilineares (verticais e 45°) por fonte.
- Grade de 24px visível como estado, alternável pelo botão "Grade" e persistida por visitante.
- Nós no trilho e texto solto no lugar de balões e cards de chat.
- Linhas de tool em altura e colunas fixas (tool · alvo · resultado · ms).
- Mono só para evidência: código, caminhos, refs, branches, tools, tempos.
- Verde é publicação: aparece no draft, na aprovação e no trilho depois do push.

## Colors

Neutros frios de papel e tinta, com quatro hues de lane usados como sinalização de fonte, nunca como decoração.

### Primary
- **Azul Projeto** (lane-project): lane das tools de projeto (`searchProject`, `readProjectFile`), e também o azul de interação do sistema: anel de foco, cursor, borda de foco do composer e dos campos, seleção de texto (wash). Texto usa `lane-project-ink`; preenchimentos usam `lane-project-wash`.

### Secondary
- **Laranja GitHub** (lane-github): lane das tools de GitHub (`searchGitHubIssues`, `getGitHubIssue`), refs `#N` no draft e contagem na coluna de fontes.

### Tertiary
- **Âmbar Clarificação** (lane-clarify): o nó de pergunta, o selo "pergunta", as respostas sugeridas acima do composer e o status "aguardando você" no trilho de sessões.
- **Verde Merge** (lane-merge): borda do bloco de draft, botão "Criar Issue", cápsula de merge, trilho após a publicação, nó `origin`, status "draft pronto".

### Neutral
- **Chão Cinza-Papel** (ground): fundo da página e da thread; também o recorte interno dos nós vazados.
- **Superfície** (surface): colunas laterais (sessões, contexto), rodapé do draft, fundo dos campos em edição, painel do mapa no login.
- **Elevado** (raised): o que se destaca do chão: draft, composer, item ativo do trilho de sessões, botão secundário.
- **Tinta** (ink): texto principal, trilho principal, nó do agente, botão primário.
- **Tinta 2** (ink-2): prosa do agente, alvos de tool, texto de apoio. **Tinta 3** (ink-3): metadados, horários, rótulos de campo, placeholders.
- **Linha** (line): divisões de coluna, bordas de campos e botões secundários, separadores das linhas de tool. **Grade** (grid): apenas o padrão de 24px.

### Labels de área
Quatro pares `-ink` / `-wash` que só existem nos chips de label de uma tarefa. Os hues ficam fora das quatro lanes para não serem lidos como fonte ou etapa do fluxo.
- **Violeta Frontend** (label-frontend), **Petróleo Backend** (label-backend), **Rosa Infra** (label-infra), **Oliva Docs** (label-docs). A label `generica` não tem hue: fica em tinta 2 sobre wash de tinta.
- No GitHub, as mesmas áreas usam os tons cheios do catálogo (`TASK_LABEL_COLOR` em `packages/api/src/schemas/taskLabels.ts`), porque lá a pílula é pintada pelo próprio GitHub.

### Named Rules
**The Label Hue Is the Area Rule.** Os hues de label identificam a área técnica de uma tarefa e só aparecem no chip da própria label, no draft, na prévia, no histórico e no seletor do editor. Texto usa o `-ink`, fundo usa o `-wash`; nenhum outro elemento usa esses tons.

**The Lane Is the Source Rule.** Cada hue de lane identifica uma fonte ou etapa do fluxo e só aparece onde essa fonte aparece. Traço usa o tom de lane, texto usa o `-ink`, preenchimento usa o `-wash`; nunca texto no tom de traço sobre wash.

**The Green Is Publication Rule.** O verde merge é reservado para draft, aprovação e publicação. Nenhum outro botão, badge ou estado de sucesso genérico usa verde.

**The One Voice of Neutrals Rule.** Fora das lanes, a interface é tinta sobre papel. Hierarquia vem de ink / ink-2 / ink-3 e de peso, não de cor nova.

## Typography

**Display Font:** Geist (com ui-sans-serif, system-ui)
**Label/Mono Font:** Geist Mono (com ui-monospace)

**Character:** Uma sans técnica e neutra com `ss01` e `cv11` ligados, fechada em tracking negativo nos títulos grandes; a mono é o carimbo de evidência, não a voz da interface.

### Hierarchy
- **Display** (600, 2.5rem subindo para 3rem em sm+, 1.05, -0.035em): só o título do login.
- **Headline** (600, 1.875rem subindo para 2.25rem em sm+, 1.25, -0.03em): o título do estado vazio ("O que você quer mudar?").
- **Title** (600, 17px, 1.375): título da issue no draft. Cabeçalhos de bloco usam 15px 600.
- **Body** (400, 15px, 1.625): mensagens, campos do draft, composer. Máximo de 65ch na thread e no draft.
- **Label** (500, 14px): nomes nas bylines, botões, cabeçalhos de grupo. Rótulos de campo e de seção usam 14px ou 12px em ink-3, em caixa normal, sem tracking.
- **Caption** (400, 12px): status, dicas de teclado, metadados.
- **Mono** (400, 13px; 12px para horários e ms; 11px dentro do mapa SVG): tools, caminhos, repositório, branches, labels, refs, tempos. Números com `tabular-nums`.

### Named Rules
**The Mono Is Evidence Rule.** Geist Mono só para o que é literal no repositório ou medido: código, caminhos, nomes de tool, refs `#N`, branches, horários e milissegundos. Prosa, rótulos e botões ficam em Geist.

**The Sentence Case Rule.** Rótulos de seção ("Intenções", "Como ler o trilho", "Comece por um exemplo") são texto pequeno em ink-3 e caixa de frase. Nada de caixa-alta espaçada.

## Layout

A unidade é a célula de 24px. O trilho principal fica no centro da primeira célula (x = 12px), a lane Projeto na segunda (36px) e a lane GitHub na terceira (60px): a calha de lanes tem três células, 72px. Em telas pequenas a calha encolhe para 52px e as lanes para 26px e 40px. Lanes saem do trilho em escalonamento de 14px, as mais externas primeiro, para que diagonais paralelas nunca compartilhem segmento.

Workspace: barra superior de 48px; trilho de sessões de 256px à esquerda a partir de lg (gaveta modal abaixo disso); thread central de até 768px centralizada sobre a grade; coluna "Contexto consultado" de 288px à direita a partir de xl. O composer fica grudado no pé da thread com um degradê de 1.5rem para o chão.

Linhas de tool têm 36px (52px no compacto, onde o alvo desce para a segunda linha) com colunas fixas de 9.5rem · flexível · 7rem · 3.25rem. Campos do draft usam rótulo em coluna de 7.5rem e conteúdo flexível, divididos por linha fina.

Login: grade de duas colunas a partir de lg, mapa do fluxo em ~58% (1.35fr) sobre superfície com grade, painel de entrada com mínimo de 420px e conteúdo de até 400px. No celular o painel vem primeiro e o mapa é redesenhado de cima para baixo (FlowMapVertical) em vez de encolhido.

### Named Rules
**The Cell Rule.** Todo desenho de lane encaixa na célula de 24px e usa só verticais, horizontais e 45°. Curva só no laço de clarificação do mapa do login.

**The Fixed Column Rule.** Chamadas de tool são tabela, não prosa: altura fixa por linha e colunas que não mudam de largura entre chamadas.

## Elevation & Depth

O sistema é plano sobre tons (ground, surface, raised) com uma única sombra suave. A profundidade vem do degrau de superfície e das bordas de 1px em `line`; a sombra marca só o que está pronto para agir.

### Shadow Vocabulary
- **Raised** (`--shadow-raised`, com variante mais densa no escuro): composer, "Criar Issue", "Continuar com GitHub", item ativo do trilho de sessões, gaveta móvel.

### Named Rules
**The Single Shadow Rule.** Existe uma sombra. Ela vai no ponto de ação corrente, não em cada container.

## Shapes

Cantos suaves e progressivos por escala: 4px para código inline e nós quadrados, 6px para campos e tags de referência, 8px para botões, 12px para os dois containers da thread (draft e composer), pílula para chips, labels e nós. Nós do trilho seguem uma gramática fixa: vazado com borda (você), cheio (agente), anel grosso âmbar (pergunta), cápsula verde (merge), cheio verde com check ou ponto (publicada), círculo tracejado (HEAD). Traços de lane têm 2px na thread e 6-7px no mapa do login, sempre com pontas e junções arredondadas. Ícones são SVG de traço 1.75 num viewBox de 24.

## Components

### Buttons
- **Shape:** cantos de 8px; altura 40px nos botões de ação, 36px nos fantasmas, 48px no botão do login.
- **Publicar ("Criar Issue"):** verde merge, texto em `on-merge` (branco no claro, #101216 no escuro), 14px 600, marca do GitHub à esquerda, sombra raised; hover clareia (`brightness 110%`), active desce 1px. Durante o envio, o ícone vira um ponto pulsante e o rótulo vira "Publicando…". O rótulo fecha 4.5:1 contra o verde: `on-merge` sobre lane-merge mede ~4.9:1 no tema claro.
- **Primário (tinta):** fundo ink, texto ground, usado em "Continuar com GitHub" (48px, largura total) e no envio do composer (quadrado de 36px, opacidade 25% quando desabilitado).
- **Secundário:** fundo raised, borda line, que escurece para ink-3 no hover ("Editar", "Nova intenção").
- **Fantasma:** sem fundo, ink-3 que vai para ink com wash de tinta a 5% no hover (barra superior, remover critério). O toggle "Grade" usa `aria-pressed` e fica em tinta a 7% quando ligado.

### Chips
- **Respostas sugeridas:** pílula em wash âmbar, texto clarify-ink, borda âmbar a 40% que fica cheia no hover.
- **Labels da issue:** pílula mono 12px no wash da área com texto no `-ink` da área, sem borda. A `generica` fica em wash de tinta, borda line e ink-2. No editor, a label marcada usa o mesmo par e a desmarcada é um botão de contorno.
- **Referências:** retângulo de 6px no wash da lane de origem, mono 12px na tinta da lane.

### Cards / Containers
- **Draft da issue:** o único bloco da thread. Fundo raised, borda de 2px em verde merge a 45% que fica sólida ao publicar, cantos de 12px, cabeçalho de 52px com o repositório em mono, os sete campos canônicos divididos por linha, a proposta de refinamento e a prévia da publicação como seções do próprio bloco, e rodapé em surface com o estado do salvamento ("Nada é publicado até você aprovar."), a explicação do que bloqueia a publicação e as ações.
- **Planejamento:** segundo artefato tipado da tarefa publicada, depois do bloco da Issue. Bloco raised com borda line de 1px e cantos de 12px, que vira 2px em verde merge quando aprovado. Cabeçalho de 52px com o título e a cápsula de estado em pílula (tracejada em Aguardando, cheia em tinta com ponto pulsante em Analisando, contorno em tinta em Em revisão, contorno de erro em Falhou, wash verde com check em Aprovado); corpo com a decisão em campos nomeados (analisado por Dev Control, complexidade, recomendação original, rota salva, motivos, pendências) e as ações; rodapé em surface com a linha do tempo real desenhada como trilho de paradas (horizontal a partir de sm, vertical abaixo): parada verde com check quando concluída, anel de tinta com ponto pulsante na etapa corrente, anel de erro com X na falha, círculo tracejado na pendente, e trecho verde sólido até a etapa alcançada ou tracejado até a que ainda não foi. "Alterar rota" abre um grupo de rádio de três opções com salvar e cancelar explícitos; "Aprovar planejamento" usa o verde de aprovação (The Green Is Publication Rule) e fica desabilitado enquanto a escolha não foi salva. Sem barras de progresso, durações inventadas ou botão de execução; usa os mesmos tokens, foco e movimento reduzido do restante da thread. Leitores veem a mesma decisão sem controles.
- **Especificação:** terceiro artefato tipado da tarefa publicada com planejamento aprovado, no mesmo bloco raised de 12px do Planejamento. Cabeçalho de 52px com o título e a cápsula de estado; corpo com etapas obrigatórias da rota (a etapa dispensada é nomeada, não escondida), atividade real em lista rolável com prévia de 16 KiB e acesso ao conteúdo completo, pergunta ou permissão pendente em destaque com borda de 2px em clarify, revisão por documento (PRD, TechSpec, Tasks) renderizada a partir dos blocos capturados e ações explícitas. "Aprovar PRD/TechSpec/Tasks" usa o verde de aprovação (The Green Is Publication Rule) e fica desabilitado com ajuste não enviado, versão histórica, ação pendente ou pacote incompleto. Tabelas têm cabeçalhos acessíveis e rolagem horizontal rotulada; código e HTML aparecem como texto inerte; diagramas renderizam em frame isolado ou como lacuna bloqueante visível. Anúncios usam região polida só para mudanças de estado e ação pendente. Sem barras de progresso, porcentagens ou durações inventadas.
- **Abas de etapa (Trabalho atribuído):** o detalhe do trabalho mostra uma etapa por vez. A lista de abas é um controle segmentado em surface, com borda line, cantos de 12px e 4px de respiro; fica grudada no topo da rolagem para que dê para voltar a uma etapa anterior de qualquer ponto da leitura. Cada aba (Planejamento, Spec, Tarefas, Implementação, Review; Planejamento e Especificação no fluxo anterior) traz a parada do estado na gramática do Planejamento, com "aguardando você" em anel âmbar de 3px, o nome da etapa (14px, 600 na selecionada) e o estado em 12px na tinta do estado. A aba selecionada sobe para raised com anel de 1px em line e a sombra raised; as demais ganham wash de tinta a 5% no hover. A tela abre na etapa da vez e acompanha o fluxo quando ela avança; a escolha manual vale até a etapa da vez mudar. Setas esquerda e direita trocam de aba; em telas estreitas a lista rola na horizontal. Com uma única etapa disponível não há lista, só o bloco.
- **Fluxo unificado (spec, tarefas, implementação, review):** quatro abas de etapa, cada uma com o mesmo bloco raised de 12px. Cabeçalho de 52px com o nome da etapa e a cápsula de estado ("Em revisão" quando a etapa espera a aprovação). Spec reúne gerar e aprovar a spec; Tarefas reúne gerar e aprovar as tarefas; Implementação reúne os Loops de implementação; Review tem só o Loop de revisão e correção, que abre quando a implementação termina. A aba Review explica o ciclo em três passos numerados (revisa, registra, corrige) divididos por linha, sem cards, acima das seções, e adiciona o Loop por um único botão em vez de uma lista. Implementação faz o mesmo quando só existe um Loop de implementação; a lista só aparece se houver mais de um. Campos de Loop com escolha delimitada são checkbox ou select; os que raramente mudam ficam em "Opções avançadas". Na etapa da vez o corpo abre com "Agora": um título que diz o que está acontecendo, uma frase com o próximo passo, a pergunta pendente do agente (borda de 2px em clarify) e a execução ativa. Seguem Ações da etapa, Documentos e Histórico de execuções como seções planas divididas por linha, sem cards aninhados, sempre filtradas pela etapa da aba; em revisão e em etapa já concluída, Documentos vem antes das Ações. A etapa que ainda não chegou mostra uma frase dizendo o que a libera, no lugar de seções vazias. Documentos são lidos como brief, não como Markdown: abas por documento (a spec se divide em Produto · PRD e Técnica · Tech Spec), resumo em corpo maior, seções em rótulo de 8.5rem + conteúdo divididas por linha, títulos do template traduzidos, seções longas recolhidas, seções "não aplicável" agrupadas numa linha e o texto capturado sempre a um clique em "Ver texto original". Perguntas em aberto e premissas do agente viram "Confirme antes de aprovar" (clarify), e a aprovação só libera com todos os pontos marcados. O histórico é tabela de linhas fixas (ação · tentativa, estado, horário em mono) com a proveniência dentro de cada linha.
- **Composer:** fundo raised, borda line que vira azul projeto no foco, cantos de 12px, sombra raised, textarea que cresce com o conteúdo até 12rem.

### Inputs / Fields
- **Style:** fundo surface, borda line, cantos de 6px, 15px com entrelinha relaxada.
- **Focus:** borda azul projeto, sem glow; o anel global de foco é 2px azul projeto com afastamento de 2px.
- **Error:** mensagem no rodapé do draft com `role="alert"`. O sistema ainda não tem cor de erro própria; a build pinta erros em `lane-github-ink`, o que colide com The Lane Is the Source Rule e fica registrado como dívida, não como regra.

### Navigation
- **Barra superior:** 48px, fundo ground, linha inferior, marca Flow Dev, repositório em mono com ícone de branch, ações fantasmas à direita.
- **Sidebar do projeto:** 240px em surface a partir de lg (gaveta modal abaixo disso): marca Flow Dev, cartão raised do projeto ativo (inicial em tinta, nome, repositório em mono, "Trocar projeto"), menus com ícone (item ativo em raised com anel de 1px em line, sem sombra), Configurações no pé e o estado do acesso ao repositório na base. O cabeçalho de 48px ao lado traz a trilha Projetos › projeto › seção, o link do repositório e Sair. Com a sidebar, o trilho de sessões do workspace aparece a partir de xl e a coluna de contexto a partir de 2xl.
- **Trilho de sessões:** cada intenção é uma parada numa linha vertical de 1px; o nó reflete a fase (âmbar vazado aguardando, quadrado verde draft pronto, azul pulsante consultando, verde cheio publicada, tracejado vazio). Título, branch em mono e status na cor da fase. O item ativo sobe para raised com sombra.

### Tool Run (signature)
Bloco de chamadas de tool registradas: cabeçalho de 32px ("Contexto consultado · N chamadas" com os nomes das fontes na tinta de lane), linhas de altura fixa que entram com `row-strike`, e na calha as lanes que se desenham (`lane-draw`), com parada de raio 5 por chamada (tracejada quando o resultado é vazio ou indisponível) e um fio fino a 45% de opacidade da parada até a linha. A atividade chega junto com o resultado da geração; o bloco nunca anima chamadas em andamento nem mostra tempos que não foram medidos.

### Merge e publicação (signature)
No draft, cada lane citada desce até uma cápsula verde que agrupa trilho e lanes; um fio verde liga a cápsula ao bloco. Ao publicar, a cápsula se preenche, a borda do draft fica sólida e o trilho cresce em verde (`trunk-grow`) até o nó `origin · repo · #N`; dali em diante o trilho da sessão corre em verde.

### Motion
Uma curva só: `ease-out-expo` (cubic-bezier(0.16, 1, 0.3, 1)). Lanes se desenham em 700ms, linhas de tool entram em 420ms, o trilho cresce em 600ms, estados em andamento pulsam a 1.1s. Tudo isso é desligado com `prefers-reduced-motion`.

## Do's and Don'ts

### Do:
- **Do** encaixar lanes na célula de 24px (trilho em 12px, lanes em 36px e 60px) e usar só verticais, horizontais e 45°.
- **Do** usar o trio de cada lane com papéis fixos: traço no tom de lane, texto no `-ink`, fundo no `-wash`.
- **Do** mostrar chamadas de tool como linhas de 36px com colunas fixas tool · alvo · resultado · ms.
- **Do** manter a grade de 24px como estado do visitante, alternável e persistido.
- **Do** reservar a sombra raised para o ponto de ação corrente (composer, publicar, entrar, item ativo).
- **Do** desligar lane-draw, row-strike, trunk-grow e o pulso sob `prefers-reduced-motion`.

### Don't:
- **Don't** colocar mensagens em balões ou cards: na thread, só o draft e o composer têm caixa.
- **Don't** usar verde merge fora de draft, aprovação e publicação.
- **Don't** usar Geist Mono para prosa, rótulos ou botões.
- **Don't** usar hues de lane como decoração ou em elementos que não pertencem àquela fonte.
- **Don't** usar rótulos em caixa-alta espaçada acima de títulos.
- **Don't** adicionar uma segunda sombra ou sombras duras deslocadas.
