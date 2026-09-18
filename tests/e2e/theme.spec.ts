import { expect, test } from '@playwright/test';

test('standard search and support surfaces preserve dark-theme contrast', async ({ page }) => {
  await page.goto('/search');
  const listing = page.locator('.listing-row').filter({ has: page.getByRole('link', { name: 'Kursi kayu bekas' }) });
  const category = page.getByRole('button', { name: 'Makanan' });

  await expect(page.getByRole('searchbox')).toHaveCSS('background-color', 'rgb(26, 29, 35)');
  await expect(page.getByRole('searchbox')).toHaveCSS('color', 'rgb(255, 255, 255)');
  await expect(category).toHaveCSS('background-color', 'rgb(26, 29, 35)');
  await expect(listing).toHaveCSS('background-color', 'rgb(26, 29, 35)');
  await expect(listing.getByRole('link', { name: 'Kursi kayu bekas' })).toHaveCSS('color', 'rgb(255, 255, 255)');

  await category.click();
  await expect(category).toHaveCSS('background-color', 'rgb(214, 255, 75)');
  await expect(category).toHaveCSS('color', 'rgb(17, 19, 24)');

  await page.getByRole('button', { name: 'Buka bantuan pelanggan' }).click();
  const assistantMessage = page.getByText(/Halo! Saya bantuan Barter/);
  await expect(assistantMessage).toHaveCSS('background-color', 'rgb(36, 39, 46)');
  await expect(assistantMessage).toHaveCSS('color', 'rgb(255, 255, 255)');

  await page.getByRole('textbox', { name: 'Pesan ke bantuan pelanggan' }).fill('Saya perlu bantuan');
  await page.getByRole('button', { name: 'Kirim pertanyaan' }).click();
  const userMessage = page.getByText('Saya perlu bantuan');
  await expect(userMessage).toHaveCSS('background-color', 'rgb(214, 255, 75)');
  await expect(userMessage).toHaveCSS('color', 'rgb(17, 19, 24)');
});
