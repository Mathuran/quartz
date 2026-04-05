import { test, expect } from '@playwright/test';

const BASE_URL = process.env.DEPLOY_URL || 'https://quartz-editor.dev';

test.describe('Deployed site validation', () => {
  test('homepage loads with all sections', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });

    // Hero
    await expect(page.locator('.hero-headline')).toBeVisible();
    await expect(page.locator('.hero-headline')).toContainText('Markdown editing');

    // Hero product screenshot
    const heroImg = page.locator('.hero-product img');
    await expect(heroImg).toBeVisible();

    // Showcase steps
    const steps = page.locator('.showcase-step');
    await expect(steps).toHaveCount(4);

    // Features grid
    await expect(page.locator('.features-grid .card')).toHaveCount(6);

    // Footer
    await expect(page.locator('.site-footer')).toBeVisible();
  });

  test('images load successfully', async ({ page }) => {
    const failedImages: string[] = [];
    page.on('response', (response) => {
      if (response.url().includes('/images/') && response.status() !== 200) {
        failedImages.push(`${response.url()} → ${response.status()}`);
      }
    });

    await page.goto(BASE_URL, { waitUntil: 'networkidle' });

    // Scroll through page to trigger lazy-loaded images
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 400) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 200));
      }
    });

    expect(failedImages).toEqual([]);
  });

  test('demo editor loads and renders content', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });

    // Scroll to demo section to trigger lazy-load
    await page.locator('#demo').scrollIntoViewIfNeeded();

    // Wait for iframe to appear
    const iframe = page.locator('.demo-editor-frame');
    await expect(iframe).toBeVisible({ timeout: 10000 });

    // Wait for iframe to load content
    const frame = page.frameLocator('.demo-editor-frame');
    await expect(frame.locator('#root')).toBeVisible({ timeout: 10000 });

    // Verify editor rendered the sample content
    await expect(frame.locator('text=Welcome to Quartz')).toBeVisible({ timeout: 10000 });
    await expect(frame.getByRole('heading', { name: 'Slash Commands' })).toBeVisible();
    await expect(frame.getByRole('heading', { name: 'Code Blocks' })).toBeVisible();
  });

  test('navigation links work', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });

    // GitHub link
    const githubLink = page.locator('.navbar-link[href*="github.com"]');
    await expect(githubLink).toHaveAttribute('target', '_blank');

    // Install button
    const installBtn = page.locator('.navbar .btn-primary');
    await expect(installBtn).toHaveAttribute('href', /marketplace\.visualstudio\.com/);
  });

  test('theme toggle works', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });

    // Default is dark (no data-theme attribute or data-theme="dark")
    const html = page.locator('html');

    // Click theme toggle
    await page.locator('.theme-toggle').click();
    await expect(html).toHaveAttribute('data-theme', 'light');

    // Toggle back
    await page.locator('.theme-toggle').click();
    await expect(html).toHaveAttribute('data-theme', 'dark');
  });
});
