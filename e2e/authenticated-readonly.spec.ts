import { test, expect } from '@playwright/test';

const email = process.env.E2E_TEST_EMAIL;
const password = process.env.E2E_TEST_PASSWORD;

test('signed-in user can reach My Page and notification settings', async ({ page }) => {
  test.skip(!email || !password, 'Set E2E_TEST_EMAIL and E2E_TEST_PASSWORD for isolated test user');
  await page.goto('/login');
  await page.getByPlaceholder('メールアドレス').fill(email!);
  await page.getByPlaceholder('パスワード').fill(password!);
  await page.getByRole('button', { name: /ログイン/ }).click();
  await expect(page).toHaveURL(/\/$/, { timeout: 20_000 });
  await page.goto('/mypage');
  await expect(page.locator('body')).not.toContainText('Application error');
  await page.goto('/mypage/notifications');
  await expect(page.getByRole('heading', { name: /通知設定/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: /ブラウザのPush通知/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: '通知の種類', exact: true })).toBeVisible();
});
