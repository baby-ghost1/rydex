# Testing

RYDEX ships a focused automated suite for the pure logic that is easiest to get wrong (fares, validation, OTPs, encryption, tokens, pagination, rate limits) and a documented browser verification matrix for the full product flows. This guide covers both, plus the commands and cleanup needed to reproduce the checks locally.

## 1. Test strategy

| Layer | Tool | What it protects |
| --- | --- | --- |
| Type safety | `tsc --noEmit` | Contract drift across frontend, backend and shared modules |
| Lint | ESLint + Next.js rules | React/Next.js correctness and common bugs |
| Unit tests | Vitest 5 | Fare math, validation, OTP hashing, AES-GCM, socket tokens, ZEGO token04, pagination, rate-limit windows, formatting |
| Production build | `next build` | App Router boundaries, server/client imports, route compilation |
| Browser verification | Playwright + system Edge (manual/scripted) | Real auth, booking, onboarding, admin, payments, realtime, maps, mobile layouts |

The committed suite deliberately avoids a live database. The tested modules are pure or use in-memory state, so tests are fast and deterministic. Database-backed flows are verified in the browser against a seeded local MongoDB.

## 2. Commands

```bash
npm run typecheck    # TypeScript, no emit
npm run lint         # ESLint
npm test             # Vitest, single run
npm run test:watch   # Vitest watch mode
npm run build        # Production Next.js build
```

Recommended pre-push order:

```bash
npm run typecheck && npm run lint && npm test && npm run build
```

On Windows PowerShell, use `;` instead of `&&` or run the commands separately.

## 3. Automated suite

**62 tests across 9 files.**

| File | Tests | Coverage |
| --- | --- | --- |
| `shared/src/__tests__/fare.test.ts` | 9 | Base + distance + hourly time charges, 90/10 split, minimum fare, negative/NaN coercion, rounding, duration floor, symmetric distance estimate |
| `shared/src/__tests__/validation.test.ts` | 13 | Registration normalization/password rules/Indian phone, vehicle coercion and limits, booking dates/times/coordinates, partner IFSC/account/pricing, status enums, ratings, contact minimums |
| `shared/src/__tests__/utils.test.ts` | 8 | INR formatting, safe dates, initials/truncation, class joining, email shape, account masking, paise conversion, serialization, distance helpers |
| `backend/src/lib/__tests__/otp.test.ts` | 5 | Digit length, deterministic SHA-256 hashing, matching code only, malformed hash handling, future expiry |
| `backend/src/lib/__tests__/crypto.test.ts` | 5 | AES-256-GCM round-trip, random IV/ciphertext uniqueness, tamper detection, wrong-key failure, empty/legacy plaintext |
| `backend/src/lib/__tests__/socket.test.ts` | 7 | Sign/verify user token, booking scope, tampered user ID, malformed token, expiry, wrong secret, room names |
| `backend/src/lib/__tests__/zego.test.ts` | 5 | token04 payload shape, invalid app ID, missing user/duration, 32-character secret requirement, deterministic KYC room ID |
| `backend/src/lib/__tests__/pagination.test.ts` | 4 | Safe defaults, skip offset, clamping, invalid numbers |
| `backend/src/lib/__tests__/rate-limit.test.ts` | 6 | Limit enforcement, window reset, key isolation, forwarded IP, real IP fallback, local sentinel |

### What each suite proves

**Fare** - The server and client share `shared/src/fare.ts`. The tests pin the 10% platform fee and 90% partner share, minimum-fare behavior, integer rounding and defensive handling of bad input. This is the highest-risk money logic.

**Validation** - Every mutating endpoint parses a Zod schema. Tests assert normalization (lowercase email, uppercase IFSC/registration), password strength, Indian mobile format, future-date checks, coordinate coercion, partner pricing bounds and contact message limits.

**OTP** - Codes are generated with `crypto.randomInt`, hashed with SHA-256 and a secret pepper, and compared in constant time. Tests confirm the raw code is never embedded in the stored hash and malformed hashes fail closed.

**Crypto** - Payout account numbers are encrypted with AES-256-GCM. Tests confirm a fresh IV per value, authentication-tag tamper detection, wrong-key failure and safe handling of empty/legacy values. Only the last four digits are returned by APIs.

**Socket tokens** - Tokens are HMAC-SHA256 over `userId.bookingId.exp`. Tests cover tampering, malformed input, expiry, wrong secrets and room-name construction. This prevents a rider from subscribing to another booking.

**ZEGO token04** - Tests verify the official payload structure, input validation and the deterministic `rydex-kyc-<suffix>` room ID used by partners and admins.

**Pagination** - Query strings are user-controlled. Tests confirm defaults, clamping, offset math and invalid-number handling, guarding against `NaN` skips/limits.

