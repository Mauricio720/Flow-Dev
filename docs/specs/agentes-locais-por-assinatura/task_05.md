---
status: completed
title: Seção Agentes nas Configurações e mensagens novas
type: frontend
complexity: medium
---

# Task 05: Seção Agentes nas Configurações e mensagens novas

## Visão geral
As Configurações do projeto ganham a seção "Agentes". Nela, o admin edita o provedor, o modelo e o esforço do Issue Author e do Planejamento, e o membro vê os valores sem editar. As mensagens de falha passam a nomear a assinatura e deixam de citar o Dev Control.

<critical>
- LEIA a spec (`spec.md`, US-03, REQ-014, REQ-015, REQ-019, §15) e as regras do projeto (AGENTS.md, `apps/web/AGENTS.md`, `.agents/rules/code-standards.md`) antes de começar. Leia a skill `nextjs-folder-structure` e o guia em `apps/web/node_modules/next/dist/docs/`.
- FAÇA UMA MINI-TAREFA POR VEZ, na ordem. Só marque `[x]` depois de rodar o "Pronto quando" dela e ver passar.
- NÃO saia dos arquivos listados sem registrar o motivo no Registro de execução. Nada fora do escopo da spec.
- TESTES JUNTO COM O CÓDIGO: cada mini-tarefa implementa os testes atribuídos a ela.
- Ao começar, mude `status` para `in_progress` (aqui e em `_tasks.md`). Não marque `completed`: isso acontece depois da revisão aprovada.
</critical>

## Requisitos
- REQ-014: a seção "Agentes" DEVE ter dois blocos, Issue Author e Planejamento, cada um com provedor, modelo e esforço.
- REQ-015 (UI): só o admin vê controles de edição; o membro vê somente leitura.
- REQ-018 (UI): um conflito de versão mostra "A configuração mudou desde que você abriu a página. Recarregue para ver a versão atual.".
- REQ-019 (UI): um modelo salvo fora do catálogo mostra "Modelo indisponível, escolha outro".
- REQ-009 e REQ-010 (texto): as falhas de CLI indisponível e de limite de uso nomeiam o provedor.
- US-03 cenários 1–3.
- Não muda (spec §9): nome, descrição, repositório e quadro nas Configurações continuam iguais.

## Interfaces
- **Consome:**
  - `projects.agentSettings.get({ projectId }) → { agents: AgentSettingView[]; catalog }` e `projects.agentSettings.update({ projectId, agent, provider, model, effort, expectedVersion }) → AgentSettingView` (tarefa 02);
  - as reasons `agent_settings_invalid` e `agent_settings_conflict` (tarefa 02).
- Os códigos `local_agent_unavailable`, `agent_settings_invalid`, `planning_local_agent_unavailable` e `planning_agent_settings_invalid` entram só como chaves literais dos mapas de texto, com os nomes da spec §15. Nada é importado da tarefa 06, que os cria no backend.
- **Produz:** `<AgentSettingsEditor project agents catalog />` e `<AgentSettingsReadOnly agents />`.

## Mini-tarefas

- [x] **05.1 — Mensagens de falha sem "Dev Control" e códigos novos**
  - **Arquivos:** `apps/web/src/features/issues/issue-composer/taskCopy.ts`, `apps/web/src/features/issues/issue-composer/components/TaskProgress.tsx` (`GENERATION_REASONS`), `apps/web/src/features/issues/assigned-work/planningCopy.ts` e os testes vizinhos desses arquivos
  - **Testes:** V-03f, V-09f, V-09g
  - **Pronto quando:** `pnpm --dir apps/web exec vitest run src/features/issues` passa; `pnpm --dir apps/web typecheck` sem erros
- [x] **05.2 [P] — Somente leitura e carregamento na página**
  - **Arquivos:** `apps/web/src/features/projects/project-settings/components/AgentSettingsReadOnly.tsx` e `apps/web/src/features/projects/project-settings/agentSettingsCopy.ts` (criar), `apps/web/src/features/projects/project-settings/index.tsx`, `apps/web/src/app/projects/[projectId]/settings/page.tsx`, `apps/web/src/features/projects/project-settings/AgentSettings.test.tsx` (criar)
  - **Testes:** V-09b, V-09d
  - **Pronto quando:** `pnpm --dir apps/web exec vitest run src/features/projects/project-settings` passa; typecheck sem erros
  - **Nota:** com `canEdit: true`, mostrar também a somente leitura até a 05.3 trocar pelo editor.
