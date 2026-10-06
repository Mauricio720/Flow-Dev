# UI/UX Change Map: CompozyOS Software and Flow

Companion to [this feature's TechSpec](_techspec.md). The unified `_spec.md` shown in the UI journey is the future application output. Follow the existing Flow Dev pt-BR copy, global navigation, task review controls, keyboard behavior, and responsive patterns.

## Global navigation and Software

- Add **Software** alongside existing global administration destinations, visible only to administrators. Route `/admin/software/compozy` checks session and admin access on the server; direct links receive the same guard.
- The first-run page separates **Configuração do aplicativo**, **Conexões**, **Runtime CompozyOS**, and **Pré-requisitos do host**. Each shows ready/blocked/unknown, checked time, and a specific next action. A successful form save never paints all checks green.
- Connection rows show label, provider, safe account identity, auth state, model-discovery state, readiness, and last check. Add Codex/Claude, reconnect, rename, and disconnect actions. An active-run count is shown before disconnect.
- Codex device login shows the verification URL/code and expiry in a bounded dialog; polling ends in connected, failed, or expired. Claude shows a guided supported login state or an honest host-assistance requirement. No token input or raw terminal transcript appears.
- Audit uses paged rows with actor, time, action, and safe summary. Admin role loss immediately closes controls and subsequent reads fail.

## Task flow and runtime choice

- On an eligible task, show **Fluxo CompozyOS** before Start. The default draft contains `Criar spec`; the author can add `Criar tarefas` after spec approval and compatible Loops from the live catalog. Each row states skill/Loop source, description, inputs, prerequisites, version, and stop conditions.
- Runtime controls belong to each runnable row: a skill shows one connection/model/reasoning choice; a Loop shows one choice per runtime role declared by its live definition. Each row also chooses isolated checkout, existing worktree, or new managed worktree. Hidden or disabled options show a reason. No option is guessed from a static model seed.
- **Salvar fluxo** only saves the plan. **Iniciar** is separate and names the exact action. When a live Loop version or catalog result changes, the action asks for fresh confirmation instead of silently updating.
- A pending worktree shows creation progress and cannot start until ready. A foreign, missing, or busy worktree displays the precise safe reason and recovery action.

## Review and history

- Unified Spec review presents `_spec.md` Product and Technical parts as one package, with companion tabs for stories, DX, UI/UX when applicable, and tests. Approval targets one exact package version. Previously approved legacy PRD/Tech Spec packages retain their original labels and are read-only in the legacy history view.
- Runs show provider, model, reasoning, connection label/ID, worktree, CompozyOS version, skill or Loop name/version, status, timestamp, and terminal reason. Credential paths and values never appear.
- Failed, canceled, exhausted, stalled, and unknown outcomes have distinct text and icon treatment. No next-action button becomes runnable until the prerequisite truly succeeds and is approved.

## Interaction and accessibility

All controls have visible labels, keyboard focus, and status text independent of color. Dialog focus returns to the initiating control. Async checks expose pending and stale states; no blinking or auto-start. Narrow layouts stack status groups and keep action buttons adjacent to their row. Long connection/Loop lists are searched or paged without silently truncating options.
