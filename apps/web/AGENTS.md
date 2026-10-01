# Instruções para agentes — apps/web

Estas orientações complementam o `AGENTS.md` da raiz.

- Leia `PRODUCT.md` antes de alterar fluxos, textos ou comportamento do produto.
- Leia `DESIGN.md` antes de alterar interface, estilos, componentes visuais ou responsividade.
- Use `nextjs-folder-structure` ao criar, mover ou revisar arquivos de frontend. Mantenha as entradas de rota enxutas e coloque fluxos de produto em `src/features/` conforme a skill.
- Use também `trpc-nextjs` quando a mudança tocar o cliente tRPC, uma chamada de procedimento ou a rota `src/app/api/trpc/[trpc]/route.ts`.
- Se a mudança incluir lógica ou persistência em `packages/api`, use também `layered-backend`.
- Aplique as rules da raiz: `.agents/rules/code-standards.md` para código e `.agents/rules/e2e-testing.md` para testes end-to-end.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
