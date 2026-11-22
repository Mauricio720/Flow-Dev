# Issue / PRD / Tech Spec boundaries

Use this reference when deciding whether information belongs in Issue creation,
PRD, or Tech Spec.

The central rule is:

> Issue identifies the development intention.  
> PRD defines product behavior.  
> Tech Spec defines implementation.

Missing information does not automatically need to be resolved during Issue
creation.

---

## Issue

The Issue answers:

> **What development intention are we registering?**

It may contain:

- requested change;
- known motivation;
- desired high-level outcome;
- explicit decisions or constraints already provided;
- verified project context;
- a small number of evidence-grounded product considerations useful to triage.

It does not need to make the feature product-complete or implementation-ready.

A valid Issue can be short.

Do not add information merely to make the Issue appear complete.

---

## Clarification

Clarification exists only to make the development intention identifiable.

Ask now:

> “Corrigir pedido.”

Clarify what needs to be corrected.

> “Adicionar recuperação.”

Clarify recovery of what.

Do not ask now merely because the following remain undefined:

- recovery channel;
- expiration policy;
- session behavior;
- notifications;
- detailed permissions;
- UX behavior;
- endpoint design;
- database design;
- implementation strategy.

A useful test is:

> If this information remained unknown, could I still state what change the user
> wants?

If **no**, clarification may be necessary.

If **yes**, do not block Issue creation merely to obtain it.

Ask only the minimum clarification necessary.

---

## Missing information is not automatically an open question

There are many things that could be known about a development task.

The Issue Author's job is not to discover all of them.

Before surfacing missing information, determine what kind it is:

### Task-defining information

Without it, the development intention itself cannot be identified.

This may justify clarification.

### Product behavior

It determines how the product should behave.

This normally belongs to PRD.

### Technical implementation

It determines how the solution will be implemented.

This belongs to Tech Spec.

### Merely plausible concern

It is something that could matter but is not established by the request or
verified project context.

Do not introduce it.

---

## PRD

PRD answers:

> **How should the product behave?**

Typical PRD decisions include:

- user flows and states;
- permissions and business rules;
- channel or interaction choices;
- validation behavior;
- error behavior visible to users;
- notifications;
- platform scope;
- security behavior from a product perspective;
- edge cases that change expected behavior.

The Issue may signal a broad unresolved product area when that area is
evidenced and useful to triage.

The Issue must not perform the discovery itself.

### Example

User:

> Quero permitir cancelamento de pedido, mas ainda não definimos em quais
> estados o cancelamento estará disponível.

Valid Issue consideration:

> Os estados do pedido em que o cancelamento estará disponível ainda precisam
> ser definidos.

The unresolved decision was explicitly established by the user.

Do not expand this into unrelated questions about refunds, notifications,
permissions, cancellation reasons, or audit history unless those concerns are
also evidenced.

---

## Tech Spec

Tech Spec answers:

> **How will we implement the desired behavior?**

Typical Tech Spec decisions include:

- architecture;
- APIs and contracts;
- database changes;
- libraries and frameworks;
- functions, classes, and modules;
- token or storage mechanisms;
- migrations;
- file changes;
- deployment and rollout;
- implementation plan;
- technical test strategy.

The Issue may contain a technical change as its requested outcome.

That does not mean the Issue should design the change.

### Example

User:

> Precisamos trocar Redis por Valkey porque nosso provedor vai descontinuar o
> Redis atual.

The Issue may record:

- Redis → Valkey;
- provider deprecation as the known motivation.

The Issue should not decide:

- migration sequencing;
- data migration;
- client library;
- compatibility strategy;
- deployment strategy;
- rollback strategy.

Those belong to Tech Spec.

---

## Existing decisions

A decision explicitly supplied by the user or verified in project context is
not an open question.

Preserve it.

Do not reopen it.

Example:

> Recuperação por e-mail usando um link que expira em 30 minutos.

Known:

- channel: e-mail;
- mechanism: link;
- expiration: 30 minutes.

These may be recorded as known constraints.

They must not be transformed back into Product considerations.

---

## Evidence boundary

A request describes a desired change.

It does not automatically prove the current state of the project.

For example:

> Adicionar recuperação de senha.

Supports:

- Desired: work on providing password recovery.

Does not, by itself, support:

- the current system has no recovery mechanism;
- users currently contact support;
- authentication uses only local passwords;
- no partial recovery flow exists.

Current-state claims require evidence.

---

## Scope boundary

Evidence discipline applies not only to project facts, but also to the scope of
the request.

Do not transform plausible assumptions into requirements.

Example:

> Precisamos trocar Redis por Valkey porque nosso provedor vai descontinuar o
> Redis atual.

Supports:

- Redis is involved in the requested change;
- Valkey is the chosen replacement;
- provider deprecation is the stated motivation.

Does not automatically support:

- preserve all current behavior;
- preserve all Redis data;
- zero downtime;
- backward compatibility;
- a specific deadline.

Those requirements may be sensible.

They are still unknown unless supplied or verified.

> **Plausible does not mean known.**

---

## Product consideration boundary

A Product consideration is not:

- every missing requirement;
- every question PRD might eventually answer;
- every risk the agent can imagine;
- every best practice relevant to the domain.

Use a Product consideration only when:

1. the unresolved area is supported by the request or verified context;
2. it is genuinely unresolved;
3. surfacing it helps later triage or product specification.

Otherwise, omit it.

### Evidence-grounded

User:

> Quero cancelamento de pedido, mas ainda não definimos em quais estados ele
> será permitido.

Valid:

> Os estados em que o cancelamento estará disponível ainda precisam ser
> definidos.

### Speculative

User:

> Quero adicionar recuperação de senha.

Do not automatically introduce:

- session invalidation;
- rate limiting;
- security notifications;
- fallback recovery;
- mobile behavior.

Those topics could matter.

The request did not establish that they belong in this Issue.

---

## Quick decision test

When considering adding information to the Issue, classify it:

```text
Does the Issue need this information to identify the task?
│
├── Yes → clarification may be appropriate.
│
└── No
    │
    ├── Was it explicitly provided or verified?
    │   │
    │   ├── Yes → preserve it where relevant.
    │   │
    │   └── No
    │       │
    │       └── Do not invent it.
    │
    └── Is it an evidenced unresolved product decision
        important for triage?
        │
        ├── Yes → Product consideration may be appropriate.
        └── No  → omit it.
```

When uncertain:

> **Omission is better than speculation.**