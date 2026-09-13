import { expect, test } from "@playwright/test";

import { mockLangGraphAPI } from "./utils/mock-api";

test.describe("Root route", () => {
  test("redirects directly to the new-chat composer", async ({ page }) => {
    mockLangGraphAPI(page);

    await page.goto("/");

    // The marketing landing page is bypassed: `/` routes through
    // `/workspace` to a fresh `/workspace/chats/new` composer.
    await page.waitForURL("**/workspace/chats/new");
    await expect(page).toHaveURL(/\/workspace\/chats\/new/);
    await expect(
      page.getByPlaceholder(/how can i assist you/i),
    ).toBeVisible();
  });
});
