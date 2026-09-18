import { expect, test } from '@playwright/test';

test('keeps the mobile support launcher clear of fixed action dock controls', async ({ page }) => {
  await page.goto('/search');
  await page.locator('main').waitFor();
  await page.addStyleTag({ content: '.bottom-nav { display: none !important; }' });
  await page.evaluate(() => {
    const main = document.querySelector('main');
    if (!main) throw new Error('main not found');
    const anchor = document.createElement('div');
    anchor.className = 'action-dock-anchor';
    anchor.innerHTML = '<div data-action-dock-reservation aria-hidden="true"></div><aside class="action-dock" role="group" aria-label="Aksi penawaran"><p>Catatan transaksi yang perlu dibaca sebelum memilih langkah berikutnya.</p><div><button type="button">Aksi utama</button><button type="button">Aksi sekunder</button></div></aside>';
    const primary = anchor.querySelector('button');
    primary?.addEventListener('click', () => primary.setAttribute('data-clicked', 'true'));
    main.append(anchor);
  });

  const dock = page.locator('.action-dock');
  const launcher = page.getByRole('button', { name: 'Buka bantuan pelanggan' });
  const dockBox = await dock.boundingBox();
  const launcherBox = await launcher.boundingBox();
  expect(dockBox).not.toBeNull();
  expect(launcherBox).not.toBeNull();
  expect((launcherBox?.y ?? 0) + (launcherBox?.height ?? 0)).toBeLessThanOrEqual((dockBox?.y ?? 0) - 8);

  await launcher.click();
  const panel = page.locator('.support-panel');
  const panelBox = await panel.boundingBox();
  expect(panelBox).not.toBeNull();
  expect((panelBox?.y ?? 0) + (panelBox?.height ?? 0)).toBeLessThanOrEqual((dockBox?.y ?? 0) - 8);

  await page.getByRole('button', { name: 'Aksi utama' }).click();
  await expect(page.getByRole('button', { name: 'Aksi utama' })).toHaveAttribute('data-clicked', 'true');
});
