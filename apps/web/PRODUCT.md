# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Desenvolvedores do próprio time. Chegam com uma intenção ainda crua (uma feature, um bug, um ajuste) e querem transformá-la numa GitHub Issue bem escrita sem sair do fluxo de trabalho nem redigir tudo à mão.

## Product Purpose

Flow Dev é um console onde o dev conversa com o agente **Issue Author** (Mastra). O agente entende a intenção, consulta contexto do projeto e do GitHub quando precisa, pede clarificação quando falta informação e produz um **draft de Issue** (Título, Contexto, Objetivo, critérios…). O dev revisa, edita e aprova; só então o backend publica a Issue no GitHub. Sucesso: issue publicada com contexto correto, em poucas trocas, sem retrabalho.

## Positioning

A issue nasce fundamentada no código e no histórico reais: o agente lê arquivos do projeto e issues existentes antes de escrever, e nada é publicado sem aprovação explícita do dev.

## Operating Context

Fluxo: (1) dev descreve a intenção → (2) UI envia ao backend → (3) backend chama o Issue Author → (4) agente usa tools de contexto: Projeto (`searchProject`, `readProjectFile`), GitHub (`searchGitHubIssues`, `getGitHubIssue`), outros contextos no futuro → (5) agente responde ou pede clarificação → (6) ou gera um draft da Issue → (7) dev revisa/edita e aprova "Criar Issue" → (8) backend publica no GitHub e mantém o vínculo.

## Capabilities and Constraints

- Autenticação apenas via GitHub OAuth (o login concede o vínculo para publicar issues).
- Monorepo pnpm: `apps/web` (Next.js 16, React 19, Tailwind 4) e `packages/api` (tRPC).
- Escopo atual: somente frontend. Telas usam dados simulados; nenhuma integração com backend, tRPC, Mastra ou GitHub ainda.
- Interface em português (pt-BR).

## Brand Commitments

Nome exibido: **Flow Dev**.

## Evidence on Hand

Nenhum cliente, métrica ou depoimento real. Não inventar números, logos de clientes ou claims comerciais. Conversas e drafts exibidos são dados de demonstração.

## Product Principles

1. Nada vai ao GitHub sem aprovação explícita do dev.
2. Mostrar de onde o agente tirou o contexto (quais tools, quais arquivos/issues).
3. Perguntar antes de supor: clarificação é parte do fluxo, não falha.
4. O draft é editável e é a fonte da verdade até a publicação.
