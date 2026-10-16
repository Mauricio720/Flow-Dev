import { readPackage } from "../packageReader";
import { NOTIFICATIONS_SPEC, NOTIFICATIONS_STORIES } from "./overviewFixtures";

const JOURNEY = `## Experiência da pessoa

1. A pessoa vê o sino com a contagem.
2. Abre o painel com as cinco recentes.
3. Marca uma notificação como vista.

## Questões em aberto`;

const TECHNICAL_EXTRA = `
## Arquitetura e fronteiras

\`\`\`mermaid
flowchart LR
  A[Shell] --> B[NotificationsProvider]
  B -->|consulta| C[(notification)]
  B --> D[Sino]
\`\`\`

- Novo \`notifications-provider.tsx\`: identidade da sessão e resumo.

## Monitoramento no cliente

1. O provider inicia o resumo com sessão autenticada.
2. Falha transitória não limpa o último sucesso.
`;

export const NOTIFICATIONS_TESTS = `# Contrato de testes

## Matriz de cobertura

| Origem | Invariante | Dono canônico |
|---|---|---|
| US-001.AC-1–2 | Quantidade comum | E2E-001; IT-009 para monitor único |
| US-009.AC-1 | Linha órfã | IT-099 |
| \`_dx.md\` — validação | Entrada estrita | Revisão documental |

## Testes de integração

- **IT-009 — Monitor único:** um provider por shell.
- **UT-001** (\`boundary\`) — \`NotificationBadge\`: limite visual. Mais texto.

### E2E-001: Primeira fatia
`;

export const NOTIFICATIONS_DX = `# Contrato de desenvolvimento

## \`notification.summary\`

Tipo: query autenticada, sem entrada.

| Campo | Forma |
|---|---|
| \`unreadCount\` | Inteiro |

\`\`\`ts
await api.notification.summary();
\`\`\`
`;

export const FULL_SPEC = `${NOTIFICATIONS_SPEC.replace("## Questões em aberto", JOURNEY)}${TECHNICAL_EXTRA}`;

export function fullDocuments(spec = FULL_SPEC) {
  return [
    { path: "_spec.md", role: "spec", sourceText: spec },
    { path: "_user_stories.md", role: "user_stories", sourceText: NOTIFICATIONS_STORIES.replace("## Índice", "## Personas\n\n- **Comprador:** acompanha novidades.\n\n## Índice") },
    { path: "_dx.md", role: "dx", sourceText: NOTIFICATIONS_DX },
    { path: "_tests.md", role: "tests", sourceText: NOTIFICATIONS_TESTS },
  ];
}

export function fullTabs(spec = FULL_SPEC) {
  return readPackage({ documents: fullDocuments(spec) } as never);
}
