import { expect, test } from '@playwright/test';

test('preview auth is explicit, nonfunctional, and responsive', async ({ page }) => {
  await page.goto('/auth/login');
  await expect(page.getByRole('heading', { name: 'Masuk ke Barter' })).toBeVisible();
  await expect(page.getByText(/Login dinonaktifkan pada mode data contoh/)).toBeVisible();
  await expect(page.getByLabel('Email')).toHaveCount(0);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  await page.getByRole('link', { name: 'Kembali ke beranda' }).click();
  await expect(page).toHaveURL('/');
});

test('preview onboarding never invents profile, location, or verified phone state', async ({ page }) => {
  await page.goto('/onboarding');
  await expect(page.getByRole('heading', { name: 'Onboarding tidak aktif di mode contoh' })).toBeVisible();
  await expect(page.getByText(/menyimpan profil dan lokasi privat/)).toBeVisible();
  await expect(page.getByText(/Akun siap digunakan/)).toHaveCount(0);
});
