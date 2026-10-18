import { expect, test } from '@playwright/test';

test('workflow routes expose truthful unavailable states in preview mode', async ({ page }) => {
  for (const path of ['/transactions/task6-smoke', '/orders/task6-smoke', '/orders/task6-smoke/refund']) {
    await page.goto(path);
    await expect(page.locator('main')).toBeVisible();
    await expect(page.getByText(/belum aktif|belum dapat|tidak tersedia/i).first()).toBeVisible();
    await expect(page.locator('.stage-rail')).toHaveCount(0);
  }
});
