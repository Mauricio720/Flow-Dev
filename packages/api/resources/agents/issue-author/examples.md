# Examples

These examples demonstrate the expected behavior of the `create-github-issue` skill.

The examples are normative: when a similar situation occurs, follow the same
reasoning boundaries.

The core principle is:

> Plausible does not mean known. Omission is better than speculation.

---

## 1. Clear request with little context

Input:

> Quero adicionar recuperação de senha.

Desired:

```markdown
# Adicionar recuperação de senha

## Context

A solicitação é disponibilizar uma forma de recuperação de acesso para usuários
que não conseguem utilizar sua senha atual.

## Objective

Permitir que o usuário recupere o acesso à conta por meio de um fluxo de
recuperação ou redefinição de senha.
```

Why:

- the task itself is understandable;
- there is enough information to create an Issue;
- no current-state claim is necessary;
- no product decision needs to be made during Issue creation;
- no Product considerations are required merely because product details remain
  unspecified.

Do not claim that the project currently lacks password recovery unless that
fact was verified.

Do not ask the user to define the recovery channel, verification mechanism,
expiration policy, session behavior, or other PRD-level decisions.

---

## 2. Ambiguous task

Input:

> Corrigir pedido.

Desired response:

> O que precisa ser corrigido no pedido?

Why:

The object of the task is known (`pedido`), but the requested change is not.

There is not enough information to identify what should be fixed.

Do not create a speculative Issue.

Do not respond with a large menu such as:

> É cálculo, status, criação, edição, pagamento, tela ou outra coisa?

Ask only the minimum clarification necessary.

---

## 3. User already decided product behavior

Input:

> Quero recuperação de senha por e-mail. O usuário deve receber um link e ele
> precisa expirar em 30 minutos.

Desired:

```markdown
# Adicionar recuperação de senha por e-mail

## Context

A solicitação é disponibilizar recuperação de acesso por e-mail.

## Objective

Permitir que o usuário redefina a senha por meio de um link recebido por e-mail.

## Known constraints

- A recuperação deve usar e-mail.
- A verificação deve ocorrer por link.
- O link deve expirar em 30 minutos.
```

Why:

The user explicitly supplied three decisions:

1. e-mail;
2. link;
3. expiration of 30 minutes.

Preserve them.

Do not ask again about channel, verification format, or expiration.

Do not add speculative Product considerations such as:

- session invalidation;
- notification after password change;
- rate limiting;
- fallback mechanisms;
- behavior when the user loses access to the e-mail.

Those concerns may be reasonable, but they were not established by the request.

---

## 4. Technical maintenance request

Input:

> Precisamos trocar Redis por Valkey porque nosso provedor vai descontinuar o
> Redis atual.

Desired:

```markdown
# Migrar de Redis para Valkey

## Context

O provedor atual vai descontinuar o Redis utilizado, motivando sua substituição
por Valkey.

## Objective

Substituir o Redis pelo Valkey em razão da descontinuação informada pelo
provedor.
```

Why:

The request provides evidence for:

- Redis being part of the requested change;
- Valkey being the chosen replacement;
- provider deprecation being the motivation.

Do not add:

- preservation of current behavior;
- preservation of existing Redis data;
- zero downtime;
- compatibility requirements;
- migration deadline;
- rollout requirements.

Do not create Product considerations about those topics merely because they
could matter.

Do not design:

- migration sequencing;
- topology;
- client libraries;
- deployment strategy;
- rollback;
- file changes.

Those belong to later technical specification.

---

## 5. Bug with a known symptom

Input:

> Quando o usuário aplica um cupom inválido no checkout, a tela fica carregando
> indefinidamente.

Desired:

```markdown
# Corrigir carregamento indefinido ao aplicar cupom inválido

## Context

Foi relatado que, ao aplicar um cupom inválido no checkout, a tela permanece
carregando indefinidamente.

## Objective

Corrigir o comportamento de carregamento indefinido ao aplicar um cupom
inválido no checkout.
```

Why:

The symptom was explicitly supplied by the user and may be recorded as evidence.

Do not invent:

- the root cause;
- which service is failing;
- whether the API returns an error;
- whether the frontend fails to handle a response;
- what message should be displayed;
- what HTTP status should be returned.

The Issue records the known problem.

