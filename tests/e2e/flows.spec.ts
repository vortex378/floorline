import { expect, test, type Page } from "@playwright/test";

const signIn = async (page: Page, role: "admin" | "agent" = "admin") => {
  await page.getByTestId(`persona-${role}`).click();
};

test.describe("buyer flows", () => {
  test.skip(({ isMobile }) => isMobile, "desktop layout");

  test("filter → open a unit → request a viewing → lead shows up in the sales office", async ({ page }) => {
    await page.goto("/en/units?type=2%2B1&avail=1");
    const unit = page.locator('[data-testid^="unit-"][data-dim="false"][role="button"]').first();
    await unit.click();
    await expect(page.getByTestId("unit-sheet")).toBeVisible();
    await page.getByRole("link", { name: "View home" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Two-bedroom apartment");

    await page.getByTestId("request-button").click();
    const form = page.getByTestId("lead-form");
    await form.getByRole("button", { name: "Send request" }).click();
    await expect(form.getByText("Please enter your name.")).toBeVisible();

    await form.getByLabel("Full name").fill("Playwright Buyer");
    await form.getByLabel("Phone").fill("+355 69 555 0101");
    await form.getByLabel("I agree to be contacted").check();
    await form.getByRole("button", { name: "Send request" }).click();
    await expect(page.getByText("Request received")).toBeVisible();

    await page.goto("/en/admin/leads");
    await signIn(page);
    await expect(page.getByTestId("stage-new").getByText("Playwright Buyer")).toBeVisible();
  });

  test("the picker updates live when the sales office reserves a unit in another tab", async ({ context }) => {
    const picker = await context.newPage();
    await picker.goto("/en/units?floor=2&avail=1");
    const target = picker.locator('[data-testid^="unit-02-"][data-dim="false"][role="button"]').first();
    const testId = (await target.getAttribute("data-testid"))!;
    const code = testId.replace("unit-", "");
    await expect(target).toHaveAttribute("aria-label", /Available/);

    const office = await context.newPage();
    await office.goto(`/en/admin/units?unit=${code}`);
    await signIn(office, "agent");
    await office.getByRole("radio", { name: "Reserved" }).click();
    await office.getByTestId("apply-status").click();
    await expect(office.getByText("Saved")).toBeVisible();

    // No reload: the change arrives over BroadcastChannel.
    await expect(picker.getByTestId(testId)).toHaveAttribute("aria-label", /Reserved/);
  });

  test("a stale edit is rejected (optimistic locking across tabs)", async ({ context }) => {
    const a = await context.newPage();
    await a.goto("/en/admin/units?unit=03-B");
    await signIn(a, "admin");
    const b = await context.newPage();
    await b.goto("/en/admin/units?unit=03-B");
    await expect(b.getByTestId("unit-drawer")).toBeVisible();

    // Tab A changes the unit first…
    await a.getByTestId("apply-status").click();
    await expect(a.getByText("Saved")).toBeVisible();
    // …so tab B is warned that its view is stale.
    await expect(b.getByRole("alert")).toContainText("Someone else updated this unit");
  });

  test("floors and units are keyboard accessible", async ({ page }) => {
    await page.goto("/en/units?floor=5");
    await page.getByTestId("floor-5").focus();
    await page.keyboard.press("ArrowUp");
    await expect(page).toHaveURL(/floor=6/);
    await page.locator('[data-testid^="unit-06-"][role="button"]').first().focus();
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("unit-sheet")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("unit-sheet")).toBeHidden();
  });

  test("switching language keeps the current page", async ({ page }) => {
    await page.goto("/en/units/05-A");
    await page.getByLabel("Language").first().selectOption("sq");
    await expect(page).toHaveURL(/\/sq\/units\/05-A/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Apartament 3+1");
  });

  test("agents cannot bulk-change prices", async ({ page }) => {
    await page.goto("/en/admin/units");
    await signIn(page, "agent");
    await expect(page.getByRole("heading", { name: "Units" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Bulk price change" })).toHaveCount(0);
  });
});
