import { test, expect } from '@playwright/test';

// Read-only coverage: never clicks destructive actions, posts, subscribes or buys.
const publicRoutes = ['/', '/login', '/signup', '/forgot-password', '/help', '/terms', '/privacy', '/contact'];
const memberRoutes = [
  '/mypage', '/mypage/notifications', '/mypage/badges', '/mypage/blocks',
  '/mypage/following', '/mypage/followers', '/mypage/account/delete',
  '/timeline', '/search', '/items', '/album', '/quests',
  '/quests/in-progress', '/quests/completed', '/quests/working',
  '/notifications', '/cheers', '/data', '/ads/stats',
];
const adminRoutes = [
  '/admin', '/admin/users', '/admin/reports', '/admin/points',
  '/admin/items', '/admin/payments', '/admin/subscriptions',
  '/admin/quests', '/admin/contacts', '/admin/announcements', '/admin/ads',
];

for (const route of publicRoutes) {
  test(`public route ${route} does not crash`, async ({ page }) => {
    const response = await page.goto(route, { waitUntil: 'domcontentloaded' });
    expect(response, `no response for ${route}`).not.toBeNull();
    expect(response!.status(), `status for ${route}`).toBeLessThan(500);
    await expect(page.locator('body')).not.toContainText('Application error');
  });
}

for (const route of [...memberRoutes, ...adminRoutes]) {
  test(`unauthenticated access to ${route} does not crash`, async ({ page }) => {
    const response = await page.goto(route, { waitUntil: 'domcontentloaded' });
    expect(response, `no response for ${route}`).not.toBeNull();
    expect(response!.status(), `status for ${route}`).toBeLessThan(500);
    await expect(page.locator('body')).not.toContainText('Application error');
    // This test checks crash-free rendering only, NOT authorization correctness.
  });
}

test('unknown route uses 404 handling', async ({ page }) => {
  const response = await page.goto('/e2e-unknown-page-8c0e1b', { waitUntil: 'domcontentloaded' });
  expect(response?.status()).toBe(404);
});

test('public pages have non-empty accessible title', async ({ page }) => {
  for (const route of publicRoutes) {
    await page.goto(route, { waitUntil: 'domcontentloaded' });
    expect((await page.title()).trim(), `title for ${route}`).not.toBe('');
  }
});
