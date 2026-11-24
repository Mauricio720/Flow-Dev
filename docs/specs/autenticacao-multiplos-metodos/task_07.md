---
status: pending
title: Formulário de email e senha, verificação e redefinição
type: frontend
complexity: medium
---

# Task 07: Formulário de email e senha, verificação e redefinição

## Visão geral
Entrega as telas do fluxo de email/senha: formulário "Entrar"/"Criar conta" no login, aviso de verificação, destino do link de verificação, pedido de recuperação e redefinição da senha. Usa o `authClient` e as mensagens da spec.

<critical>
- LEIA a spec e as regras do projeto (AGENTS.md, `.agents/rules/code-standards.md`, `apps/web/AGENTS.md`, `apps/web/DESIGN.md`) antes de começar. Leia o guia relevante em `apps/web/node_modules/next/dist/docs/` e a skill `nextjs-folder-structure` antes de criar rotas.
- FAÇA UMA MINI-TAREFA POR VEZ, na ordem. Só marque `[x]` depois de rodar o "Pronto quando" dela e ver passar.
- NÃO saia dos arquivos listados sem registrar o motivo no Registro de execução. Nada fora do escopo da spec.
- TESTES JUNTO COM O CÓDIGO, seguindo `software-testing`: componentes reais; `authClient` por dublê.
- Ao começar, mude `status` para `in_progress` (aqui e em `_tasks.md`). Só mude para `completed` com todos os critérios comprovados por comando.
</critical>

## Requisitos
- REQ-009, REQ-010 (mensagem): cadastro mostra "Enviamos um link de verificação para <email>" e a regra "A senha deve ter de 8 a 128 caracteres".
- REQ-011, REQ-013 (interface): entrada de email não verificado informa o reenvio; link expirado oferece novo envio.
- REQ-014 (mensagem): "Email ou senha incorretos".
- REQ-016 (mensagem): "Se o email existir, enviamos um link".
- REQ-017 (interface): tela de nova senha; link expirado mostra "Link expirado" com opção de pedir outro.
- B-02 (mensagem): "Não conseguimos enviar o email" com opção de reenviar. B-04: 429 → "Muitas tentativas. Aguarde um minuto e tente novamente."
- NFR-05: campos com rótulo, erros em região `alert`, tudo operável por teclado, foco visível (WCAG 2.1 AA).

## Interfaces
- **Consome:** `authClient.signUp.email`, `signIn.email`, `requestPasswordReset`, `resetPassword`, `sendVerificationEmail`; `LoginScreen` com `emailPasswordEnabled` (tarefa 06); configuração de links da tarefa 05 (URL de verificação e de redefinição apontando para rotas desta tarefa).
- **Produz:** `EmailPasswordForm` (abas Entrar/Criar conta), rotas `/login/verificar` e `/login/redefinir-senha` (nomes finais conforme `nextjs-folder-structure`; atualizar a configuração da tarefa 05 se mudarem).

## Mini-tarefas

- [ ] **07.1 — Formulário de entrada e cadastro**
  - **Arquivos:** `apps/web/src/features/auth/login/components/EmailPasswordForm.tsx` (criar), `apps/web/src/features/auth/login/components/emailPasswordMessages.ts` (criar), `apps/web/src/features/auth/login/index.tsx` (alterar: renderizar quando `emailPasswordEnabled`), `apps/web/src/features/auth/login/components/EmailPasswordForm.test.tsx` (criar)
  - **Testes:** V-09d (rótulos, foco, `alert`, teclado do formulário)
  - **Pronto quando:** `pnpm --dir apps/web exec vitest run src/features/auth/login/components/EmailPasswordForm.test.tsx` passa
- [ ] **07.2 — Estados do cadastro e da entrada**
  - **Arquivos:** `EmailPasswordForm.tsx` e seu teste (estender)
  - **Testes:** US-02 cenários 1, 2, 4 e 5 e B-02, B-04 em nível de interface (V-09d)
  - **Pronto quando:** o teste passa com: aviso de verificação, entrada de email não verificado com reenvio, regra de senha, "Email ou senha incorretos", falha de envio, 429
- [ ] **07.3 — Destino do link de verificação**
  - **Arquivos:** `apps/web/src/app/login/verificar/page.tsx` (criar), `apps/web/src/features/auth/login/components/VerificationResult.tsx` (criar), teste correspondente (criar)
  - **Testes:** US-02 cenários 2 e 3 (interface), REQ-013 (interface)
  - **Pronto quando:** `pnpm --dir apps/web exec vitest run src/features/auth/login` passa; `pnpm --dir apps/web typecheck` sem erros
- [ ] **07.4 — Pedido de recuperação e nova senha**
  - **Arquivos:** `apps/web/src/app/login/redefinir-senha/page.tsx` (criar), `apps/web/src/features/auth/login/components/PasswordResetRequest.tsx` e `PasswordResetForm.tsx` (criar), testes correspondentes (criar)
  - **Testes:** US-05 cenários 1, 2 e 4 (interface)
  - **Pronto quando:** `pnpm --dir apps/web exec vitest run src/features/auth/login` passa; `pnpm --dir apps/web lint` e `typecheck` sem erros

## Detalhes de implementação
Espelhar `SocialSignIn.tsx` (tarefa 06) no tratamento de pendência e de erro 429. As rotas novas são públicas: conferir como `/login` é tratada pela proteção de rotas. Cada arquivo com até 100 linhas.

### Arquivos relevantes
- `apps/web/src/features/auth/login/`: estrutura criada na tarefa 06.
- `apps/web/src/app/login/page.tsx`.

### Arquivos afetados
- Os da lista de mini-tarefas.

### Decisões relacionadas
- DEC-01.

## Premissas
Nomes de rota `/login/verificar` e `/login/redefinir-senha` são propostos; ajustar junto com a configuração da tarefa 05.

## Testes atribuídos
- [ ] V-09d: formulário com rótulos "Email" e "Senha", erros em `alert`, foco visível e operável por teclado; "Criar conta" mostra o aviso de verificação; senha curta mostra a regra; erro mostra "Email ou senha incorretos"; 429 mostra a mensagem de espera · componente real, `authClient` por dublê

## Critérios de sucesso
- Todas as mini-tarefas marcadas, cada uma com o "Pronto quando" executado.
- Todos os testes atribuídos implementados e passando.
- Os links dos emails da tarefa 05 apontam para rotas existentes.
- Typecheck e lint de `apps/web` sem erros.

## Registro de execução
