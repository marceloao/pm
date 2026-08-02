import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("login-username").fill("user");
  await page.getByTestId("login-password").fill("password");
  await page.getByTestId("login-submit").click();
  await expect(page.locator('[data-testid^="column-"]').first()).toBeVisible();
});

test("a created card survives a page reload", async ({ page }) => {
  const title = `Persisted card ${Date.now()}`;
  const firstColumn = page.locator('[data-testid^="column-"]').first();

  await firstColumn.getByRole("button", { name: /agregar una tarjeta/i }).click();
  await firstColumn.getByPlaceholder("Título de la tarjeta").fill(title);
  await firstColumn.getByRole("button", { name: /agregar tarjeta/i }).click();
  await expect(firstColumn.getByText(title)).toBeVisible();

  await page.reload();
  await expect(page.locator('[data-testid^="column-"]').first().getByText(title)).toBeVisible();
});

test("moving a card to another column survives a page reload", async ({ page }) => {
  const card = page.getByTestId("card-card-3");
  const targetColumn = page.getByTestId("column-col-done");
  const cardBox = await card.boundingBox();
  const columnBox = await targetColumn.boundingBox();
  if (!cardBox || !columnBox) {
    throw new Error("Unable to resolve drag coordinates.");
  }

  await page.mouse.move(cardBox.x + cardBox.width / 2, cardBox.y + cardBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(columnBox.x + columnBox.width / 2, columnBox.y + 120, {
    steps: 12,
  });
  await page.mouse.up();
  await expect(targetColumn.getByTestId("card-card-3")).toBeVisible();

  await page.reload();
  await expect(page.getByTestId("column-col-done").getByTestId("card-card-3")).toBeVisible();
});
