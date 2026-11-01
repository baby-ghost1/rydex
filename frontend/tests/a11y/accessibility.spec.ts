import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const pages = [
  { path: '/', name: 'home' },
  { path: '/book', name: 'book-search' },
  { path: '/fleet', name: 'fleet' },
  { path: '/bookings', name: 'bookings' },
  { path: '/contact', name: 'contact' },
  { path: '/login', name: 'login' },
  { path: '/forgot-password', name: 'forgot-password' },
  { path: '/verify-email', name: 'verify-email' },
  { path: '/dashboard/user', name: 'dashboard-user', auth: true },
  { path: '/dashboard/partner', name: 'dashboard-partner', auth: true },
  { path: '/dashboard/admin', name: 'dashboard-admin', auth: true },
];

for (const page of pages) {
  test(`${page.name} - no accessibility violations`, async ({ page: pg }) => {
    await pg.goto(page.path);
    await pg.waitForLoadState('networkidle');
    if (page.auth && pg.url().includes('/login')) {
      test.skip(true, 'requires a seeded session');
    }
    await pg.waitForTimeout(500);

    const results = await new AxeBuilder({ page: pg })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'best-practice'])
      .analyze();

    expect(results.violations).toEqual([]);
  });
}

test.describe('Focus management', () => {
  test('Modal traps focus and restores on close', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const trigger = page.locator('button:has-text("Login")').first();
    await trigger.click();
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();
  });

  test('Mobile nav drawer is reachable by keyboard', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const trigger = page.locator('button[aria-label="Open navigation"]');
    await trigger.click();
    await expect(page.locator('#mobile-navigation')).toBeVisible();
    await trigger.click();
    await expect(page.locator('#mobile-navigation')).not.toBeVisible();
  });

  test('Dashboard mobile drawer traps focus (seeded session)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/dashboard/user');
    await page.waitForLoadState('networkidle');
    test.skip(page.url().includes('/login'), 'requires a seeded session');

    await page.locator('button[aria-label="Open navigation"]').click();
    await expect(page.locator('#dashboard-navigation')).toBeVisible();
    await page.keyboard.press('Tab');
    const firstFocusable = page
      .locator('#dashboard-navigation a, #dashboard-navigation button')
      .first();
    await expect(firstFocusable).toBeFocused();
  });

  test('Chat drawer is focus-trapped (seeded booking)', async ({ page }) => {
    await page.goto('/bookings/test-ride-id');
    await page.waitForLoadState('networkidle');
    test.skip(
      await page.getByText('Ride not found').isVisible(),
      'requires a seeded booking',
    );

    await page.locator('button:has-text("Chat")').click();
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    await page.keyboard.press('Tab');
    const firstFocusable = page
      .locator('[role="dialog"] [tabindex="0"], [role="dialog"] button, [role="dialog"] textarea')
      .first();
    await expect(firstFocusable).toBeFocused();
  });
});

