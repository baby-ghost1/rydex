import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
mkdirSync("sim-shots", { recursive: true });

const BASE = process.env.SIM_BASE_URL || "http://localhost:3100";
const browser = await chromium.launch();

const log = (...a) => console.log(...a);

// ---- Partner: go online ----
const partnerCtx = await browser.newContext({
  permissions: ["geolocation", "notifications"],
  geolocation: { latitude: 12.9719, longitude: 77.6412 },
});
const partner = await partnerCtx.newPage();
partner.on("pageerror", (e) => console.log("partner pageerror:", e.message));
await partner.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
await partner.locator("#auth-email").fill("partner@rydex.app");
await partner.locator("#auth-password").fill("Partner@12345");
await partner.locator('button[type="submit"]').click();
await partner.waitForURL(/\/dashboard/, { timeout: 45_000 });
await partner.goto(`${BASE}/dashboard/partner`, { waitUntil: "domcontentloaded" });
await partner.locator('button[aria-label="Go online"]').click();
await partner.getByText("You're online").first().waitFor({ timeout: 15_000 });
log("partner online");

// ---- Rider: book a car ----
const riderCtx = await browser.newContext();
const rider = await riderCtx.newPage();
rider.on("pageerror", (e) => console.log("rider pageerror:", e.message));
await rider.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
await rider.locator("#auth-email").fill("rider@rydex.app");
await rider.locator("#auth-password").fill("Rider@12345");
await rider.locator('button[type="submit"]').click();
await rider.waitForURL(/\/dashboard/, { timeout: 45_000 });

await rider.goto(
  `${BASE}/book?pickup=Indiranagar%2C%20Bengaluru%2C%20Karnataka&pickupLat=12.9719&pickupLng=77.6412&drop=Whitefield%2C%20Bengaluru%2C%20Karnataka&dropLat=12.9698&dropLng=77.7499&scheduled=0`,
  { waitUntil: "domcontentloaded" },
);
await rider.locator("text=First accept wins").waitFor({ timeout: 30_000 });
await rider.locator("button", { has: rider.locator("h2", { hasText: "Car" }) }).click();
await rider.waitForURL(/\/bookings\/[a-f0-9]{24}/, { timeout: 30_000 });
const bookingId = rider.url().match(/bookings\/([a-f0-9]{24})/)?.[1];
log("booking created:", bookingId);

// ---- Booking code visible on the ride page ----
await rider.waitForTimeout(1500);
const riderCode = (await rider.locator("p", { hasText: /^Booking / }).first().textContent())?.trim();
log("rider sees:", riderCode);
await rider.screenshot({ path: "sim-shots/code-rider.png", fullPage: false });

// ---- Partner accepts ----
await partner.goto(`${BASE}/dashboard/partner/requests`, { waitUntil: "domcontentloaded" });
const card = partner.locator("article", { hasText: "Indiranagar" }).first();
await card.waitFor({ timeout: 45_000 });
const partnerCode = (await card.locator("span", { hasText: /#RY/ }).first().textContent())?.trim();
log("partner sees:", partnerCode);
await card.getByRole("button", { name: "Accept ride" }).click();
await partner.waitForURL(new RegExp(`/bookings/${bookingId}`), { timeout: 20_000 });
log("partner redirected to ride page");

// ---- Partner ride page code ----
await partner.waitForTimeout(1200);
const pCode = (await partner.locator("p", { hasText: /^Booking / }).first().textContent())?.trim();
log("partner ride page sees:", pCode);

// ---- Chat both ways ----
await rider.locator("button", { hasText: "Chat" }).first().click();
await partner.locator("button", { hasText: "Chat" }).first().click();
await rider.waitForTimeout(700);
const riderChat = partner.locator("text=On my way").first();
await riderChat.waitFor({ timeout: 10_000 }).catch(() => {});
await rider.locator("textarea").first().fill("On my way");
await rider.locator("button[type='submit']").last().click();
await partner.waitForTimeout(1200);
const gotMsg = await partner.locator("text=On my way").first().isVisible().catch(() => false);
log("chat received by partner:", gotMsg);

// ---- Complete the ride ----
await partner.locator("button", { hasText: /Start ride|Start/i }).first().click().catch(() => {});
await partner.waitForTimeout(800);
const pickupOtp = await rider.locator("input").first().inputValue().catch(() => "");
log("pickup otp visible to rider:", pickupOtp);
if (pickupOtp) {
  const otpBoxes = partner.locator("input");
  const count = await otpBoxes.count();
  for (let i = 0; i < Math.min(4, count); i++) {
    await otpBoxes.nth(i).fill(pickupOtp[i] || "");
  }
  await partner.locator("button", { hasText: /Start ride|Verify/i }).first().click();
  await partner.waitForTimeout(1500);
}

// ---- Print receipt + filename ----
await partner.waitForTimeout(500);
const title = await partner.title();
log("document.title after load:", title);

await browser.close();
log("SIM-DONE", bookingId, riderCode, partnerCode, pCode);
