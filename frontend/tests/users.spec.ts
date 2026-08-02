import { expect, test } from "@playwright/test";

test("a basic user does not see the admin panel button", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("login-username").fill("user");
  await page.getByTestId("login-password").fill("password");
  await page.getByTestId("login-submit").click();
  await expect(page.locator('[data-testid^="column-"]').first()).toBeVisible();

  await expect(page.getByTestId("open-admin-panel")).not.toBeVisible();
});

test("a user can change their own password and log in with the new one", async ({ page }) => {
  const username = `pwuser-${Date.now()}`;

  await page.goto("/");
  await page.getByTestId("toggle-auth-mode").click();
  await page.getByTestId("login-username").fill(username);
  await page.getByTestId("login-password").fill("oldpass123");
  await page.getByTestId("login-submit").click();
  await expect(page.locator('[data-testid^="column-"]').first()).toBeVisible();

  await page.getByTestId("open-change-password").click();
  await page.getByTestId("current-password-input").fill("oldpass123");
  await page.getByTestId("new-password-input").fill("newpass456");
  await page.getByTestId("change-password-submit").click();
  await expect(page.getByTestId("change-password-success")).toBeVisible();

  await page.reload();
  await page.getByTestId("logout-button").click();

  await page.getByTestId("login-username").fill(username);
  await page.getByTestId("login-password").fill("newpass456");
  await page.getByTestId("login-submit").click();
  await expect(page.locator('[data-testid^="column-"]').first()).toBeVisible();
});

test("an admin manages users end to end", async ({ page }) => {
  const username = `managed-${Date.now()}`;

  await page.goto("/");
  await page.getByTestId("login-username").fill("admin");
  await page.getByTestId("login-password").fill("admin");
  await page.getByTestId("login-submit").click();
  await expect(page.locator('[data-testid^="column-"]').first()).toBeVisible();

  await page.getByTestId("open-admin-panel").click();
  await expect(page.getByTestId("close-admin-panel")).toBeVisible();

  await page.getByTestId("admin-new-username").fill(username);
  await page.getByTestId("admin-new-password").fill("secret123");
  await page.getByTestId("admin-create-submit").click();
  await expect(page.getByTestId(`admin-user-row-${username}`)).toBeVisible();

  await page
    .getByTestId(`admin-role-select-${username}`)
    .selectOption("admin");
  await expect(page.getByTestId(`admin-role-select-${username}`)).toHaveValue("admin");

  await page.getByTestId(`admin-reset-password-${username}`).click();
  await page.getByTestId("admin-reset-password-input").fill("resetpass789");
  await page.getByTestId("admin-reset-password-submit").click();
  await expect(page.getByTestId("admin-reset-password-input")).not.toBeVisible();

  await page.getByTestId(`admin-delete-${username}`).click();
  await expect(page.getByTestId(`admin-user-row-${username}`)).not.toBeVisible();

  await page.getByTestId("close-admin-panel").click();
  await expect(page.locator('[data-testid^="column-"]').first()).toBeVisible();
});