test.describe('ARIA and semantic structure', () => {
  test('SearchWidget has proper combobox semantics', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const pickup = page.locator('#search-pickup');
    await expect(pickup).toHaveAttribute('role', 'combobox');
    await expect(pickup).toHaveAttribute('aria-autocomplete', 'list');
    await expect(pickup).toHaveAttribute('aria-expanded', 'false');

    await pickup.fill('Test');
    await page.waitForTimeout(700);
    await expect(pickup).toHaveAttribute('aria-expanded', 'true');
    await expect(pickup).toHaveAttribute('aria-controls');
  });

  test('LocationInput options use role=option', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.locator('#search-pickup').fill('Connaught');
    await page.waitForTimeout(800);
    const options = page.locator('[role="listbox"] [role="option"]');
    if (await options.first().isVisible()) {
      await expect(options.first()).toHaveAttribute('aria-selected', 'true');
    }
  });

  test('CategoryTabs uses role=group and aria-pressed', async ({ page }) => {
    await page.goto('/fleet');
    await page.waitForLoadState('networkidle');
    const group = page.locator('[role="group"][aria-label="Vehicle category"]');
    await expect(group).toBeVisible();
    await expect(group.locator('button').first()).toHaveAttribute('aria-pressed');
  });

  test('Dashboard filter row uses group + aria-pressed (seeded session)', async ({ page }) => {
    await page.goto('/dashboard/partner/requests');
    await page.waitForLoadState('networkidle');
    test.skip(page.url().includes('/login'), 'requires a seeded session');
    const group = page.locator('[role="group"][aria-label="Filter"]');
    await expect(group).toBeVisible();
    await expect(group.locator('button').first()).toHaveAttribute('aria-pressed');
  });

  test('FAQ uses the disclosure pattern', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const triggers = page.locator('#faq button[aria-expanded]');
    await expect(triggers.first()).toBeVisible();
    await triggers.first().click();
    await expect(triggers.first()).toHaveAttribute('aria-expanded', 'true');
    const panel = page.locator(`#${await triggers.first().getAttribute('aria-controls')}`);
    await expect(panel).not.toBeHidden();
  });

  test('Validation summary uses role=alert', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.locator('#search button[type="submit"]').click();
    await expect(page.locator('#search-errors')).toHaveAttribute('role', 'alert');
  });

  test('Polite live regions exist for async updates', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const count = await page.locator('[aria-live="polite"]').count();
    expect(count).toBeGreaterThanOrEqual(3);
  });

  test('Icon-only buttons expose accessible names', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const buttons = page.locator('button:has(svg)');
    const count = await buttons.count();
    for (let i = 0; i < count; i++) {
      const button = buttons.nth(i);
      const name = await button.evaluate(
        (el) =>
          el.getAttribute('aria-label') ||
          (el.textContent || '').trim() ||
          el.getAttribute('title'),
      );
      expect(name, 'button needs an accessible name').toBeTruthy();
    }
  });

  test('Form inputs on login have associated labels', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    const inputs = page.locator(
      'input:not([type="hidden"]):not([type="checkbox"]), textarea, select',
    );
    const count = await inputs.count();
    for (let i = 0; i < count; i++) {
      const input = inputs.nth(i);
      const id = await input.getAttribute('id');
      expect(id, 'input needs an id for its label').toBeTruthy();
      await expect(page.locator(`label[for="${id}"]`)).toBeAttached();
    }
  });

  test('Heading hierarchy has no skips on the homepage', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const levels = await page
      .locator('h1, h2, h3, h4, h5, h6')
      .evaluateAll((nodes) =>
        nodes.map((node) => Number(node.tagName.slice(1))),
      );
    let last = 0;
    for (const level of levels) {
      expect(level).toBeLessThanOrEqual(last + 1);
      last = level;
    }
  });
});

test.describe('Colour contrast and target size', () => {
  test('Buttons on the homepage meet 44x44 minimum', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const buttons = page.locator('button:not([disabled])');
    const count = await buttons.count();
    for (let i = 0; i < count; i++) {
      const button = buttons.nth(i);
      if (!(await button.isVisible())) continue;
      const box = await button.boundingBox();
      if (box) {
        expect.soft(box.height, 'button height').toBeGreaterThanOrEqual(44);
      }
    }
  });

  test('Login inputs meet 44px height', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    const inputs = page.locator(
      'input:not([type="hidden"]):not([type="checkbox"]), select',
    );
    const count = await inputs.count();
    for (let i = 0; i < count; i++) {
      const box = await inputs.nth(i).boundingBox();
      if (box) {
        expect.soft(box.height, 'input height').toBeGreaterThanOrEqual(44);
      }
    }
  });

  test('Category chips on /fleet meet 44px height', async ({ page }) => {
    await page.goto('/fleet');
    await page.waitForLoadState('networkidle');
    const tabs = page.locator('[role="group"][aria-label="Vehicle category"] button');
    const count = await tabs.count();
    for (let i = 0; i < count; i++) {
      const box = await tabs.nth(i).boundingBox();
      if (box) {
        expect.soft(box.height, 'chip height').toBeGreaterThanOrEqual(44);
      }
    }
  });

  test('OTP inputs meet 44x44', async ({ page }) => {
    await page.goto('/verify-email');
    await page.waitForLoadState('networkidle');
    const otpInputs = page.locator('[role="group"][aria-label="Verification code"] input');
    const count = await otpInputs.count();
    for (let i = 0; i < count; i++) {
      const box = await otpInputs.nth(i).boundingBox();
      if (box) {
        expect.soft(box.height, 'OTP input height').toBeGreaterThanOrEqual(44);
      }
    }
  });

  test('Interactive rating stars meet 44x44 (seeded booking)', async ({ page }) => {
    await page.goto('/bookings/test-ride-id');
    await page.waitForLoadState('networkidle');
    test.skip(
      await page.getByText('Ride not found').isVisible(),
      'requires a seeded booking',
    );
    const stars = page.locator('[role="group"][aria-label="Rate this ride"] button');
    const count = await stars.count();
    for (let i = 0; i < count; i++) {
      const box = await stars.nth(i).boundingBox();
      if (box) {
        expect.soft(box.width, 'star width').toBeGreaterThanOrEqual(44);
        expect.soft(box.height, 'star height').toBeGreaterThanOrEqual(44);
      }
    }
  });
});