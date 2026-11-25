import { expect, test } from "@playwright/test";

test("mobile: filters open in a bottom sheet and floors are chips", async ({ page }) => {
  await page.goto("/en/units");
  await page.getByRole("button", { name: /Filters/ }).click();
  const sheet = page.getByRole("dialog", { name: "Filters" });
  await expect(sheet).toBeVisible();
  await sheet.getByRole("button", { name: "Penthouse" }).click();
  await expect(page).toHaveURL(/type=penthouse/);
  await sheet.getByRole("button", { name: /Show \d+ homes/ }).click();
  await page.getByRole("button", { name: "Penthouse level" }).click();
  await expect(page.getByRole("heading", { name: "Penthouse level" })).toBeVisible();
});
