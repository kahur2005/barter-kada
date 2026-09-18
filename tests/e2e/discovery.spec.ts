import { expect, test } from '@playwright/test';

test('search, detail, back preserve query and explicit preview identity', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByText('Data contoh — belum terhubung ke transaksi nyata')).toBeVisible();
  await page.getByRole('searchbox').fill('kursi');
  await page.getByRole('button', { name: 'Cari', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Kursi kayu bekas' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Jaket denim ukuran M' })).toHaveCount(0);
  await page.getByRole('link', { name: 'Kursi kayu bekas' }).click();
  await expect(page.getByRole('heading', { name: 'Kursi kayu bekas' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Ajukan barter' })).toBeVisible();
  await expect(page.locator('.bottom-nav')).toHaveCount(0);
  await page.getByRole('link', { name: 'Kembali ke hasil' }).click();
  await expect(page.getByRole('searchbox')).toHaveValue('kursi');
  await expect(page).toHaveURL(/q=kursi/);
  expect(errors).toEqual([]);
});

test('area dialog closes with Escape and returns focus; price validation preserves inputs', async ({ page }, testInfo) => {
  await page.goto('/');
  const area = page.getByRole('button', { name: 'Depok · 5 km' });
  await area.click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(area).toBeFocused();
  const mobile = testInfo.project.name.startsWith('mobile');
  if (mobile) await page.getByRole('button', { name: 'Filter', exact: true }).click();
  const form = mobile ? page.getByRole('dialog') : page.locator('.desktop-filters');
  await form.getByLabel('Minimum', { exact: true }).fill('200000');
  await form.getByLabel('Maksimum', { exact: true }).fill('100000');
  await form.getByRole('button', { name: 'Terapkan' }).click();
  await expect(form.getByRole('alert')).toHaveText('Harga maksimum harus sama atau lebih besar dari minimum.');
  await expect(form.getByLabel('Minimum', { exact: true })).toHaveValue('200000');
  await form.getByLabel('Minimum', { exact: true }).fill('100000');
  await form.getByLabel('Maksimum', { exact: true }).fill('200000');
  await form.getByRole('button', { name: 'Terapkan' }).click();
  await expect(page.getByRole('link', { name: 'Kursi kayu bekas' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Sepeda kota untuk perjalanan dekat' })).toHaveCount(0);
});

test('store catalogue, preorder terms and honest inactive chat', async ({ page }) => {
  await page.goto('/stores');
  await page.getByRole('link', { name: 'Dapur Bu Rina' }).click();
  await expect(page.getByRole('heading', { name: 'Dapur Bu Rina' })).toBeVisible();
  await page.getByRole('searchbox', { name: 'Cari di katalog toko' }).fill('nasi');
  await page.getByRole('button', { name: 'Cari', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Catering rumahan untuk acara kecil' })).toHaveCount(0);
  await page.getByRole('link', { name: 'Nasi kotak untuk Jumat bersama' }).click();
  await expect(page.getByRole('heading', { name: 'Ketentuan pre-order' })).toBeVisible();
  await expect(page.getByText('50% dari total termasuk ongkir')).toBeVisible();
  await page.getByRole('link', { name: 'Tanya pesanan' }).click();
  await expect(page.getByRole('heading', { name: 'Chat belum aktif' })).toBeVisible();
  await expect(page.getByText('Hubungkan backend untuk memakai percakapan nyata.')).toBeVisible();
});

test('empty search keeps the selected radius and offers recovery', async ({ page }) => {
  await page.goto('/search?q=barang-yang-tidak-ada&radius=10');
  await expect(page.getByRole('heading', { name: 'Belum ada penawaran yang cocok' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Depok · 10 km' })).toBeVisible();
  await page.getByRole('button', { name: 'Hapus filter pencarian' }).click();
  await expect(page.getByRole('link', { name: 'Kursi kayu bekas' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Depok · 10 km' })).toBeVisible();
});

test('detail starts at top and back restores feed scroll', async ({ page }) => {
  await page.goto('/');
  const link = page.getByRole('link', { name: 'Catering rumahan untuk acara kecil' });
  await link.scrollIntoViewIfNeeded();
  const previous = await page.evaluate(() => window.scrollY);
  expect(previous).toBeGreaterThan(200);
  await link.click();
  await expect(page.getByRole('heading', { name: 'Catering rumahan untuk acara kecil' })).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await page.getByRole('link', { name: 'Kembali ke hasil' }).click();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(previous);
});

test('mobile detail presents identity and price before condition details', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'desktop', 'Mobile reading order requirement');
  await page.goto('/listings/10000000-0000-4000-8000-000000000001');
  const title = await page.getByRole('heading', { name: 'Kursi kayu bekas' }).boundingBox();
  const about = await page.getByRole('heading', { name: 'Tentang penawaran' }).boundingBox();
  expect(title).not.toBeNull();
  expect(about).not.toBeNull();
  expect(title!.y).toBeLessThan(about!.y);
});

test('responsive page has no horizontal overflow and shows only one navigation', async ({ page }, testInfo) => {
  await page.goto('/');
  await expect(page.getByRole('link', { name: 'Kursi kayu bekas' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(page.getByRole('navigation', { name: 'Navigasi utama', exact: true })).toHaveCount(1);
  await page.screenshot({ path: testInfo.outputPath('discovery.png'), fullPage: true });
  await page.getByRole('link', { name: 'Kursi kayu bekas' }).click();
  await expect(page.getByRole('link', { name: 'Chat penjual' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  if (testInfo.project.name === 'desktop') {
    const image = await page.locator('.detail-image').boundingBox();
    const galleryButton = await page.getByRole('button', { name: 'Lihat foto 1/1' }).boundingBox();
    expect(image).not.toBeNull();
    expect(galleryButton).not.toBeNull();
    expect(galleryButton!.y + galleryButton!.height).toBeLessThanOrEqual(image!.y + image!.height);
  }
  await page.screenshot({ path: testInfo.outputPath('detail.png'), fullPage: true });
});

test('search controls occupy separate icon, input, and action tracks', async ({ page }) => {
  await page.goto('/search');
  const geometry = await page.locator('.search-form').evaluate(form => {
    const icon = form.querySelector('svg')?.getBoundingClientRect();
    const input = form.querySelector('input')?.getBoundingClientRect();
    const button = form.querySelector('button')?.getBoundingClientRect();
    if (!icon || !input || !button) throw new Error('search controls not found');
    return {
      formRight: form.getBoundingClientRect().right,
      viewportWidth: window.innerWidth,
      iconRight: icon.right,
      inputLeft: input.left,
      inputRight: input.right,
      buttonLeft: button.left,
      buttonWidth: button.width,
    };
  });

  expect(geometry.formRight).toBeLessThanOrEqual(geometry.viewportWidth + 1);
  expect(geometry.iconRight).toBeLessThanOrEqual(geometry.inputLeft);
  expect(geometry.inputRight).toBeLessThanOrEqual(geometry.buttonLeft);
  expect(geometry.inputRight - geometry.inputLeft).toBeGreaterThan(0);
  expect(geometry.buttonWidth).toBeLessThan(180);
});
