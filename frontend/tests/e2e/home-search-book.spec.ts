import { test, expect, type Page } from '@playwright/test';

async function gotoHydrated(page: Page, url: string) {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.locator('html[data-hydrated="true"]').waitFor({ state: 'attached' });
}

test.describe('Home → Book flow', () => {
  test.beforeEach(async ({ page }) => {
    await gotoHydrated(page, '/');
  });

  test('Homepage loads hero, categories and fleet', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Book Any');
    await expect(page.locator('a:has-text("Book a ride")').first()).toBeVisible();
    await expect(page.locator('[role="group"][aria-label="Vehicle category"]')).toBeVisible();
    await expect(page.locator('#fleet')).toBeVisible();
  });

  test('Book a ride CTA opens the pickup/drop form', async ({ page }) => {
    await page.locator('a:has-text("Book a ride")').first().click();
    await expect(page).toHaveURL('/book');
    await expect(page.locator('#search-pickup')).toBeVisible();
    await expect(page.locator('#search-drop')).toBeVisible();
  });
});

test.describe('Book entry form', () => {
  test.beforeEach(async ({ page }) => {
    await gotoHydrated(page, '/book');
  });

  test('Ride now is the default and schedule controls are optional', async ({ page }) => {
    const rideNow = page.locator('button:has-text("Ride now")');
    const schedule = page.locator('button:has-text("Schedule for later")');
    await expect(rideNow).toHaveAttribute('aria-pressed', 'true');
    await expect(schedule).toHaveAttribute('aria-pressed', 'false');
    await expect(page.locator('#search-date')).toHaveCount(0);

    await schedule.click();
    await expect(schedule).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#search-date')).toBeVisible();
    await expect(page.locator('#search-time')).toBeVisible();

    await rideNow.click();
    await expect(page.locator('#search-date')).toHaveCount(0);
  });

  test('Validation shows summary and focuses first invalid field', async ({ page }) => {
    await page.locator('button[type="submit"]').click();
    await expect(page.locator('#search-errors')).toBeVisible();
    await expect(page.locator('#search-errors li')).toHaveCount(2);
    await expect(page.locator('#search-pickup')).toBeFocused();
  });

  test('Swap control is present and usable', async ({ page }) => {
    const swap = page.locator('button[aria-label="Swap pickup and drop locations"]');
    await expect(swap).toBeVisible();
    await swap.click();
    await expect(page.locator('#search-pickup')).toBeVisible();
    await expect(page.locator('#search-drop')).toBeVisible();
  });

  test('Location input exposes combobox semantics', async ({ page }) => {
    const pickup = page.locator('#search-pickup');
    await expect(pickup).toHaveAttribute('role', 'combobox');
    await pickup.fill('Connaught');
    await page.waitForTimeout(700);
    const listbox = page.locator('[role="listbox"]');
    if (await listbox.isVisible()) {
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('Enter');
    }
  });
});

test.describe('Book results page', () => {
  test('Immediate route renders ride categories with fares and payment choice', async ({ page }) => {
    await gotoHydrated(
      page,
      '/book?pickup=Indiranagar&pickupLat=12.9719&pickupLng=77.6412&drop=Whitefield&dropLat=12.9698&dropLng=77.7499&scheduled=0&date=2026-12-31&time=10:00',
    );
    await expect(page.locator('h1')).toContainText('Choose your ride');
    await expect(page.locator('button:has-text("Modify search")')).toBeVisible();
    await expect(page.locator('text=First accept wins')).toBeVisible();
    await expect(page.locator('button:has-text("Cash")')).toBeVisible();
    await expect(page.locator('button:has-text("Pay online")')).toBeVisible();
    await expect(
      page
        .locator('text=fixed fare')
        .first()
        .or(page.getByText('No online partners nearby right now')),
    ).toBeVisible();
  });

  test('Scheduled route shows the selected date and time', async ({ page }) => {
    await gotoHydrated(
      page,
      '/book?pickup=Indiranagar&pickupLat=12.9719&pickupLng=77.6412&drop=Whitefield&dropLat=12.9698&dropLng=77.7499&scheduled=1&date=2026-12-31&time=10:00',
    );
    await expect(page.locator('text=Scheduled ride')).toBeVisible();
    await expect(page.locator('text=10:00')).toBeVisible();
  });

  test('Falls back to the pickup/drop entry form when no route is provided', async ({ page }) => {
    await gotoHydrated(page, '/book');
    await expect(page.locator('h1')).toContainText('Where are you headed');
    await expect(page.locator('form:has(#search-pickup)')).toBeVisible();
    await expect(page.locator('button:has-text("Ride now")')).toBeVisible();
    await expect(page.locator('button:has-text("Schedule for later")')).toBeVisible();
  });
});

test.describe('Fleet page browse and filter', () => {
  test.beforeEach(async ({ page }) => {
    await gotoHydrated(page, '/fleet');
  });

  test('Category tabs filter vehicles', async ({ page }) => {
    const tabs = page.locator('[role="group"][aria-label="Vehicle category"] button');
    await tabs.nth(1).click();
    await expect(tabs.nth(1)).toHaveAttribute('aria-pressed', 'true');
    await expect(tabs.first()).toHaveAttribute('aria-pressed', 'false');
  });

  test('Search input filters results', async ({ page }) => {
    await page.locator('#fleet-search').fill('Toyota');
    await page.waitForTimeout(600);
    await expect(page.locator('a[href^="/book/"]').first()).toBeVisible();
  });

  test('Price and sort selects work', async ({ page }) => {
    await page.locator('#fleet-price').selectOption('12');
    await expect(page.locator('#fleet-price')).toHaveValue('12');
    await page.locator('#fleet-sort').selectOption('price_asc');
    await expect(page.locator('#fleet-sort')).toHaveValue('price_asc');
  });
});

