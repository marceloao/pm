import { expect, test, type Page } from "@playwright/test";

async function login(page: Page) {
  await page.goto("/");
  await page.getByTestId("login-username").fill("user");
  await page.getByTestId("login-password").fill("password");
  await page.getByTestId("login-submit").click();
  await expect(page.locator('[data-testid^="column-"]').first()).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await login(page);
});

test("creates a second board with its own empty columns and switches to it", async ({
  page,
}) => {
  const boardName = `Marketing ${Date.now()}`;

  await page.getByTestId("new-board-button").click();
  await page.getByTestId("new-board-input").fill(boardName);
  await page.getByTestId("new-board-submit").click();

  await expect(page.getByTestId("board-select")).toHaveValue(/.+/);
  await expect(page.locator('[data-testid^="column-"]')).toHaveCount(5);
  await expect(page.locator('[data-testid^="card-"]')).toHaveCount(0);
  await expect(
    page.getByTestId("board-select").locator("option", { hasText: boardName })
  ).toHaveCount(1);
});

test("cards created on one board do not appear on another", async ({ page }) => {
  const boardName = `Design ${Date.now()}`;

  await page.getByTestId("new-board-button").click();
  await page.getByTestId("new-board-input").fill(boardName);
  await page.getByTestId("new-board-submit").click();
  await expect(page.locator('[data-testid^="column-"]').first()).toBeVisible();

  const firstColumn = page.locator('[data-testid^="column-"]').first();
  await firstColumn.getByRole("button", { name: /agregar una tarjeta/i }).click();
  await firstColumn.getByPlaceholder("Título de la tarjeta").fill("Only on second board");
  await firstColumn.getByRole("button", { name: /agregar tarjeta/i }).click();
  await expect(firstColumn.getByText("Only on second board")).toBeVisible();

  await page.getByTestId("board-select").selectOption({ label: "Mi tablero" });
  await expect(page.locator('[data-testid^="column-"]').first()).toBeVisible();
  await expect(page.getByText("Only on second board")).not.toBeVisible();
});

test("renames the active board", async ({ page }) => {
  const originalName = `Before rename ${Date.now()}`;
  const newName = `After rename ${Date.now()}`;

  await page.getByTestId("new-board-button").click();
  await page.getByTestId("new-board-input").fill(originalName);
  await page.getByTestId("new-board-submit").click();
  await expect(page.locator('[data-testid^="column-"]').first()).toBeVisible();

  const nameInput = page.getByTestId("board-name-input");
  await nameInput.fill(newName);
  await nameInput.blur();

  await expect(
    page.getByTestId("board-select").locator("option", { hasText: newName })
  ).toHaveCount(1);
  await expect(
    page.getByTestId("board-select").locator("option", { hasText: originalName })
  ).toHaveCount(0);
});

test("deletes a board and falls back to a remaining one", async ({ page }) => {
  const boardName = `Temporary ${Date.now()}`;

  await page.getByTestId("new-board-button").click();
  await page.getByTestId("new-board-input").fill(boardName);
  await page.getByTestId("new-board-submit").click();
  await expect(page.locator('[data-testid^="column-"]').first()).toBeVisible();

  await page.getByTestId("delete-board-button").click();

  await expect(
    page.getByTestId("board-select").locator("option", { hasText: boardName })
  ).toHaveCount(0);
});