**Rate limits** - Tests verify the in-memory bucket behavior and IP extraction. This does **not** prove distributed limits; see the production caveat below.

### Test configuration

`vitest.config.mts`:

```ts
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const resolveFromRoot = (relativePath: string) =>
  fileURLToPath(new URL(relativePath, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@rydex/backend": resolveFromRoot("./backend/src"),
      "@rydex/shared": resolveFromRoot("./shared/src"),
      "@": resolveFromRoot("./frontend/src"),
    },
  },
  test: {
    environment: "node",
    include: ["backend/src/**/*.test.ts", "shared/src/**/*.test.ts"],
    restoreMocks: true,
    clearMocks: true,
  },
});
```

The committed tests live in the `backend` and `shared` workspaces and import through the public workspace paths (`@rydex/backend/*`, `@rydex/shared/*`). They run in Node and automatically restore/clear mocks. There is no jsdom or component-renderer setup; UI behavior is covered in the browser matrix.

### Adding a test

1. Put the test next to the module under `__tests__` or name it `*.test.ts` inside `backend/src` or `shared/src`.
2. Import with `@rydex/backend/...` or `@rydex/shared/...` paths.
3. Keep it pure; do not require a running MongoDB or network.
4. Cover the failure path as well as the happy path (invalid input, expired token, tampered data).
5. Run `npm test`.

Example:

```ts
import { describe, expect, it } from "vitest";
import { calculateFare } from "@rydex/shared/fare";

describe("minimum fare", () => {
  it("never returns less than the configured minimum", () => {
    const fare = calculateFare({
      distanceKm: 0.2,
      durationMin: 2,
      baseFare: 10,
      pricePerKm: 10,
      pricePerHour: 60,
      minimumFare: 199,
    });
    expect(fare.total).toBe(199);
    expect(fare.partnerEarning + fare.platformFee).toBe(199);
  });
});
```

## 4. Browser verification matrix

The following flows were exercised against a seeded local environment using Playwright with system Microsoft Edge (`channel: "msedge"`), the Next.js dev server on `http://localhost:3000`, the Socket.IO server on `4001`, and local MongoDB on `27017`.

> The Playwright scripts were used as an external verification harness and are not committed as a test project. The committed suite is Vitest-only. The matrix below is the reproducibility record.

### 4.1 Public site and routing

| Check | Result |
| --- | --- |
| `/`, `/fleet`, `/book`, `/bookings`, `/contact`, `/terms`, `/privacy`, `/login`, `/forgot-password`, `/verify-email` load | All returned `200` |
| Internal links crawled (including dynamic `/book/:vehicleId` pages and category filters) | All returned `200` |
| Page titles and H1s are present and role-appropriate | Verified |
| Home anchors `#how-it-works`, `#pricing`, `#faq` clear the fixed nav | Verified after adding `scroll-mt-24`/`scroll-mt-32` |
| Unknown routes show the custom not-found page | Verified |
| Mobile `/terms`, `/privacy`, `/contact`, `/book`, `/bookings` horizontal overflow | `0px` on a 390px viewport |
| Mobile home category tabs show all five categories | Verified after wrapping the tab row |
| Mobile search card fits and input icons do not overlap placeholders | Verified after moving component classes to `@layer components` |
| Mobile dark nav is solid and shows Dashboard/Sign out when authenticated | Verified |
| Signed-in mobile menu navigates to the correct dashboard | Verified |
| Footer links and logo render on desktop/mobile | Verified |
| FAQ accordion opens/closes | Verified |

### 4.2 Authentication

| Check | Result |
| --- | --- |
| Rider registration with email/password | Verified |
| Six-digit email OTP verification | Verified |
| Resend OTP | Verified |
| Sign-in with the verified account | Verified |
| Sign-in blocked before verification (`EMAIL_NOT_VERIFIED`) | Verified |
| Google sign-in button hidden when unconfigured | Verified |
| Forgot-password sends OTP | Verified |
| Mismatch validation on the reset form | Verified |
| Reset succeeds; old password is rejected; new password signs in | Verified |
| Role switch rider ↔ partner | Verified |
| Session persists across navigation | Verified |

### 4.3 Rider flows

