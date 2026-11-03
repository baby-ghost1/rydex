import { chromium } from "@playwright/test";
import { MongoClient, ObjectId } from "mongodb";
import { mkdirSync } from "node:fs";
mkdirSync("sim-shots", { recursive: true });

const BASE = process.env.SIM_BASE_URL || "http://localhost:3100";
const BOOKING = process.argv[2];
const log = (...a) => console.log(...a);

const browser = await chromium.launch();

// Complete the ride through the API as the partner (using the browser session cookie).
const ctx = await browser.newContext({ viewport: { width: 794, height: 1123 } });
const partner = await ctx.newPage();
partner.on("pageerror", (e) => console.log("partner pageerror:", e.message));
await partner.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
await partner.locator("#auth-email").fill("partner@rydex.app");
await partner.locator("#auth-password").fill("Partner@12345");
await partner.locator('button[type="submit"]').click();
await partner.waitForURL(/\/dashboard/, { timeout: 45_000 });

const mongo = new MongoClient("mongodb://127.0.0.1:27017");
await mongo.connect();
const db = mongo.db("rydex");
const oid = new ObjectId(BOOKING);

async function patch(body) {
  return partner.evaluate(async ([id, payload]) => {
    const res = await fetch(`/api/bookings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return { status: res.status, body: await res.text() };
  }, [BOOKING, body]);
}

let doc = await db.collection("bookings").findOne({ _id: oid });
log("status:", doc.status, "code:", doc.bookingCode);

if (doc.status === "accepted" || doc.status === "arrived") {
  const pickup = doc.pickupOtpCode || doc.pickupOtpHash;
  log("start ->", JSON.stringify(await patch({ status: "started", otp: pickup })));
}

doc = await db.collection("bookings").findOne({ _id: oid });
if (doc.status === "started") {
  const drop = doc.dropOtpCode || doc.dropOtpHash;
  log("complete ->", JSON.stringify(await patch({ status: "completed", otp: drop })));
}

doc = await db.collection("bookings").findOne({ _id: oid });
log("final status:", doc.status, "code:", doc.bookingCode);
await mongo.close();

// Rider: print receipt and verify the file name.
const riderCtx = await browser.newContext({ viewport: { width: 794, height: 1123 } });
const rider = await riderCtx.newPage();
rider.on("pageerror", (e) => console.log("rider pageerror:", e.message));
await rider.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
await rider.locator("#auth-email").fill("rider@rydex.app");
await rider.locator("#auth-password").fill("Rider@12345");
await rider.locator('button[type="submit"]').click();
await rider.waitForURL(/\/dashboard/, { timeout: 45_000 });
await rider.goto(`${BASE}/bookings/${BOOKING}`, { waitUntil: "domcontentloaded" });
await rider.waitForTimeout(3500);

log("ride page code:", (await rider.locator("p", { hasText: /^Booking / }).first().textContent())?.trim());
log("document.title (normal):", await rider.title());

await rider.evaluate(() => {
  window.__printedTitle = null;
  window.print = () => {
    window.__printedTitle = document.title;
  };
});
await rider.locator("button", { hasText: "Print receipt" }).first().click();
await rider.waitForTimeout(600);
log("document.title during print:", await rider.evaluate(() => window.__printedTitle));
log("document.title after print (restored):", await rider.title());

await rider.emulateMedia({ media: "print" });
await rider.waitForTimeout(500);
await rider.screenshot({ path: "sim-shots/receipt-code.png", fullPage: true });
log("print screenshot saved");

await browser.close();
log("SIM-DONE");