- [x] **05.3 — Editor por agente com versão e conflito**
  - **Arquivos:** `apps/web/src/features/projects/project-settings/components/AgentSettingsEditor.tsx`, `apps/web/src/features/projects/project-settings/components/AgentChoiceFields.tsx` e `apps/web/src/features/projects/project-settings/hooks/useAgentSettingsEditor.ts` (criar), `index.tsx`, `AgentSettings.test.tsx`
  - **Testes:** V-09a, V-09c
  - **Pronto quando:** `pnpm --dir apps/web exec vitest run src/features/projects/project-settings` passa; typecheck sem erros
- [x] **05.4 — E2E da seção Agentes**
  - **Arquivos:** `apps/web/e2e/project-admin.spec.ts`
  - **Testes:** V-09e
  - **Pronto quando:** `pnpm --dir apps/web exec playwright test e2e/project-admin.spec.ts` passa

## Detalhes de implementação
- **Padrão a espelhar:** `DetailsEditor.tsx`, `useDetailsEditor.ts` e `useEditorFeedback.ts`, em `apps/web/src/features/projects/project-settings/`. Cada agente é salvo à parte, com o próprio `expectedVersion`.
- **Rótulos:** "Claude Code" e "Codex"; esforço "Baixo", "Médio" e "Alto" (valores `low`, `medium` e `high`).
- **Troca de provedor:** volta o modelo para o primeiro da lista desse provedor no `catalog`.
- **Lista de provedores:** vem sempre do `catalog` da API, nunca fixa na UI. Se o Codex foi retirado, ele simplesmente não aparece.
- **Textos novos:**
  - `provider_usage_limit` → "A assinatura do {provedor} atingiu o limite de uso. Tente de novo mais tarde ou troque o provedor nas Configurações do projeto.". O provedor vem do detalhe da falha; sem detalhe, "do agente".
  - `local_agent_unavailable` / `planning_local_agent_unavailable` → "O {CLI} não está disponível nesta máquina: {detalhe}.".
  - `agent_settings_invalid` / `planning_agent_settings_invalid` → "O modelo configurado para este agente não está mais disponível. Escolha outro nas Configurações do projeto.".
  - `planning_rate_limited`, `planning_provider_unavailable` e `AWAITING_EXPLANATION` deixam de citar "Dev Control" e passam a falar do agente de planejamento.
- **E2E:** seguir as regras de `.agents/rules/e2e-testing.md` (locators acessíveis, testes independentes, nada de produção).

### Arquivos relevantes
- `apps/web/src/features/projects/project-settings/ProjectSettings.test.tsx`: o padrão de teste de componente da tela.
- `apps/web/e2e/fixtures/seed.ts`: o seed de admin e membro para o e2e.

### Arquivos afetados
- `apps/web/src/features/projects/project-settings/index.tsx`: inclui a seção.
- `apps/web/src/app/projects/[projectId]/settings/page.tsx`: carrega `agentSettings.get` no servidor.

### Decisões relacionadas
- DEC-05 (spec §17): a configuração é por projeto, com padrão quando não há linha.

## Premissas
- Se a tarefa 01 deu "Codex: retirado", o V-09a usa Claude/`opus` no lugar de Codex/`gpt-6.1-sol`.

## Testes atribuídos
- [x] V-03f: `provider_usage_limit` com detalhe "Claude Code" no `TaskProgress` → o texto de US-01 cen. 3; sem detalhe, "do agente".
- [x] V-09f: nenhum texto de `planningCopy.ts` contém "Dev Control".
- [x] V-09g: `local_agent_unavailable` e `agent_settings_invalid` têm texto próprio no `TaskProgress`.
- [x] V-09b: `canEdit: false` → valores visíveis, sem selects nem botão.
- [x] V-09d: `modelAvailable: false` → o aviso "Modelo indisponível, escolha outro".
- [x] V-09a: o admin troca o Planejamento para Codex/`gpt-6.1-sol`/Médio e salva → `update` com `expectedVersion: 0`; o bloco mostra a escolha, e o Issue Author não muda.
- [x] V-09c: `update` rejeita com `agent_settings_conflict` → a mensagem exata de US-03 cen. 3.
- [x] V-09e: no e2e, o admin salva o Planejamento e recarrega → a escolha persiste; um membro sem admin vê somente leitura.