| Check | Result |
| --- | --- |
| Fleet category, price, search and sort filters | Verified |
| Vehicle detail and checkout | Verified |
| Pickup/drop location search and map selection | Verified |
| Server fare/distance estimate | Verified |
| Cash booking creation | Verified |
| Online payment disabled state when Razorpay is unconfigured | Verified |
| Booking appears in rider dashboard and `/bookings` | Verified |
| Partner accept updates the rider in realtime | Verified |
| Live map tiles and partner location updates | Verified |
| In-ride chat send/receive | Verified |
| Pickup OTP start and drop OTP completion | Verified |
| Cash booking marked paid on completion | Verified |
| Rating and review after completion | Verified |
| Cancellation of an eligible booking | Verified |
| Booking status tabs and exact booking-ID search | Verified |
| Rider profile phone update persists | Verified |
| Avatar upload and rendering | Verified |
| Unsafe image URL rejected (`422`) | Verified |
| Mobile rider dashboard/drawer | Verified, `0px` overflow |

### 4.4 Partner flows

A fresh E2E partner (`priya.e2e.851198@rydex.test`) was created to avoid demo state.

| Check | Result |
| --- | --- |
| Registration and OTP verification | Verified |
| Six onboarding steps: vehicle, documents, bank, KYC, pricing, review | Verified |
| Draft save and completion tracking | Verified |
| Application submission locks editing (`pending`) | Verified |
| Admin rejection without KYC reset | Verified |
| Partner edits and resubmits | Verified |
| Admin rejection with **Require a fresh video KYC** | Verified |
| Old KYC evidence cleared; new video required | Verified |
| Fresh video upload and resubmission | Verified |
| Admin approval publishes vehicles | Verified |
| Approved partner dashboard access | Verified |
| Public fleet lists the approved vehicle | Verified |
| Fleet add/edit/delete/availability | Verified |
| Accept/reject requests; arrived → started → completed | Verified |
| Live earnings from a completed trip | Verified |
| CSV export download | Verified |
| Payout update with confirmation mismatch blocked client-side | Verified |
| Payout update encrypts the number and returns only last4 | Verified |
| Partner overview fleet hint reflects live fleet count | Verified |

### 4.5 Admin flows

| Check | Result |
| --- | --- |
| Marketplace overview blocks (revenue, bookings, vendors, vehicles, signups) | Verified |
| Vendor status tabs: All, In review, Approved, Changes requested, Drafts | Verified with URL state |
| Vendor search and empty state | Verified |
| Vendor detail: documents, KYC, vehicle draft, pricing, metrics | Verified |
| Approve action and partner notification | Verified |
| Reject action with reason | Verified |
| Reject + reset KYC | Verified |
| Bookings console tabs and completed filter | Verified |
| Booking search by route/date/booking ID | Verified |
| Signed-in mobile admin navigation | Verified |

### 4.6 Platform integrations

| Check | Result |
| --- | --- |
| Socket server health | Verified |
| Signed socket token connection | Verified |
| Realtime booking updates and location | Verified |
| Chat over socket | Verified |
| Polling fallback when socket is unavailable | Verified by design and manual disconnects |
| OpenStreetMap tiles | Verified |
| Geo search/reverse (Geoapify or Nominatim) | Verified |
| Contact form stored and written to `frontend/.mail-outbox/mail.log` | Verified |
| Development OTP visible only when mail is unconfigured | Verified |
| Production OTP leakage guarded by `NODE_ENV` | Verified by code path and tests |
| Cloudinary fallback to local uploads in development | Verified |
| Razorpay disabled state with cash fallback | Verified |
| ZEGOCLOUD recorded-video fallback | Verified |

### 4.7 Visual sweep

Desktop (1440×1000) and mobile (390×844) screenshots were reviewed for:

- Home (desktop/mobile), nav menu, search widget, categories, featured fleet, FAQ, footer.
- Login, forgot password, verify email.
- Rider overview, bookings, booking detail, profile.
- Partner overview, requests, rides, fleet, earnings, onboarding.
- Admin overview, vendors, vendor detail, bookings.
- Legal, contact, fleet, booking pages on mobile.

No console errors, failed requests or horizontal overflow remained after the fixes listed below.

### 4.8 Fixes validated by the sweep

| Fix | Validation |
| --- | --- |
| Component CSS moved to `@layer components` | `pl-10`, `px-7`, `py-3.5` now override `.input`/`.btn` defaults; icons no longer overlap placeholders |
| Category tabs wrap on mobile | All five categories visible at 390px; no clipping |
| Mobile nav solid background | No transparency bleed over the hero |
| Signed-in mobile nav | Dashboard and Sign out exposed |
| Logo sizing/blend | Wordmark no longer looks duplicated against the dark nav |
| Anchor scroll margins | FAQ/pricing/how-it-works land below the fixed header |
| Partner fleet hint | Shows "Vehicles live on RYDEX" when fleet > 0 |
| Seed vehicle draft | Admin vendor detail shows a populated vehicle/pricing for seeded partners |
| Pagination NaN guard | Invalid page/limit values fall back safely |
| Production OTP guard | `devOtpField` returns `{}` in production |

## 5. Manual smoke test

