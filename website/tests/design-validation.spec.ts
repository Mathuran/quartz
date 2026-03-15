import { test, expect, type Page } from '@playwright/test';

// ═══════════════════════════════════════════════════════
// Helper: scroll to section and wait for reveal animations
// ═══════════════════════════════════════════════════════

async function scrollToSection(page: Page, selector: string) {
  await page.locator(selector).scrollIntoViewIfNeeded();
  // Wait for reveal animations to complete
  await page.waitForTimeout(700);
}

async function gotoAndWait(page: Page) {
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');
}

// ═══════════════════════════════════════════════════════
// 1. FULL PAGE SCREENSHOTS
// ═══════════════════════════════════════════════════════

test.describe('Full page visual regression', () => {
  test('hero section renders correctly', async ({ page }) => {
    await gotoAndWait(page);
    // Wait for crystal draw-on animation to finish
    await page.waitForTimeout(1200);

    await expect(page.locator('.hero')).toHaveScreenshot('hero-section.png', {
      animations: 'disabled',
    });
  });

  test('features section renders correctly', async ({ page }) => {
    await gotoAndWait(page);
    await scrollToSection(page, '#features');

    await expect(page.locator('.features')).toHaveScreenshot(
      'features-section.png',
      { animations: 'disabled' }
    );
  });

  test('showcase section renders correctly', async ({ page }) => {
    await gotoAndWait(page);
    await scrollToSection(page, '#showcase');

    await expect(page.locator('.showcase')).toHaveScreenshot(
      'showcase-section.png',
      { animations: 'disabled' }
    );
  });

  test('footer renders correctly', async ({ page }) => {
    await gotoAndWait(page);
    await scrollToSection(page, '.site-footer');

    await expect(page.locator('.site-footer')).toHaveScreenshot(
      'footer-section.png',
      { animations: 'disabled' }
    );
  });
});

// ═══════════════════════════════════════════════════════
// 2. DESIGN SYSTEM VALIDATION
// ═══════════════════════════════════════════════════════

test.describe('Design system', () => {
  test('uses correct brand color (crystal purple #7c4dff)', async ({
    page,
  }) => {
    await gotoAndWait(page);

    const ctaButton = page.locator('.hero-actions .btn-primary');
    const bgColor = await ctaButton.evaluate(
      (el) => getComputedStyle(el).backgroundColor
    );
    // #7c4dff = rgb(124, 77, 255)
    expect(bgColor).toBe('rgb(124, 77, 255)');
  });

  test('uses Inter font family', async ({ page }) => {
    await gotoAndWait(page);

    const fontFamily = await page.locator('.hero-headline').evaluate(
      (el) => getComputedStyle(el).fontFamily
    );
    expect(fontFamily).toContain('Inter');
  });

  test('hero headline has correct weight (800)', async ({ page }) => {
    await gotoAndWait(page);

    const fontWeight = await page.locator('.hero-headline').evaluate(
      (el) => getComputedStyle(el).fontWeight
    );
    expect(fontWeight).toBe('800');
  });

  test('light theme has correct canvas color', async ({ page }) => {
    await gotoAndWait(page);
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'light');
    });

    const bgColor = await page.evaluate(
      () => getComputedStyle(document.body).backgroundColor
    );
    // #fafafa = rgb(250, 250, 250)
    expect(bgColor).toBe('rgb(250, 250, 250)');
  });

  test('dark theme applies correct colors', async ({ page }) => {
    await gotoAndWait(page);
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'dark');
    });

    const bgColor = await page.evaluate(
      () => getComputedStyle(document.body).backgroundColor
    );
    // #0a0a14 = rgb(10, 10, 20)
    expect(bgColor).toBe('rgb(10, 10, 20)');

    const textColor = await page.locator('.hero-headline').evaluate(
      (el) => getComputedStyle(el).color
    );
    // #f0f0f5 = rgb(240, 240, 245)
    expect(textColor).toBe('rgb(240, 240, 245)');
  });

  test('code font uses JetBrains Mono or monospace fallback', async ({
    page,
  }) => {
    await gotoAndWait(page);
    await scrollToSection(page, '#showcase');

    // Verify the CSS variable is set correctly (font may not be loaded in CI)
    const fontFamily = await page.locator('.showcase-step-number').first().evaluate(
      (el) => getComputedStyle(el).fontFamily
    );
    // Accept either JetBrains Mono loaded or the monospace fallback
    expect(fontFamily).toMatch(/JetBrains Mono|monospace/);
  });
});

