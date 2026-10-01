import { test, expect } from "@playwright/test";

test("a visitor is sent to the Portuguese login screen", async ({ page }) => {
  await page.goto("/projects");
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole("button", { name: "Continuar com GitHub" })).toBeVisible();
});

test("the login screen offers a retryable GitHub entry point", async ({ page }) => {
  await page.goto("/login?erro=sessao_expirada");
  await expect(page.getByRole("alert")).toContainText("sessão expirou");
  await expect(page.getByRole("button", { name: "Continuar com GitHub" })).toBeEnabled();
});