For a quick release check, use the seeded demo data:

```bash
npm run seed
npm run dev
```

Then:

1. Sign in as `rider@rydex.app / Rider@12345`.
2. Book a car with cash for a future date.
3. Sign in as `partner@rydex.app / Partner@12345`; accept the request.
4. Back as rider, open the booking, start with the pickup OTP and complete with the drop OTP.
5. Sign in as `admin@rydex.app / Admin@12345`; confirm the booking appears in the admin console.
6. Open the partner earnings page and verify the completed trip is included.
7. Open `/api/config` and confirm the optional integrations match your env.

The seed prints the pending bike booking's pickup/drop OTPs (`1234` / `4321`) for convenience, but new bookings generate their own codes.

## 6. E2E data and cleanup

E2E runs create real users, vehicles, bookings, uploads and mail-outbox entries. The demo seed intentionally leaves unrelated accounts alone, so clean up E2E artifacts before a demo.

### Reset a local demo database

For a local or disposable database only:

```bash
mongosh "mongodb://127.0.0.1:27017/rydex" --eval "db.dropDatabase()"
npm run seed
```

PowerShell:

```powershell
mongosh "mongodb://127.0.0.1:27017/rydex" --eval "db.dropDatabase()"
npm run seed
```

### Remove a specific E2E account

```javascript
// mongosh "mongodb://127.0.0.1:27017/rydex"
const user = db.users.findOne({ email: "priya.e2e.851198@rydex.test" });
if (user) {
  db.bookings.deleteMany({ $or: [{ user: user._id }, { partner: user._id }] });
  db.vehicles.deleteMany({ owner: user._id });
  db.users.deleteOne({ _id: user._id });
}
```

### Files

- Remove generated files under `frontend/public/uploads` that are not part of the seed.
- Remove test exports such as `frontend/.mail-outbox/earnings-test.csv`.
- Trim `frontend/.mail-outbox/mail.log` if you need a clean outbox.
- Reset the rider avatar/phone through the profile UI or reseed the database.

`npm run seed` recreates the demo partners' vehicles, mirrors their primary vehicle into the onboarding draft, deletes the rider's bookings, and recreates one completed trip and one pending request. It does not delete arbitrary users.

## 7. Security verification

Run these checks against a staging build before launch:

| Check | Expected |
| --- | --- |
| Call a protected API without a session | `401` |
| Call an admin API as a rider | `403` |
| View another rider's booking by ID | `403` |
| Accept a booking as an unrelated partner | `403` |
| Update payout as a rider | `403` |
| Access `/dashboard/admin` as a rider | Redirect to `/dashboard` |
| Access partner pages while pending/rejected | Redirect to onboarding |
| Submit invalid booking coordinates/date | `422` |
| Submit an unsafe avatar URL | `422` |
| Upload an `.exe` or >10 MB file | Rejected |
| Tamper with a socket token | Connection rejected |
| Call `/emit` without the internal secret | `401` |
| Register/password-reset OTP response in production | No OTP field |
| Payout response | Only `accountNumberLast4`, never the full number |
| Trigger forgot-password for an unknown email | Generic success, no account enumeration |
| Rapidly repeat login/OTP/contact requests | `429` after the limit |

Automated tests cover the OTP, crypto, token and rate-limit primitives. The ownership and role checks are verified in the browser matrix and should be re-checked after changing handlers.

## 8. CI example

```yaml
name: ci

on:
  push:
    branches: [main]
  pull_request:

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run typecheck
      - run: npm run lint
      - run: npm test
      - run: npm run build
        env:
          AUTH_SECRET: ci-only-secret-change-me
          AUTH_URL: http://localhost:3000
          MONGODB_URI: mongodb://127.0.0.1:27017/rydex
```

Notes:

- The unit suite does not need MongoDB or external services.
- The build is configured with placeholder env values so Auth.js has a secret. Do not reuse them in production.
- Add a separate job for browser E2E if you commit a Playwright project and provision a disposable MongoDB/Atlas database.

## 9. Known gaps

- No committed component/UI tests. Layouts and flows are covered by the browser matrix, which is not a CI job.
- No database integration tests. Aggregation pipelines, indexes and race conditions (double accept, double rating) are verified manually.
- No load or concurrency testing. Multi-instance rate limits and Socket.IO scaling need a shared store/adapter.
- No Razorpay webhook tests. Verification uses the browser callback and signature; a production webhook should be tested separately.
- No email rendering snapshots. Templates are plain HTML and were checked in the dev outbox.
- No accessibility audit. Keyboard paths, focus traps and contrast should be checked with axe/Lighthouse before launch.
- Rate-limit tests validate the in-memory implementation only. Production multi-instance behavior depends on deployment topology.
