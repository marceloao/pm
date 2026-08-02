import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.localStorage.clear());
});

test("does not show the board without logging in", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("login-submit")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Kanban Studio" })).not.toBeVisible();
});

test("shows an error on invalid credentials and does not show the board", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("login-username").fill("user");
  await page.getByTestId("login-password").fill("wrong-password");
  await page.getByTestId("login-submit").click();

  await expect(page.getByTestId("login-error")).toBeVisible();
  await expect(page.locator('[data-testid^="column-"]')).toHaveCount(0);
});

test("logs in with valid credentials and shows the board", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("login-username").fill("user");
  await page.getByTestId("login-password").fill("password");
  await page.getByTestId("login-submit").click();

  await expect(page.locator('[data-testid^="column-"]')).toHaveCount(5);
});

test("registers a new user and shows their own empty board", async ({ page }) => {
  const username = `newuser-${Date.now()}`;

  await page.goto("/");
  await page.getByTestId("toggle-auth-mode").click();
  await page.getByTestId("login-username").fill(username);
  await page.getByTestId("login-password").fill("secret123");
  await page.getByTestId("login-submit").click();

  await expect(page.locator('[data-testid^="column-"]')).toHaveCount(5);
  await expect(page.locator('[data-testid^="card-"]')).toHaveCount(0);
});

test("logs out and requires login again after a refresh", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("login-username").fill("user");
  await page.getByTestId("login-password").fill("password");
  await page.getByTestId("login-submit").click();
  await expect(page.locator('[data-testid^="column-"]')).toHaveCount(5);

  await page.getByTestId("logout-button").click();
  await expect(page.getByTestId("login-submit")).toBeVisible();

  await page.reload();
  await expect(page.getByTestId("login-submit")).toBeVisible();
  await expect(page.locator('[data-testid^="column-"]')).toHaveCount(0);
});