Diagnosis and implementation belong to later stages.

---

## 6. Explicit constraint in a bug report

Input:

> O checkout trava quando o cupom é inválido. A correção não pode alterar o
> comportamento de cupons válidos.

Desired:

```markdown
# Corrigir travamento ao aplicar cupom inválido

## Context

Foi relatado que o checkout trava quando um cupom inválido é aplicado.

## Objective

Corrigir o travamento relacionado à aplicação de cupons inválidos.

## Known constraints

- O comportamento de cupons válidos não deve ser alterado pela correção.
```

Why:

Unlike an inferred preservation requirement, this constraint was explicitly
provided by the user.

Preserve it.

---

## 7. Investigation request

Input:

> Investigar por que alguns pedidos estão sendo criados em duplicidade.

Desired:

```markdown
# Investigar criação duplicada de pedidos

## Context

Foi relatada a ocorrência de pedidos sendo criados em duplicidade.

## Objective

Investigar a causa da criação duplicada de pedidos.
```

Why:

The requested work is an investigation.

Do not turn the investigation into a bug-fix commitment before the cause is
known.

Do not invent a suspected cause.

Do not propose idempotency keys, database constraints, queues, retries, or
other technical solutions unless supplied by evidence.

---

## 8. Product consideration supported by the request

Input:

> Quero permitir cancelamento de pedido, mas ainda não definimos em quais
> estados o cancelamento deve estar disponível.

Desired:

```markdown
# Permitir cancelamento de pedido

## Context

A solicitação é permitir o cancelamento de pedidos.

## Objective

Permitir que pedidos possam ser cancelados conforme as regras de elegibilidade
que serão definidas.

## Product considerations

- Os estados do pedido em que o cancelamento estará disponível ainda precisam
  ser definidos.
```

Why:

The unresolved product decision was explicitly identified by the user.

This is an appropriate Product consideration.

Do not expand it into additional speculative questions about:

- refunds;
- notifications;
- permissions;
- cancellation reasons;
- audit logs;

unless those concerns are supplied or verified.

---

## 9. Unsupported current-state context — bad

Input:

> Quero adicionar recuperação de senha.

Bad:

```markdown
## Context

Atualmente o projeto não possui recuperação de senha e os usuários precisam
entrar em contato com o suporte.
```

Why:

Neither current-state claim was supplied or verified.

The request proves the intention to work on password recovery.

It does not prove the absence of an existing or partial implementation.

---

## 10. Plausible requirement — bad

Input:

> Precisamos trocar Redis por Valkey porque nosso provedor vai descontinuar o
> Redis atual.

Bad:

```markdown
## Objective

Migrar de Redis para Valkey mantendo todo o comportamento atual e sem perda de
dados.
```

Why:

Both preservation requirements are plausible, but neither was provided.

Plausibility is not evidence.

---

## 11. Speculative Product considerations — bad

Input:

> Quero adicionar recuperação de senha.

Bad:

```markdown
## Product considerations

- Definir se a recuperação será por e-mail ou SMS.
- Definir se será utilizado link ou código.
- Definir duração da recuperação.
- Definir comportamento das sessões existentes.
- Definir limites de tentativas.
- Definir notificações de segurança.
```

Why:

This is PRD discovery disguised as Issue creation.

The request did not establish these concerns as part of the Issue intake.

Do not brainstorm missing product requirements.

Omit the section when no unresolved product consideration is evidenced.

---

## 12. Product questionnaire — bad

Bad response:

> Será por e-mail ou SMS?
>
> Link ou código?
>
> Quanto tempo expira?
>
> Deve encerrar sessões?
>
> Deve notificar o usuário?
>
> Web ou mobile?

Why:

The development intention is already understandable.

These questions belong to later product specification if that workflow stage is
needed.

The Issue should be created without interrogating the user about them.

---

## 13. Technical design — bad

Input:

> Quero adicionar recuperação de senha.

Bad:

```markdown
## Technical solution

- Criar tabela password_reset_tokens.
- Adicionar endpoint POST /auth/forgot-password.
- Gerar token JWT com duração de 30 minutos.
- Criar método resetPassword no AuthService.
```

Why:

These are implementation decisions.

They belong to Tech Spec, not Issue creation.

The Issue Author must not design the solution.