# PRD Template

Fill each section from the Issue, the planning rationale, the author's answers and the repository evidence. Where information is insufficient, say so in Open Questions instead of guessing.

## Overview
What problem this solves, for whom, and why it matters.

## Goals
Observable product outcomes, not metrics: what users can do afterwards, what the system guarantees, what becomes automatic or impossible.

## User Stories
An index into `_user_stories.md`: one line per feature area with its `US-NNN` range and theme. Do not restate stories here.

## Core Features
Each feature: what it does, why it matters, high-level behavior, functional requirements and interactions between features.

## Business Rules
Invariants, validation rules and their user-facing outcomes, permissions per persona, lifecycle and state transitions, limits and defaults with exact values.

## User Experience
Personas and goals, primary flows step by step, accessibility expectations, onboarding.

## High-Level Technical Constraints
Required integrations, compliance and privacy mandates, user-perceived performance targets. Implementation choices belong to the TechSpec.

## Non-Goals (Out of Scope)
Capabilities the author decided against, with the reason. A wanted capability never lands here to shrink the document.

## Architecture Decision Records
One line per ADR: `[ADR-NNN: Title](adrs/adr-NNN.md) — summary`.

## Open Questions
Unclear requirements, edge cases that need the author, decisions not yet made.