// ═══════════════════════════════════════════════════════
// 3. LAYOUT VALIDATION
// ═══════════════════════════════════════════════════════

test.describe('Layout', () => {
  test('navbar is fixed at top', async ({ page }) => {
    await gotoAndWait(page);

    const position = await page.locator('.navbar').evaluate(
      (el) => getComputedStyle(el).position
    );
    expect(position).toBe('fixed');

    const zIndex = await page.locator('.navbar').evaluate(
      (el) => getComputedStyle(el).zIndex
    );
    expect(Number(zIndex)).toBeGreaterThanOrEqual(100);
  });

  test('hero section is at least viewport height', async ({ page }) => {
    await gotoAndWait(page);

    const heroHeight = await page.locator('.hero').evaluate(
      (el) => el.getBoundingClientRect().height
    );
    const viewportHeight = page.viewportSize()?.height ?? 900;
    expect(heroHeight).toBeGreaterThanOrEqual(viewportHeight * 0.9);
  });

  test('feature cards are in a 3-column grid on desktop', async (
    { page },
    testInfo
  ) => {
    if (
      testInfo.project.name.includes('mobile') ||
      testInfo.project.name.includes('tablet')
    ) {
      test.skip();
    }

    await gotoAndWait(page);
    await scrollToSection(page, '#features');

    const gridCols = await page.locator('.features-grid').evaluate(
      (el) => getComputedStyle(el).gridTemplateColumns
    );
    const colCount = gridCols.split(' ').length;
    expect(colCount).toBe(3);
  });

  test('content respects max-width constraint', async ({ page }) => {
    await gotoAndWait(page);

    const containerWidth = await page.locator('.container').first().evaluate(
      (el) => el.getBoundingClientRect().width
    );
    expect(containerWidth).toBeLessThanOrEqual(1200 + 64);
  });

  test('showcase steps alternate layout direction', async (
    { page },
    testInfo
  ) => {
    if (testInfo.project.name.includes('mobile')) {
      test.skip();
    }

    await gotoAndWait(page);
    await scrollToSection(page, '#showcase');

    const steps = page.locator('.showcase-step');
    const count = await steps.count();
    expect(count).toBe(4);

    for (let i = 0; i < count; i++) {
      const direction = await steps.nth(i).evaluate(
        (el) => getComputedStyle(el).direction
      );
      if (i % 2 === 1) {
        expect(direction).toBe('rtl');
      } else {
        expect(direction).toBe('ltr');
      }
    }
  });
});

// ═══════════════════════════════════════════════════════
// 4. COMPONENT VALIDATION
// ═══════════════════════════════════════════════════════

test.describe('Components', () => {
  test('SVG crystal renders with correct structure', async ({ page }) => {
    await gotoAndWait(page);

    const crystal = page.locator('.hero-crystal .crystal-svg');
    await expect(crystal).toBeVisible();

    // Crystal should have facet paths/lines (inlined, not via <use>)
    const facetCount = await crystal.evaluate((el) => {
      return el.querySelectorAll('[class^="facet-"]').length;
    });
    expect(facetCount).toBeGreaterThanOrEqual(5);
  });

  test('CTA buttons link to VS Code Marketplace', async ({ page }) => {
    await gotoAndWait(page);

    const heroCta = page.locator('.hero-actions .btn-primary');
    const href = await heroCta.getAttribute('href');
    expect(href).toContain('marketplace.visualstudio.com');
    expect(href).toContain('quartz');
  });

  test('feature cards have hover effect', async ({ page }) => {
    await gotoAndWait(page);
    await scrollToSection(page, '#features');

    const card = page.locator('.card').first();
    await card.waitFor({ state: 'visible' });

    const initialBorder = await card.evaluate(
      (el) => getComputedStyle(el).borderColor
    );

    await card.hover();
    await page.waitForTimeout(200);

    const hoverBorder = await card.evaluate(
      (el) => getComputedStyle(el).borderColor
    );

    expect(hoverBorder).not.toBe(initialBorder);
  });

  test('all 6 feature cards are present', async ({ page }) => {
    await gotoAndWait(page);

    const cards = page.locator('.features-grid .card');
    await expect(cards).toHaveCount(6);

    const titles = await cards.locator('h3').allTextContents();
    expect(titles).toEqual([
      'Slash Commands',
      'Tables',
      'Code Blocks',
      'Callouts',
      'Frontmatter',
      'Themes',
    ]);
  });

  test('social proof badges are present', async ({ page }) => {
    await gotoAndWait(page);

    const badges = page.locator('.social-proof .badge');
    await expect(badges).toHaveCount(3);
  });

  test('testimonial cards are scrollable', async ({ page }) => {
    await gotoAndWait(page);
    await scrollToSection(page, '#testimonials');

    const track = page.locator('.testimonials-track');
    const scrollWidth = await track.evaluate((el) => el.scrollWidth);
    const clientWidth = await track.evaluate((el) => el.clientWidth);

    expect(scrollWidth).toBeGreaterThan(clientWidth);
  });

  test('5 testimonial cards are present', async ({ page }) => {
    await gotoAndWait(page);
    await scrollToSection(page, '#testimonials');

    const cards = page.locator('.testimonial-card');
    await expect(cards).toHaveCount(5);
  });
});

