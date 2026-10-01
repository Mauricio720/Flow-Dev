# Instruções para agentes — apps/web

Estas orientações complementam o `AGENTS.md` da raiz.

- Leia `PRODUCT.md` antes de alterar fluxos, textos ou comportamento do produto.
- Leia `DESIGN.md` antes de alterar interface, estilos, componentes visuais ou responsividade.
- Use `nextjs-folder-structure` ao criar, mover ou revisar arquivos de frontend. Mantenha as entradas de rota enxutas e coloque fluxos de produto em `src/features/` conforme a skill.
- Use também `trpc-nextjs` quando a mudança tocar o cliente tRPC, uma chamada de procedimento ou a rota `src/app/api/trpc/[trpc]/route.ts`.
- Se a mudança incluir lógica ou persistência em `packages/api`, use também `layered-backend`.
- Aplique as rules da raiz: `.agents/rules/code-standards.md` para código e `.agents/rules/e2e-testing.md` para testes end-to-end.

## shadcn/ui

Os primitivos visuais ficam em `src/components/ui/` e são instalados com `pnpm dlx shadcn@latest add <componente>` (config em `components.json`).

- **Nunca instale a paleta padrão do shadcn.** O contrato de tokens dele (`primary`, `muted`, `ring`, …) está resolvido sobre as custom properties do `DESIGN.md` no bloco `@theme inline` de `src/app/globals.css`. Um token novo do shadcn entra apontando para um token existente; não crie cor nova sem antes atualizar o `DESIGN.md`.
- O tema vem da media query `prefers-color-scheme`, não de uma classe `.dark`. O `@custom-variant dark` no topo do `globals.css` mantém o variant `dark:` do shadcn alinhado a isso.
- Ícones vêm de `src/components/icons.tsx` (traço 1.75, viewBox 24). Ao adicionar um componente que importa `lucide-react`, troque pelo ícone equivalente do projeto e remova a dependência.
- Depois de `shadcn add`, confira o import do `cn`: a CLI às vezes escreve `from "cn"` em vez de `@/lib/utils`.
- As medidas dos variants saem do `DESIGN.md`: ação 40px, fantasma 36px, login 48px, raio 8px. `variant="publish"` é o verde de publicação e só vale para draft, aprovação e publicação (The Green Is Publication Rule).
- `src/components/ui/` é código de terceiros versionado: fica fora do limite de 100 linhas do `code-standards.md`, para continuar atualizável pela CLI.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
