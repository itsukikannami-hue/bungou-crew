import { test, expect } from "@playwright/test";

const publicPages = [
  ["/login", /ログイン/],
  ["/signup", /新規登録/],
  ["/help", /遊び方|ヘルプ|よくある質問/],
  ["/terms", /利用規約/],
  ["/privacy", /プライバシー/],
  ["/contact", /お問い合わせ|問い合わせ/],
  ["/forgot-password", /パスワード/],
] as const;

for (const [path, heading] of publicPages) {
  test(`${path} displays its expected content`, async ({ page }) => {
    const response = await page.goto(path, { waitUntil: "domcontentloaded" });
    expect(response?.status(), `${path} returned HTTP error`).toBeLessThan(400);
    await expect(page.locator("body")).toContainText(heading);
    await expect(page.locator("body")).not.toContainText("Application error");
  });
}

test("unknown route shows a not-found state", async ({ page }) => {
  const response = await page.goto("/this-page-does-not-exist-e2e", { waitUntil: "domcontentloaded" });
  expect(response?.status()).toBe(404);
  await expect(page.locator("body")).toContainText(/404|見つかりません|Not Found/i);
});

test("mobile public pages do not overflow horizontally", async ({ page, isMobile }) => {
  test.skip(!isMobile, "mobile-only layout assertion");
  for (const path of ["/login", "/signup", "/help", "/terms", "/privacy", "/contact"]) {
    await page.goto(path, { waitUntil: "domcontentloaded" });
    const dimensions = await page.evaluate(() => ({
      content: document.documentElement.scrollWidth,
      viewport: document.documentElement.clientWidth,
    }));
    expect(dimensions.content, `horizontal overflow on ${path}`).toBeLessThanOrEqual(dimensions.viewport + 2);
  }
});
