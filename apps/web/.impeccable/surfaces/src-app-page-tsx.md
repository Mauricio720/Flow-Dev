---
version: 1
slug: "src-app-page-tsx"
primary_target: "src/app/page.tsx"
related_targets: ["src/app/login/page.tsx"]
---

# Surface brief: Login + Issue composer (primeira tela)

Scope: `/login` (GitHub OAuth simulado) e `/` (conversa com o Issue Author → draft → aprovação → publicação). Mode: Operate. Somente frontend, dados de demonstração, sem tRPC/Mastra/GitHub reais. Demo antiga movida para `/dev`.

Audience/job: devs do time transformando uma intenção crua em issue fundamentada. Constraints: pt-BR, aprovação explícita antes de publicar, mostrar fontes consultadas.

## Direction contract

THESIS: A conversa é um branch de git. Cada consulta de tool se ramifica do trilho e volta; o draft é o merge; "Criar Issue" é o push para origin. Recusa o chat de balões com sidebar escura e painel de draft genérico.

OWN-WORLD: Diagrama de trilhos octilinear sobre chão cinza-papel frio com grade de 24px visível e desligável. Trilho principal em tinta; lanes por fonte: Projeto azul, GitHub laranja, clarificação âmbar, merge/publicação verde. Sem balões, sem cards de chat: nós no trilho e texto solto. Tool calls em linhas de altura fixa com colunas fixas (tool · alvo · resultado · ms). Anotações presas por leader lines, mono só para código, caminhos, refs e medidas.

STORY: O dev vê o agente consultar arquivos e issues reais, responde a uma clarificação, revisa um draft editável e publica com um clique consciente.

FIRST VIEWPORT: `/`: barra superior fina; trilho de sessões (branches) à esquerda 256px; thread central com gutter de lanes 72px e texto até ~680px; draft como nó de merge largo com "Criar Issue" verde no rodapé do bloco; painel "Contexto consultado" à direita 288px (xl+); composer como HEAD tracejado no fim do trilho. `/login`: mapa de trilhos do fluxo ocupando ~58% à esquerda, painel de entrada à direita com "Continuar com GitHub".

FORM: Grafo de commits / mapa de trilhos, item 4 da lista ordenada, seed key 73de82a2. Raises: sem caixas (nixie), colunas fixas (split-flap), leader lines (tensegridade), grade visível como estado (Crouwel). Assinatura: lanes se desenham ao ramificar; publicar estende o trilho até o nó origin #N.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
