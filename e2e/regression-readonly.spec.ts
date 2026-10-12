import { test, expect } from '@playwright/test';

// Read-only checks. No real purchases, posts, point grants, account deletions or Push subscriptions.
const pages = [
  { path: '/help', text: /遊び方|ヘルプ|よくある質問/ },
  { path: '/terms', text: /利用規約/ },
  { path: '/privacy', text: /プライバシー/ },
  { path: '/contact', text: /お問い合わせ|問い合わせ/ },
  { path: '/mypage/notifications', text: /通知設定/ },
  { path: '/mypage/account/delete', text: /退会|アカウント削除|ログイン/ },
  { path: '/mypage/blocks', text: /ブロック|ミュート|ログイン/ },
];

for (const { path, text } of pages) {
  test(`${path}: page renders without server error`, async ({ page }) => {
    const response = await page.goto(path, { waitUntil: 'domcontentloaded' });
    expect(response?.status(), `HTTP status at ${path}`).toBeLessThan(500);
    await expect(page.locator('body')).toContainText(text);
    await expect(page.locator('body')).not.toContainText('Application error');
  });
}

test('notification settings are reachable without triggering subscription', async ({ page }) => {
  await page.goto('/mypage/notifications');
  await expect(page.getByRole('heading', { name: /通知設定/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /マイページへ戻る/ })).toHaveAttribute('href', '/mypage');
});

test('mobile pages have no horizontal document overflow', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'mobile-only check');
  for (const path of ['/help', '/terms', '/privacy', '/contact', '/mypage/notifications']) {
    await page.goto(path, { waitUntil: 'domcontentloaded' });
    const width = await page.evaluate(() => ({
      content: document.documentElement.scrollWidth,
      viewport: document.documentElement.clientWidth,
    }));
    expect(width.content, `${path}: ${JSON.stringify(width)}`).toBeLessThanOrEqual(width.viewport + 2);
  }
});

test('public pages expose a document title and a main content region', async ({ page }) => {
  for (const path of ['/help', '/terms', '/privacy', '/contact']) {
    await page.goto(path, { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveTitle(/\S/);
    await expect(page.locator('main').first()).toBeVisible();
  }
});
