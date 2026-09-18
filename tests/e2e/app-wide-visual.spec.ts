import { expect, test } from '@playwright/test';

const publicRoutes = ['/', '/search', '/stores', '/auth/login', '/auth/register', '/unavailable'];

for (const route of publicRoutes) {
  test(`${route} uses the Barter field without horizontal overflow`, async ({ page }) => {
    await page.goto(route);
    await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(17, 19, 24)');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await expect(page.getByRole('link', { name: 'Barter beranda' })).toBeVisible();
  });
}

test('mobile discovery keeps the primary action above the safe area', async ({ page }) => {
  await page.goto('/');
  const add = page.getByRole('link', { name: 'Pasang' });
  await expect(add).toBeVisible();
  const box = await add.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.y + box!.height).toBeLessThanOrEqual(await page.evaluate(() => window.innerHeight));
});

test('listing detail keeps its action dock visible', async ({ page }) => {
  await page.goto('/listings/10000000-0000-4000-8000-000000000001');
  await expect(page.getByRole('group', { name: 'Aksi penawaran' })).toBeInViewport();
  await expect(page.getByText('Lokasi tepat')).toBeVisible();
});
