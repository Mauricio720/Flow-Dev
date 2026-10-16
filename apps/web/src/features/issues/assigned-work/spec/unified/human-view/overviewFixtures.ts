import { readPackage } from "../packageReader";

export const NOTIFICATIONS_SPEC = `# Issue #32 — Notificações

# Parte I — Product

## Resumo executivo

- **O que muda:** comprador e fornecedor terão sino com contagem de não vistas.
- **Por que importa:** a pessoa identifica as novidades sem abrir o menu.
- **Decisões principais:** marcação como vista somente por ação explícita; atualização a cada 10 segundos. “Marcar todas” abrange as existentes.
- **Riscos e restrições:** polling tem atraso; respostas antigas não podem apagar pendências.
- **Questões não resolvidas:** nenhuma decisão de produto bloqueante.

## Decisões confirmadas pelo autor

| Decisão | Resposta registrada | Consequência |
|---|---|---|
| D1 — Superfície | “Sino com contagem” | Sino separado do hamburger |

## Questões em aberto

Nenhuma escolha de produto necessária à especificação está pendente.

# Parte II — Technical

## Análise de impacto e compatibilidade

| Alvo | Regime | Risco e tratamento |
|---|---|---|
| \`summary\` | aditivo | Expor tipos exatos |
| Booleano da sidebar | Código interno: remover na mesma mudança | Sem fallback |

## Riscos conhecidos

- Contagem exata custa mais que existência: confirmar índices.
- **Risco de versão:** conferir assinaturas do tRPC.

## Referências de arquivos

| Referência existente | Por que ler |
|---|---|
| \`sidebar.tsx\` | Contexto atual |
| \`trpc.ts\` | Identidade |
`;

export const NOTIFICATIONS_STORIES = `# Histórias de usuário — Issue #32

## Índice

| ID | Área | Persona | Resultado |
|---|---|---|---|
| US-001 | Descoberta | Comprador/fornecedor | Identificar quantidade de notificações não vistas |

## US-001 — Identificar minhas pendências

**Como** comprador, **quero** perceber quantas notificações ainda não vi, **para** decidir quando consultá-las.

Critérios de aceitação:

- AC-1: Havendo sete não vistas, o sino mostra sete.
- **AC-2:** O comportamento é igual nos dois perfis.

Casos de borda:

- EC-1: Quantidade zero → sino sem badge.

## US-002 — Retirada (withdrawn)

Sem efeito.
`;

export function specTabs(spec = NOTIFICATIONS_SPEC, stories = NOTIFICATIONS_STORIES) {
  return readPackage({ documents: [{ path: "_spec.md", role: "spec", sourceText: spec }, { path: "_user_stories.md", role: "user_stories", sourceText: stories }] } as never);
}
