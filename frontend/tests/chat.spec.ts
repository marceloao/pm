import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("login-username").fill("user");
  await page.getByTestId("login-password").fill("password");
  await page.getByTestId("login-submit").click();
  await expect(page.locator('[data-testid^="column-"]').first()).toBeVisible();
});

test("chatting with the AI updates the board without a manual reload", async ({ page }) => {
  const boardBefore = await (await page.request.get("/api/board")).json();
  const boardAfter = structuredClone(boardBefore);
  boardAfter.columns[0].cards.push({
    id: "ai-card-1",
    title: "Card from the AI",
    details: "Added by the assistant.",
    position: boardAfter.columns[0].cards.length,
  });

  await page.route("**/api/ai/chat", async (route) => {
    await route.fulfill({
      json: { reply: "I created the card for you.", board: boardAfter },
    });
  });

  await page.getByTestId("chat-input").fill("Create a card named 'Card from the AI'");
  await page.getByTestId("chat-send").click();

  await expect(page.getByText("I created the card for you.")).toBeVisible();
  await expect(page.getByTestId("card-ai-card-1")).toBeVisible();
});

test("a text-only AI reply leaves the board untouched", async ({ page }) => {
  const board = await (await page.request.get("/api/board")).json();
  const columnCount = board.columns.length;

  await page.route("**/api/ai/chat", async (route) => {
    await route.fulfill({
      json: { reply: "Sure, here is a summary of your board.", board },
    });
  });

  await page.getByTestId("chat-input").fill("Summarize my board");
  await page.getByTestId("chat-send").click();

  await expect(page.getByText("Sure, here is a summary of your board.")).toBeVisible();
  await expect(page.locator('[data-testid^="column-"]')).toHaveCount(columnCount);
});
