import { test, expect } from '@playwright/test';
const email = process.env.E2E_TEST_EMAIL;
const password = process.env.E2E_TEST_PASSWORD;
const memberRoutes = [
  '/mypage', '/mypage/notifications', '/mypage/badges', '/mypage/blocks',
  '/mypage/following', '/mypage/followers', '/timeline', '/search',
  '/items', '/album', '/quests', '/notifications', '/cheers',
];

test('test member can sign in and visit core pages (read-only)', async ({ page }) => {
  test.setTimeout(120_000);
  test.skip(!email || !password, 'Set E2E_TEST_EMAIL and E2E_TEST_PASSWORD for isolated test user');
  await page.goto('/login');
  await page.getByPlaceholder('メールアドレス').fill(email!);
  await page.getByPlaceholder('パスワード').fill(password!);
  await page.getByRole('button', { name: /ログイン/ }).click();
  await expect(page).not.toHaveURL(/\/login(?:\?|$)/, { timeout: 30_000 });
  for (const route of memberRoutes) {
    const response = await page.goto(route, { waitUntil: 'domcontentloaded' });
    expect(response?.status(), route).toBeLessThan(500);
    await expect(page.locator('body')).not.toContainText('Application error');
  }
});

test('admin pages load with an isolated administrator account (read-only)', async ({ page }) => {
  const adminEmail = process.env.E2E_ADMIN_EMAIL;
  const adminPassword = process.env.E2E_ADMIN_PASSWORD;
  test.skip(!adminEmail || !adminPassword, 'Requires E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD');
  await page.goto('/login');
  await page.getByPlaceholder('メールアドレス').fill(adminEmail!);
  await page.getByPlaceholder('パスワード').fill(adminPassword!);
  await page.getByRole('button', { name: /ログイン/ }).click();
  await expect(page).not.toHaveURL(/\/login(?:\?|$)/, { timeout: 30_000 });
  for (const route of ['/admin', '/admin/users', '/admin/payments', '/admin/subscriptions', '/admin/ads', '/admin/reports', '/admin/contacts']) {
    const response = await page.goto(route, { waitUntil: 'domcontentloaded' });
    expect(response?.status(), route).toBeLessThan(500);
    await expect(page.locator('body')).not.toContainText('Application error');
  }
});
