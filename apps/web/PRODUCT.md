# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Desenvolvedores do próprio time. Chegam com uma intenção ainda crua (uma feature, um bug, um ajuste) e querem transformá-la numa GitHub Issue bem escrita sem sair do fluxo de trabalho nem redigir tudo à mão.

## Product Purpose

Flow Dev é um console onde o dev conversa com o agente **Issue Author** (Mastra). O agente entende a intenção, consulta contexto do projeto e do GitHub quando precisa, pede clarificação quando falta informação e produz um **draft de Issue** com os campos canônicos: Título, Contexto, Objetivo, Restrições, Contexto relevante com fontes, Considerações de produto e Referências. O dev revisa, edita e aprova; só então o backend publica a Issue no GitHub. Sucesso: issue publicada com contexto correto, em poucas trocas, sem retrabalho.

## Positioning

A issue nasce fundamentada no código e no histórico reais: o agente lê arquivos do projeto e issues existentes antes de escrever, e nada é publicado sem aprovação explícita do dev.

## Operating Context

Fluxo: (1) dev descreve a intenção → (2) UI envia ao backend → (3) backend chama o Issue Author → (4) agente usa tools de contexto: Projeto (`searchProject`, `readProjectFile`), GitHub (`searchGitHubIssues`, `getGitHubIssue`), outros contextos no futuro → (5) agente responde ou pede clarificação → (6) ou gera um draft da Issue → (7) dev revisa/edita e aprova "Criar Issue" → (8) backend publica no GitHub e mantém o vínculo.

## Capabilities and Constraints

- Entrada apenas via GitHub OAuth. Entrar não libera repositórios: ler código e publicar issues exige a autorização de repositório da própria pessoa, feita à parte.
- Monorepo pnpm: `apps/web` (Next.js 16, React 19, Tailwind 4) e `packages/api` (tRPC).
- O workspace de issues usa as tarefas persistidas pela API: histórico compartilhado do projeto, conversa, revisões do draft, atividade de consulta e resultado da publicação. A tarefa nasce na primeira mensagem aceita; só a pessoa autora envia mensagens, dita, edita e publica, e os demais membros leem.
- Ditado: o áudio é capturado no navegador, transcrito por um serviço externo (Groq) e vira texto editável; nada é enviado sem o Enviar manual e o áudio não é guardado.
- Interface em português (pt-BR).

## Brand Commitments

Nome exibido: **Flow Dev**.

## Evidence on Hand

Nenhum cliente, métrica ou depoimento real. Não inventar números, logos de clientes ou claims comerciais. O workspace mostra somente o que a API registrou: nenhuma conversa, consulta, tempo ou número de issue é simulado.

## Product Principles

1. Nada vai ao GitHub sem aprovação explícita do dev.
2. Mostrar de onde o agente tirou o contexto (quais tools, quais arquivos/issues).
3. Perguntar antes de supor: clarificação é parte do fluxo, não falha.
4. O draft é editável e é a fonte da verdade até a publicação.
5. A publicação encerra a primeira etapa, não a tarefa: a mesma tarefa segue para o **planejamento**. O Dev Control analisa somente o snapshot da Issue publicada e recomenda uma rota (Execução direta, Tech Spec ou PRD) com complexidade, motivos e pendências. A pessoa autora pode salvar outra rota e aprova exatamente a rota salva; a aprovação é final e não inicia nenhuma atividade seguinte nem escreve no GitHub.
6. Com o planejamento aprovado, a pessoa autora inicia explicitamente a **especificação** pela rota salva (PRD → TechSpec → Tasks, ou TechSpec → Tasks). Um worker dedicado prepara o checkout isolado e executa o agente; a pessoa autora acompanha a atividade real, responde perguntas e permissões pontuais, revisa cada etapa como documentos separados e fiéis ao que foi capturado, pede ajustes ou aprova a versão exata. A aprovação nunca inicia a etapa seguinte, não publica nada no Git nem escreve no GitHub; leitores e administradores autorizados apenas observam.
