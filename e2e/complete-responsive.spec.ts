import { test, expect } from '@playwright/test';
const routes = ['/', '/login', '/signup', '/help', '/terms', '/privacy', '/contact', '/forgot-password'];
const widths = [320, 375, 390, 768, 1024, 1440];
for (const width of widths) {
  test(`public routes do not overflow viewport at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    for (const route of routes) {
      const response = await page.goto(route, { waitUntil: 'domcontentloaded' });
      expect(response?.status()).toBeLessThan(500);
      const sizes = await page.evaluate(() => ({
        document: document.documentElement.scrollWidth,
        viewport: document.documentElement.clientWidth,
      }));
      expect(sizes.document, `${route} at ${width}px`).toBeLessThanOrEqual(sizes.viewport + 2);
    }
  });
}