// ═══════════════════════════════════════════════════════
// 5. SCROLL BEHAVIOR
// ═══════════════════════════════════════════════════════

test.describe('Scroll animations', () => {
  test('navbar gets "scrolled" class after scrolling past hero', async ({
    page,
  }) => {
    await gotoAndWait(page);
    const navbar = page.locator('.navbar');

    // Initially no scrolled class
    await expect(navbar).not.toHaveClass(/scrolled/);

    // Scroll well past the hero section (100vh + buffer)
    await page.evaluate(() => window.scrollTo(0, window.innerHeight + 200));
    await page.waitForTimeout(500);

    await expect(navbar).toHaveClass(/scrolled/);
  });

  test('navbar logo appears after scrolling past hero', async ({ page }) => {
    await gotoAndWait(page);

    const logo = page.locator('.navbar-logo');

    const initialOpacity = await logo.evaluate(
      (el) => getComputedStyle(el).opacity
    );
    expect(initialOpacity).toBe('0');

    // Scroll past hero
    await page.evaluate(() => window.scrollTo(0, window.innerHeight + 200));
    await page.waitForTimeout(500);

    const scrolledOpacity = await logo.evaluate(
      (el) => getComputedStyle(el).opacity
    );
    expect(Number(scrolledOpacity)).toBeGreaterThan(0.9);
  });

  test('reveal elements become visible when scrolled into view', async ({
    page,
  }) => {
    await gotoAndWait(page);

    const showcaseHeader = page.locator('.showcase-header.reveal');

    // Scroll to showcase and wait for IntersectionObserver
    await scrollToSection(page, '.showcase-header');

    await expect(showcaseHeader).toHaveClass(/is-visible/, { timeout: 3000 });
  });

  test('scroll hint fades out after scrolling', async ({ page }) => {
    await gotoAndWait(page);

    const hint = page.locator('.scroll-hint');
    await expect(hint).toBeVisible();

    await page.evaluate(() => window.scrollTo(0, 200));
    await page.waitForTimeout(500);

    const opacity = await hint.evaluate(
      (el) => getComputedStyle(el).opacity
    );
    expect(Number(opacity)).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════
// 6. THEME TOGGLE
// ═══════════════════════════════════════════════════════

test.describe('Theme toggle', () => {
  test('theme toggle switches between light and dark', async ({ page }) => {
    await gotoAndWait(page);

    // Use the visible theme toggle inside navbar-links
    const toggle = page.locator('.navbar-links .theme-toggle');
    await toggle.click();

    const theme = await page.evaluate(() =>
      document.documentElement.getAttribute('data-theme')
    );
    expect(theme).toBe('dark');

    const bg = await page.evaluate(
      () => getComputedStyle(document.body).backgroundColor
    );
    expect(bg).toBe('rgb(10, 10, 20)');

    // Toggle back
    await toggle.click();

    const theme2 = await page.evaluate(() =>
      document.documentElement.getAttribute('data-theme')
    );
    expect(theme2).toBe('light');
  });

  test('theme preference persists in localStorage', async ({ page }) => {
    await gotoAndWait(page);

    const toggle = page.locator('.navbar-links .theme-toggle');
    await toggle.click();

    const stored = await page.evaluate(() =>
      localStorage.getItem('quartz-theme')
    );
    expect(stored).toBe('dark');
  });
});

// ═══════════════════════════════════════════════════════
// 7. ACCESSIBILITY
// ═══════════════════════════════════════════════════════

test.describe('Accessibility', () => {
  test('nav has correct aria-label', async ({ page }) => {
    await gotoAndWait(page);

    const nav = page.locator('nav[role="navigation"]');
    await expect(nav).toHaveAttribute('aria-label', 'Main navigation');
  });

  test('crystal SVG has role and aria-label', async ({ page }) => {
    await gotoAndWait(page);

    const svg = page.locator('.hero-crystal svg[role="img"]');
    await expect(svg).toHaveAttribute('aria-label', 'Quartz crystal logo');
  });

  test('all external links have rel="noopener"', async ({ page }) => {
    await gotoAndWait(page);

    const externalLinks = page.locator('a[target="_blank"]');
    const count = await externalLinks.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      const rel = await externalLinks.nth(i).getAttribute('rel');
      expect(rel).toContain('noopener');
    }
  });

  test('page has correct title and meta description', async ({ page }) => {
    await gotoAndWait(page);

    const title = await page.title();
    expect(title).toContain('Quartz');

    const description = await page
      .locator('meta[name="description"]')
      .getAttribute('content');
    expect(description).toContain('Notion-style editor');
  });

  test('keyboard navigation reaches CTA', async ({ page }) => {
    await gotoAndWait(page);

    // Tab through interactive elements to find the marketplace CTA
    let foundCta = false;
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press('Tab');
      const href = await page.evaluate(
        () => (document.activeElement as HTMLAnchorElement)?.href || ''
      );
      if (href.includes('marketplace.visualstudio.com')) {
        foundCta = true;
        break;
      }
    }
    expect(foundCta).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════
// 8. CONTENT VALIDATION
// ═══════════════════════════════════════════════════════

test.describe('Content', () => {
  test('hero has correct headline and subtitle', async ({ page }) => {
    await gotoAndWait(page);

    await expect(page.locator('.hero-headline')).toHaveText(
      'Your markdown, refined.'
    );
    await expect(page.locator('.hero-subtitle')).toContainText(
      'Notion-style editor'
    );
  });

  test('showcase has all 4 steps', async ({ page }) => {
    await gotoAndWait(page);

    const steps = page.locator('.showcase-step');
    await expect(steps).toHaveCount(4);

    const titles = await steps
      .locator('.showcase-step-title')
      .allTextContents();
    expect(titles).toEqual([
      'Write naturally',
      '/ to create anything',
      'Blocks that move',
      'Your markdown, untouched',
    ]);
  });

  test('footer contains required links', async ({ page }) => {
    await gotoAndWait(page);
    await scrollToSection(page, '.site-footer');

    const footerLinks = page.locator('.site-footer a');
    const hrefs = await footerLinks.evaluateAll((links) =>
      links.map((l) => (l as HTMLAnchorElement).href)
    );

    expect(hrefs.some((h) => h.includes('github.com'))).toBe(true);
    expect(
      hrefs.some((h) => h.includes('marketplace.visualstudio.com'))
    ).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════
// 9. DEMO SECTION
// ═══════════════════════════════════════════════════════

test.describe('Demo section', () => {
  test('demo placeholder is visible before scroll', async ({ page }) => {
    await gotoAndWait(page);

    const placeholder = page.locator('#demo-placeholder');
    await expect(placeholder).toBeAttached();
  });

  test('demo editor wrapper has macOS-style toolbar dots', async ({
    page,
  }) => {
    await gotoAndWait(page);
    await scrollToSection(page, '#demo');

    const dots = page.locator('.demo-editor-dot');
    await expect(dots).toHaveCount(3);
  });

  test('demo CTA links to marketplace', async ({ page }) => {
    await gotoAndWait(page);
    await scrollToSection(page, '#demo');

    const cta = page.locator('.demo-cta .btn-primary');
    const href = await cta.getAttribute('href');
    expect(href).toContain('marketplace.visualstudio.com');
  });
});

// ═══════════════════════════════════════════════════════
// 10. REDUCED MOTION
// ═══════════════════════════════════════════════════════

test.describe('Reduced motion', () => {
  test('animations are disabled with prefers-reduced-motion', async ({
    browser,
  }) => {
    const context = await browser.newContext({
      reducedMotion: 'reduce',
    });
    const page = await context.newPage();
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Reveal elements should be immediately visible (no opacity:0)
    const showcaseHeader = page.locator('.showcase-header.reveal');
    const opacity = await showcaseHeader.evaluate(
      (el) => getComputedStyle(el).opacity
    );
    expect(opacity).toBe('1');

    // Crystal facet should not have animated dash offset
    const dashOffset = await page
      .locator('.hero-crystal .crystal-svg .facet-1')
      .evaluate((el) => {
        const val = getComputedStyle(el).strokeDashoffset;
        return parseFloat(val) || 0;
      });
    expect(dashOffset).toBe(0);

    await context.close();
  });
});