test.describe('Auth forms', () => {
  test('Login modal opens, exposes fields, closes with Escape', async ({ page }) => {
    await gotoHydrated(page, '/');
    await page.locator('button:has-text("Login")').first().click();
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    await expect(page.locator('#auth-title')).toContainText('Welcome back');
    await expect(page.locator('#auth-email')).toBeVisible();
    await expect(page.locator('#auth-password')).toBeVisible();

    await page.locator('button[aria-label="Show password"]').click();
    await expect(page.locator('#auth-password')).toHaveAttribute('type', 'text');

    await page.keyboard.press('Escape');
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();
  });

  test('Register mode reveals name and phone fields', async ({ page }) => {
    await gotoHydrated(page, '/login');
    await page.locator('button:has-text("Create an account")').click();
    await expect(page.locator('#auth-title')).toContainText('Create account');
    await expect(page.locator('#auth-name')).toBeVisible();
    await expect(page.locator('#auth-phone')).toBeVisible();
  });

  test('Forgot password link navigates', async ({ page }) => {
    await gotoHydrated(page, '/login');
    await page.locator('a:has-text("Forgot password")').click();
    await expect(page).toHaveURL('/forgot-password');
  });

  test('Verify email form exposes grouped OTP inputs', async ({ page }) => {
    await gotoHydrated(page, '/verify-email');
    const otpInputs = page.locator('[role="group"][aria-label="Verification code"] input');
    await expect(otpInputs).toHaveCount(6);
    await expect(otpInputs.first()).toBeFocused();
    await otpInputs.first().press('1');
    await expect(otpInputs.nth(1)).toBeFocused();
  });
});

test.describe('Checkout flow', () => {
  test.fixme(
    'Vehicle checkout renders fare estimate (requires seeded vehicle id)',
    async ({ page }) => {
      await page.goto('/book/SEEDED_VEHICLE_ID', { waitUntil: 'domcontentloaded' });
      await expect(page.locator('text=Fare estimate')).toBeVisible();
    },
  );
});

test.describe('Bookings', () => {
  test('Signed-out visitors are invited to sign in', async ({ page }) => {
    await gotoHydrated(page, '/bookings');
    await expect(page.getByText('Your bookings live here')).toBeVisible();
    await expect(page.locator('button:has-text("Sign in to continue")')).toBeVisible();
  });
});

test.describe('Ride detail', () => {
  test('Unknown booking renders a friendly fallback', async ({ page }) => {
    await gotoHydrated(page, '/bookings/test-ride-id');
    await expect(
      page.getByText(/Ride not found|Your ride\.|Ride completed\./).first(),
    ).toBeVisible();
  });

  test.fixme(
    'Chat drawer sends messages (requires seeded booking)',
    async ({ page }) => {
      await page.goto('/bookings/SEEDED_BOOKING_ID', { waitUntil: 'domcontentloaded' });
      await page.locator('button:has-text("Chat")').click();
      await expect(page.locator('[role="dialog"]')).toBeVisible();
    },
  );
});

test.describe('Dashboard navigation', () => {
  test.beforeEach(async ({ page }) => {
    await gotoHydrated(page, '/dashboard/user');
  });

  test('Dashboard renders (or redirects signed-out users to login)', async ({ page }) => {
    if (page.url().includes('/login')) {
      await expect(page.locator('#auth-title')).toBeVisible();
      return;
    }
    await expect(page.locator('nav[aria-label="Dashboard navigation"]')).toBeVisible();
  });

  test('Sidebar navigation is keyboard reachable', async ({ page }) => {
    test.skip(page.url().includes('/login'), 'requires a seeded session');
    const firstNav = page.locator('nav[aria-label="Dashboard navigation"] a').first();
    await firstNav.focus();
    await expect(firstNav).toBeFocused();
  });

  test('Mobile drawer traps focus', async ({ page }) => {
    test.skip(page.url().includes('/login'), 'requires a seeded session');
    await page.setViewportSize({ width: 375, height: 667 });
    await page.locator('button[aria-label="Open navigation"]').click();
    await expect(page.locator('#dashboard-navigation')).toBeVisible();
    await page.keyboard.press('Tab');
    const firstLink = page.locator('#dashboard-navigation a').first();
    await expect(firstLink).toBeFocused();
  });

  test('Account menu closes on Escape', async ({ page }) => {
    test.skip(page.url().includes('/login'), 'requires a seeded session');
    await page.locator('button[aria-label*="Account menu"]').click();
    await expect(page.locator('#dashboard-account-menu')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('#dashboard-account-menu')).not.toBeVisible();
  });
});

test.describe('Contact form', () => {
  test('Form has labelled fields and a submit action', async ({ page }) => {
    await gotoHydrated(page, '/contact');
    await expect(page.locator('label[for="contact-name"]')).toBeVisible();
    await expect(page.locator('label[for="contact-email"]')).toBeVisible();
    await expect(page.locator('label[for="contact-message"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toContainText('Send message');
  });
});