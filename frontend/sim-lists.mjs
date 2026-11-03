import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
mkdirSync("sim-shots", { recursive: true });

const BASE = process.env.SIM_BASE_URL || "http://localhost:3100";
const browser = await chromium.launch();
const log = (...a) => console.log(...a);

async function login(email, password) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.log(`${email} pageerror:`, e.message));
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  await page.locator("#auth-email").fill(email);
  await page.locator("#auth-password").fill(password);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/\/dashboard/, { timeout: 45_000 });
  return { ctx, page };
}

const codeLocator = (page) => page.locator("span").filter({ hasText: /^#RY\d{14}[A-Z0-9]{4}$/ });

// Rider bookings list
const rider = await login("rider@rydex.app", "Rider@12345");
await rider.page.goto(`${BASE}/bookings`, { waitUntil: "domcontentloaded" });
await rider.page.waitForTimeout(2500);
const riderCodes = await rider.page.locator("span", { hasText: /#RY\d{14}/ }).allTextContents();
log("rider bookings list codes:", riderCodes);
await rider.page.screenshot({ path: "sim-shots/list-rider.png", fullPage: false });

// Admin bookings list
const admin = await login("admin@rydex.app", "Admin@12345");
await admin.page.goto(`${BASE}/dashboard/admin/bookings`, { waitUntil: "domcontentloaded" });
await admin.page.waitForTimeout(3000);
const adminCodes = await codeLocator(admin.page).allTextContents();
log("admin bookings list codes:", adminCodes.slice(0, 6));
await admin.page.screenshot({ path: "sim-shots/list-admin.png", fullPage: false });

// Admin overview
await admin.page.goto(`${BASE}/dashboard/admin`, { waitUntil: "domcontentloaded" });
await admin.page.waitForTimeout(2500);
const adminOverviewCodes = await codeLocator(admin.page).allTextContents();
log("admin overview codes:", adminOverviewCodes.slice(0, 6));

// Partner rides
const partner = await login("partner@rydex.app", "Partner@12345");
await partner.page.goto(`${BASE}/dashboard/partner/rides`, { waitUntil: "domcontentloaded" });
await partner.page.waitForTimeout(3000);
const partnerCodes = await codeLocator(partner.page).allTextContents();
log("partner rides codes:", partnerCodes.slice(0, 6));
await partner.page.screenshot({ path: "sim-shots/list-partner.png", fullPage: false });

// Search by code (without the hash) in admin
await admin.page.goto(`${BASE}/dashboard/admin/bookings`, { waitUntil: "domcontentloaded" });
await admin.page.waitForTimeout(2500);
const search = admin.page.locator('input[type="search"], input[placeholder*="Search" i]').first();
await search.fill("RY03112026192138R9XV");
await admin.page.waitForTimeout(2500);
const searchCodes = await codeLocator(admin.page).allTextContents();
log("search 'RY03112026192138R9XV' ->", searchCodes.slice(0, 6));

// Search by code (with the hash)
await search.fill("#RY03112026192138R9XV");
await admin.page.waitForTimeout(2500);
const searchCodesHash = await codeLocator(admin.page).allTextContents();
log("search '#RY03112026192138R9XV' ->", searchCodesHash.slice(0, 6));

await browser.close();
log("SIM-DONE");
