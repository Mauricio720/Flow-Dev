import type { Session } from "../model";

// Demonstration data only: repository, files and issue numbers are synthetic.
export const demoSessions: Session[] = [
  {
    id: "s-reset",
    title: "Recuperação de senha",
    branch: "issue/recuperacao-de-senha",
    phase: "draft",
    items: [
      { id: "r1", kind: "user", at: "09:41", text: "Quero adicionar recuperação de senha." },
      {
        id: "r2",
        kind: "tools",
        calls: [
          { id: "r2a", tool: "searchProject", target: "reset password | recuperar senha", status: "done", result: "3 arquivos", ms: 212 },
          { id: "r2b", tool: "readProjectFile", target: "src/features/auth/login-form.tsx", status: "done", result: "142 linhas", ms: 38 },
          { id: "r2c", tool: "readProjectFile", target: "src/server/auth/session.ts", status: "done", result: "88 linhas", ms: 31 },
          { id: "r2d", tool: "searchGitHubIssues", target: "password reset", status: "done", result: "1 issue", ms: 406 },
          { id: "r2e", tool: "getGitHubIssue", target: "#97", status: "done", result: "fechada", ms: 188 },
        ],
      },
      {
        id: "r3",
        kind: "clarify",
        at: "09:41",
        text: "O login está em `login-form.tsx` e a sessão em `session.ts`, mas não existe fluxo de reset. A #97 pediu isso em março e foi fechada sem implementação. Antes do draft: quanto tempo o link de recuperação deve valer, e o e-mail pode sair pelo serviço que já existe em `src/server/mail`?",
        suggestions: ["30 minutos, pelo serviço existente", "1 hora, pelo serviço existente"],
      },
      { id: "r4", kind: "user", at: "09:43", text: "Expira em 30 minutos. Pode usar o mesmo serviço de e-mail." },
      { id: "r5", kind: "agent", at: "09:43", text: "Montei o draft com base no que li. Revise, ajuste o que quiser e publique quando estiver pronto." },
      {
        id: "r6",
        kind: "draft",
        status: "review",
        draft: {
          title: "Adicionar fluxo de recuperação de senha por e-mail",
          context:
            "O formulário de login (`src/features/auth/login-form.tsx`) não oferece forma de redefinir a senha. A issue #97 levantou o problema e foi fechada sem implementação.",
          goal: "Permitir que o usuário redefina a senha por um link enviado por e-mail, válido por 30 minutos.",
          criteria: [
            "Link \"Esqueci minha senha\" na tela de login",
            "Token de uso único que expira em 30 minutos",
            "E-mail enviado pelo serviço existente em `src/server/mail`",
            "Sessões ativas encerradas depois da troca de senha",
            "Mesma resposta para e-mails cadastrados e não cadastrados",
          ],
          labels: ["feature", "auth"],
          references: [
            { label: "src/features/auth/login-form.tsx", source: "project" },
            { label: "src/server/auth/session.ts", source: "project" },
            { label: "#97", source: "github" },
          ],
        },
      },
    ],
  },
  {
    id: "s-discount",
    title: "Total errado com desconto",
    branch: "fix/total-com-desconto",
    phase: "awaiting",
    items: [
      { id: "d1", kind: "user", at: "08:12", text: "Tem um bug no total do pedido." },
      {
        id: "d2",
        kind: "tools",
        calls: [
          { id: "d2a", tool: "searchProject", target: "order total", status: "done", result: "2 arquivos", ms: 187 },
          { id: "d2b", tool: "readProjectFile", target: "src/features/checkout/order-summary.ts", status: "done", result: "64 linhas", ms: 29 },
          { id: "d2c", tool: "searchGitHubIssues", target: "total pedido", status: "empty", result: "nada encontrado", ms: 351 },
        ],
      },
      {
        id: "d3",
        kind: "clarify",
        at: "08:12",
        text: "O cálculo fica em `order-summary.ts` e não achei issue aberta sobre isso. O que precisa ser corrigido no pedido?",
        suggestions: ["O total ignora o cupom de desconto", "O frete é somado duas vezes"],
      },
    ],
  },
  {
    id: "s-export",
    title: "Exportar pedidos em CSV",
    branch: "issue/exportar-pedidos-csv",
    phase: "published",
    items: [
      { id: "e1", kind: "user", at: "ontem", text: "Preciso exportar os pedidos filtrados em CSV." },
      {
        id: "e2",
        kind: "tools",
        calls: [
          { id: "e2a", tool: "searchProject", target: "orders filter", status: "done", result: "4 arquivos", ms: 240 },
          { id: "e2b", tool: "searchGitHubIssues", target: "export csv", status: "done", result: "2 issues", ms: 377 },
        ],
      },
      {
        id: "e3",
        kind: "draft",
        status: "published",
        issueNumber: 141,
        draft: {
          title: "Exportar pedidos filtrados em CSV",
          context: "A listagem de pedidos já aceita filtros, mas não há como levar o resultado para uma planilha.",
          goal: "Gerar um CSV com exatamente os pedidos visíveis no filtro atual.",
          criteria: ["Botão \"Exportar CSV\" na listagem", "Respeita todos os filtros ativos", "Datas no formato ISO 8601"],
          labels: ["feature", "pedidos"],
          references: [{ label: "src/features/orders/order-filters.tsx", source: "project" }],
        },
      },
    ],
  },
  {
    id: "s-webhook",
    title: "Timeout no webhook de pagamento",
    branch: "fix/timeout-webhook-pagamento",
    phase: "published",
    items: [
      { id: "w1", kind: "user", at: "seg", text: "O webhook de pagamento está estourando o timeout em produção." },
      {
        id: "w2",
        kind: "draft",
        status: "published",
        issueNumber: 139,
        draft: {
          title: "Responder ao webhook de pagamento antes de processar o pedido",
          context: "O handler processa o pedido inteiro antes de responder e ultrapassa o limite do provedor.",
          goal: "Responder em menos de 2 segundos e processar o pedido em segundo plano.",
          criteria: ["Resposta 200 imediata", "Processamento enfileirado", "Idempotência por ID do evento"],
          labels: ["bug", "pagamentos"],
          references: [{ label: "src/server/webhooks/payment.ts", source: "project" }],
        },
      },
    ],
  },
];