## Critérios de sucesso
- Todas as mini-tarefas marcadas, cada uma com o "Pronto quando" executado.
- Todos os testes atribuídos implementados e passando.
- A seção aparece nas Configurações de um projeto real com `pnpm dev`, nos dois papéis.
- Typecheck e lint de `apps/web` sem erros; nenhuma regra do AGENTS.md violada.

## Registro de execução

- **Leitura:** `apps/web/AGENTS.md`, a skill `nextjs-folder-structure` e o padrão de `DetailsEditor`/`useDetailsEditor`. A rota `settings/page.tsx` continua enxuta: só carrega `agentSettings.get` pelo caller do servidor e entrega à feature.
- **05.1:** `src/lib/tasks/agentFailureCopy.ts` (compartilhado, porque `issue-composer` e `assigned-work` não importam um do outro) monta os textos de limite de uso (provedor vem do `detail`; sem detalhe, "agente"), CLI indisponível ("O {CLI} não está disponível nesta máquina: {instrução}.") e modelo indisponível. `reasonMessage(reason, detail?)` nos dois `taskCopy.ts`; `TaskProgress` e `PlanningStage` passam o `detail` (que a 06.2 passou a devolver nos DTOs). `planningCopy.ts`, `progressCopy.ts`, `planningModel.ts` e `SourcesPanel.tsx` não citam mais o Dev Control. Desvio: o `SNAPSHOT_BASIS` e o texto do `SourcesPanel` diziam que nenhum repositório era consultado, o que deixou de ser verdade (o agente pode consultar), então foram reescritos. Testes: `TaskProgress.test.tsx` (V-03f, V-09g), `planningCopy.test.ts` (V-09f).
- **05.2:** `AgentSettingsReadOnly.tsx`, `agentSettingsCopy.ts`, props `agentSettings` em `ProjectSettings` e na página; fixtures `agentSettingsOf`/`agentViewOf` em `src/test/projects.ts`. V-09b e V-09d.
- **05.3:** `AgentSettingsEditor.tsx` (um formulário por agente, com o `expectedVersion` próprio), `AgentChoiceFields.tsx` (`<select>` nativos, porque o Select do Radix é difícil de usar em teste e menos acessível aqui), `useAgentSettingsEditor.ts`. A lista de provedores vem do `catalog`; trocar de provedor volta ao primeiro modelo dele. V-09a, V-09c e extras (19 testes em `project-settings`; typecheck e `pnpm lint` do web limpos).
- **05.4:** `E2E-006` em `project-admin.spec.ts` (admin salva Planejamento → Codex/Médio e recarrega; membro vê só leitura). Para rodar: banco descartável `flow_dev_e2e_agents` migrado até a 0045 (removido no fim), `BETTER_AUTH_URL=http://127.0.0.1:3000` (sem isso a rota tRPC recusa a origem e todo salvamento falha, inclusive os testes antigos), `E2E_*` conforme a memória do projeto. Resultado: 5 passam, 2 `fixme`. Ajustei duas asserções antigas que estavam desatualizadas e falhavam sem relação com esta tarefa: o escopo OAuth esperado agora é `repo project offline_access` (`repositoryOAuthController.ts:6`) e a tela tem 3 caixas de texto (nome, descrição e o link do quadro).
- **Achado do build:** o Turbopack do Next recusou `new URL("../resources/agents/", import.meta.url)` em `agentInstructions.ts` (a web importa `composition.ts` pelo `server.ts`). Troquei por `join(dirname(fileURLToPath(import.meta.url)), ...)`; o teste unitário continua verde e o app sobe.

## Revisões

- 2026-11-22 · review-003 · APROVADO COM RESSALVAS · reviews/review-003.md (as revisões 001 e 002 reprovaram; todos os achados delas foram corrigidos e reconferidos na 003)
