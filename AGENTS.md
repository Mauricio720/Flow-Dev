# Instruções para agentes — Flow Dev

Estas instruções valem para todo o monorepo. Ao trabalhar em `apps/web`, leia também `apps/web/AGENTS.md`.

## Contexto do projeto

- `apps/web`: aplicação Next.js com App Router, React e Tailwind.
- `packages/api`: contratos, procedimentos tRPC e camadas de backend.
- `apps/web/PRODUCT.md` descreve o produto; `apps/web/DESIGN.md` orienta mudanças visuais.
  Confirme no código antes de tratar uma integração descrita no produto como implementada.

## Rules

- Leia e aplique `.agents/rules/code-standards.md` em todo código novo ou alterado.
- Ao criar ou revisar testes end-to-end, leia e aplique `.agents/rules/e2e-testing.md`.
- As cópias em `.claude/rules/` atendem ao Claude e devem permanecer iguais às de `.agents/rules/`.

## Skills: quando usar

As skills locais ficam em `.agents/skills/<nome>/SKILL.md`; o Claude encontra as mesmas skills em `.claude/skills/<nome>/SKILL.md`. Leia a skill aplicável antes de implementar. Use mais de uma quando a tarefa atravessar camadas.

| Tarefa | Skill obrigatória |
| --- | --- |
| Criar, mover ou revisar arquivos de frontend no Next.js; decidir onde ficam páginas, componentes, hooks ou providers | `nextjs-folder-structure` |
| Criar ou alterar operações de backend, controllers, serviços, DAOs, repositórios ou integrações | `layered-backend` |
| Criar, alterar ou consumir procedimentos tRPC, routers, contexto, middleware ou tratamento de erros tRPC | `trpc-nextjs` |
| Criar, modificar, avaliar ou otimizar uma skill | `skill-creator` |

Em uma funcionalidade tRPC ponta a ponta, combine `nextjs-folder-structure` para o frontend, `trpc-nextjs` para a fronteira de transporte e `layered-backend` para a lógica e os dados.

## Verificação

Execute as verificações pertinentes à mudança. Os comandos do monorepo são `pnpm lint`, `pnpm typecheck` e `pnpm build`; confira os scripts de cada pacote antes de escolher. Reporte o que foi executado e qualquer limitação.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
