import { test, expect } from "@playwright/test";

const email = process.env.E2E_TEST_EMAIL;
const password = process.env.E2E_TEST_PASSWORD;

test("test user can sign in and reach My Page", async ({ page }) => {
  test.skip(!email || !password, "E2E_TEST_EMAIL and E2E_TEST_PASSWORD are required");
  await page.goto("/login");
  await page.getByPlaceholder("メールアドレス").fill(email!);
  await page.getByPlaceholder("パスワード").fill(password!);
  await page.getByRole("button", { name: /ログイン/ }).click();
  await expect(page).toHaveURL(/\/$/, { timeout: 20_000 });
  await page.goto("/mypage");
  await expect(page.locator("body")).not.toContainText("Application error");
  await expect(page.locator("body")).toContainText(/マイページ|プロフィール|通知設定/);
});

test("login form accepts credentials without exposing password", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByPlaceholder("パスワード")).toHaveAttribute("type", "password");
});
