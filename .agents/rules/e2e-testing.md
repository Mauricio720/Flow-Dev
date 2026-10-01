# End-to-End Testing Rules

## Purpose

This rule defines how end-to-end tests must be designed, implemented,
organized, and maintained in this project.

End-to-end tests must validate real user behavior through the application UI.

The default E2E framework for this project is Playwright.

---

## Core Principles

### 1. Test user behavior

Tests must describe behavior from the user's perspective.

Prefer:

- opening pages
- clicking buttons
- filling forms
- submitting forms
- navigating between pages
- validating visible feedback
- validating redirects
- validating authenticated and unauthenticated states

Avoid testing internal implementation details.

Do not assert:

- React component internals
- internal state
- private functions
- CSS class names
- implementation-specific DOM structure

---

## 2. Tests must be independent

Every E2E test must be executable independently.

A test must never depend on:

- another test running first
- data created by another test
- execution order
- browser state left by another test

Tests must create or prepare the state they need.

When test data is created, clean it up whenever appropriate.

---

## 3. Never use production

E2E tests must never intentionally execute against:

- the production database
- production data services
- production authentication accounts
- production APIs when they can modify data

Use dedicated test or development environments.

Environment variables used by E2E tests must be separated from production.

Examples:

E2E_TEST_USER_EMAIL
E2E_TEST_USER_PASSWORD

Never hardcode credentials inside test files.

---

## 4. Prefer accessible locators

Prefer Playwright locators in this order when appropriate:

1. getByRole()
2. getByLabel()
3. getByPlaceholder()
4. getByText()
5. getByTestId()

Example:

```ts
await page.getByLabel('Email').fill(email);

await page.getByLabel('Senha').fill(password);

await page
  .getByRole('button', { name: /entrar/i })
  .click();
```
