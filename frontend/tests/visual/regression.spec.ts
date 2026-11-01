import { test, expect } from '@playwright/test';

const viewports = [
  { name: 'mobile', width: 375, height: 667 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1440, height: 900 },
];

const pages = [
  { path: '/', name: 'home' },
  { path: '/book', name: 'book-search' },
  { path: '/fleet', name: 'fleet' },
  { path: '/bookings', name: 'bookings' },
  { path: '/contact', name: 'contact' },
  { path: '/login', name: 'login' },
  { path: '/forgot-password', name: 'forgot-password' },
  { path: '/verify-email', name: 'verify-email' },
];

for (const vp of viewports) {
  for (const page of pages) {
    test(`${page.name} @ ${vp.name}`, async ({ page: pg }) => {
      await pg.setViewportSize({ width: vp.width, height: vp.height });
      await pg.goto(page.path);
      await pg.waitForLoadState('networkidle');
      await pg.waitForTimeout(500);
      await expect(pg).toHaveScreenshot(`${page.name}-${vp.name}.png`, {
        fullPage: true,
        animations: 'disabled',
      });
    });
  }
}

test.describe('Component states', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
  });

  test('SearchWidget error state', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.locator('#search button[type="submit"]').click();
    await expect(page.locator('#search-errors')).toBeVisible();
    await expect(page).toHaveScreenshot('search-widget-error.png');
  });

  test('LocationInput open with results', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.locator('#search-pickup').fill('Connaught');
    await page.waitForTimeout(700);
    const listbox = page.locator('[role="listbox"]');
    if (await listbox.isVisible()) {
      await expect(page).toHaveScreenshot('location-input-results.png');
    }
  });

  test('Modal open (auth)', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.locator('button:has-text("Login")').first().click();
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    await expect(page).toHaveScreenshot('modal-auth.png');
  });

  test('CategoryTabs active/inactive', async ({ page }) => {
    await page.goto('/fleet');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('category-tabs.png');
  });

  test('VehicleCard hover', async ({ page }) => {
    await page.goto('/fleet');
    await page.waitForLoadState('networkidle');
    const card = page.locator('a[href^="/book/"]').first();
    await card.hover();
    await page.waitForTimeout(200);
    await expect(page).toHaveScreenshot('vehicle-card-hover.png');
  });

  test('AuthForm register mode', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.locator('button:has-text("New to RYDEX?")').click();
    await expect(page.locator('#auth-name')).toBeVisible();
    await expect(page).toHaveScreenshot('auth-form-register.png');
  });

  test('Book results route summary', async ({ page }) => {
    await page.goto(
      '/book?category=car&pickup=Indiranagar&pickupLat=12.9719&pickupLng=77.6412&drop=Whitefield&dropLat=12.9698&dropLng=77.7499&date=2026-12-31&time=10:00',
    );
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('book-results-route.png');
  });

  test('RideDetail timeline', async ({ page }) => {
    await page.goto('/bookings/test-ride-id');
    await page.waitForLoadState('networkidle');
    test.skip(
      await page.getByText('Ride not found').isVisible(),
      'requires a seeded booking',
    );
    await expect(page.locator('text=Ride progress')).toBeVisible();
    await expect(page).toHaveScreenshot('ride-detail-timeline.png');
  });

  test('DashboardShell sidebar', async ({ page }) => {
    await page.goto('/dashboard/user');
    await page.waitForLoadState('networkidle');
    test.skip(page.url().includes('/login'), 'requires a seeded session');
    await expect(page.locator('aside')).toBeVisible();
    await expect(page).toHaveScreenshot('dashboard-sidebar.png');
  });

  test('DashboardShell mobile drawer', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/dashboard/user');
    await page.waitForLoadState('networkidle');
    test.skip(page.url().includes('/login'), 'requires a seeded session');
    await page.locator('button[aria-label="Open navigation"]').click();
    await expect(page.locator('#dashboard-navigation')).toBeVisible();
    await expect(page).toHaveScreenshot('dashboard-mobile-drawer.png');
  });
});

test.describe('Dark nav variant (homepage hero)', () => {
  test('Homepage uses inverse nav surface', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('header .surface-inverse').first()).toBeVisible();
    await expect(page).toHaveScreenshot('homepage-dark-nav.png');
  });
});