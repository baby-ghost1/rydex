# Reference comparison

This document maps the delivered RYDEX build to the source series, records what was intentionally kept, what was extended, and where the implementation deliberately differs.

## 1. Sources

| Part | Video | Focus | Source URL |
| --- | --- | --- | --- |
| 1 | *Build Vehicle Booking Website - Live Map Tracking + Video KYC - Next.js + MongoDB + ZEGOCLOUD* | Project foundation, cinematic home page, navigation, vehicle categories, auth and database setup | <https://youtu.be/-SyETcbYFC4> |
| 2 | *Part 2 - Map Tracking + Video KYC - Next.js + MongoDB + ZEGOCLOUD* | Partner onboarding, admin approval, partner dashboard | <https://youtu.be/hMQdreOTHJ0> |
| 3 | *Part 3 - Map Tracking + Video KYC - Next.js + MongoDB + ZEGOCLOUD* | Rider search, vehicle selection, booking and checkout | <https://youtu.be/buyWEYAe7Ck> |
| 4 | *Part 4 - Map Tracking + Deployment - Next.js* | Live tracking, chat, payments, OTP, KYC review, admin commission, Vercel deployment | <https://youtu.be/2t4ccCcxExU> |

### Method

1. The recordings were reviewed end to end; Parts 1, 3 and 4 also have local transcript artifacts used for feature-level cross-checking.
2. Part 2 has no retained transcript file. Its scope was confirmed from the recording, the part title, and the recaps in Parts 3 and 4 (partner application → admin review → partner dashboard).
3. Each demonstrated capability was turned into an implementation checklist covering UI, API, database state and edge cases.
4. The finished app was exercised in a browser against seeded and fresh accounts; the verification record is in [TESTING.md](TESTING.md).
5. Screenshots and original brand/hero assets were used to reproduce the visual language, not to copy code or assets from the videos.

## 2. Part-by-part comparison

### Part 1 - Foundation, home page and auth

**Shown in the source**

- A dark, animated vehicle-booking landing page with a floating navigation bar and hero.
- Vehicle categories (bike, car, auto, loading, truck) and a featured fleet.
- Login/register entry points and a general project setup with Next.js, MongoDB and future Razorpay/ZEGOCLOUD integration.
- The feature promise: live road-map tracking, pickup/drop OTP verification and video KYC.

**Delivered**

- A dark cinematic home at `/` with the recovered RYDEX logo and hero image, floating pill navigation, lime accents, animated sections, category cards, featured fleet, how-it-works, partner earnings, FAQ and footer.
- All five categories are real filters into `/fleet` and `/book`.
- Auth modal plus dedicated `/login`, `/forgot-password` and `/verify-email` pages.
- Email/password registration with a six-digit email OTP, resend, Google OAuth (when configured), password reset and role switching.
- Auth.js v5 credentials + Google, bcrypt password hashing, JWT sessions refreshed from MongoDB, server-side dashboard guards.
- MongoDB/Mongoose models for users, vehicles, bookings and contact messages.
- The three headline features (live tracking, OTPs and video KYC) are implemented end to end rather than left as placeholders.

**Verdict:** foundation and home experience reproduced and completed; authentication and database work go beyond the partially built state shown in the video.

### Part 2 - Partner onboarding, admin approval and partner dashboard

**Shown in the source**

- A multi-step partner application covering business/vehicle details, documents, bank details, video KYC and pricing.
- An admin review flow to approve or reject partners.
- A partner workspace for requests, rides, fleet and earnings.

**Delivered**

- Six-step onboarding wizard: vehicle, documents, payout, video KYC, pricing, review.
- Draft saving, completion tracking, submission lock, rejection reasons and resubmission.
- Payout account numbers encrypted with AES-256-GCM; only the last four digits are returned to the client.
- Live KYC through ZEGOCLOUD token04 and the Prebuilt UIKit, with a recorded-video fallback.
- Admin vendor list with status tabs, counts, search, pagination and empty states.
- Admin review screen with documents, KYC evidence, vehicle draft, pricing and metrics.
- Approve/reject with email and realtime notifications; rejection can require a fresh video KYC and clears old evidence.
- Approval publishes all owner vehicles; rejection unpublishes them.
- Partner dashboard with pending requests, active rides, completed trips, net earnings, fleet size and rating.
- Fleet CRUD with availability toggles, accept/reject, arrived → started → completed, and OTP-gated transitions.
- Earnings ledger with range filters, monthly trend, payment split, trip rows, CSV export and encrypted payout updates.

**Verdict:** the full partner lifecycle shown across Parts 2-4 is implemented, including the admin decision paths and the KYC reset edge case.

### Part 3 - Rider search, booking and checkout

**Shown in the source**

- Vehicle browsing and category filters.
- Pickup/drop selection with maps and a route/fare estimate.
- Date/time selection, vehicle selection and a checkout/payment step.
- A rider bookings view.

**Delivered**

- Fleet browser with category, max price, text search, sorting and pagination.
- `/book` search page with location autocomplete (Geoapify or Nominatim), map picker, date/time, category tabs and a server-backed fare estimate.
- Vehicle detail and checkout with route map, distance, duration, fare breakdown, cash or online payment.
- Server-authoritative route and fare recalculation using OSRM with a haversine estimate fallback.
- Booking creation, partner notification, rider/partner emails and pickup OTP generation.
- Razorpay order creation and signature/capture verification when configured; cash works without keys.
- Rider dashboard, `/bookings` list with filters/search, and a booking detail page with status, map, chat, OTP actions, cancellation, rating and payment state.
- Booking and vehicle ownership checks so a rider cannot book or view another rider's data.

**Verdict:** the rider journey is complete, including the payment-disabled fallback and the post-booking management screens.

### Part 4 - Tracking, chat, OTP, KYC review and deployment

**Shown in the source**

- Live partner location on a map and realtime booking updates.
- In-ride chat.
- Pickup/drop OTP verification.
- Online payment with Razorpay and a 10% platform commission / 90% partner share.
- Admin KYC review and partner approval.
- Deployment to Vercel.

**Delivered**

- A standalone Socket.IO process with signed one-hour tokens, user/booking rooms and realtime events for new requests, status changes, location, chat, partner review and applications.
- Signed socket URL flow (`/api/socket/token`) and a secret-protected `/emit` endpoint.
- Polling fallback when realtime is unavailable.
- In-ride chat persisted in the booking, with rate limiting and participant checks.
- Pickup OTP hashed at creation; drop OTP generated and emailed only after a valid pickup code.
- Rating after completion, with a rolling vehicle average.
- Razorpay order/verify/refund logic and a fixed 10% platform fee / 90% partner earning, stored per booking.
- ZEGOCLOUD token04 generation and KYC review/reset on the admin side.
- Deployment documentation for Vercel + a separate Socket.IO host + MongoDB Atlas, plus environment and security checklists.
- Extra production work not shown in the videos: automated tests, encrypted payout data, rate limiting, validation, upload MIME/size checks, responsive verification, error/empty/loading states, and a production admin bootstrap script.

**Verdict:** all Part 4 features are implemented. Deployment is documented rather than performed against a personal Vercel account, because the repository must stay portable.

## 3. Feature coverage matrix

Status key: **Implemented** = matches the demonstrated feature; **Extended** = implemented with additional production behavior; **Adapted** = same goal with a different integration choice; **N/A** = not part of the delivered scope.

### Public site and identity

| Capability | Source | Status | Notes |
| --- | --- | --- | --- |
| Dark animated home page | Part 1 | Extended | Rebuilt with recovered brand/hero assets; responsive and accessible anchors |
| Floating pill nav | Part 1 | Implemented | Mobile drawer, signed-in dashboard/sign-out states |
| Vehicle categories | Part 1 | Extended | Real filters, wrapping mobile tabs, icons and category images |
| Featured fleet | Part 1 | Extended | Live approved vehicles, ratings, prices, links |
| How it works / partner pitch / FAQ | Part 1 | Implemented | Home sections plus anchored navigation |
| Login / register | Part 1 | Extended | Auth.js, OTP email verification, Google OAuth, role-aware redirects |
| Password reset | Part 1+ | Extended | Forgot/reset OTP flow (not fully shown in the source) |
| Profile and avatar | Part 1+ | Extended | Name/phone/avatar updates with URL validation |
| Role switch rider/partner | Part 2+ | Extended | One account, onboarding-aware routing |
| Contact and legal pages | Part 1+ | Extended | Contact form persisted/emailed; terms and privacy pages |

### Rider journey

| Capability | Source | Status | Notes |
| --- | --- | --- | --- |
| Fleet browsing and filters | Part 3 | Extended | Category, price, search, sort, pagination |
| Pickup/drop search and map | Part 3 | Implemented | Geoapify/Nominatim, Leaflet/OSM |
| Distance and fare estimate | Part 3 | Extended | OSRM + shared server/client fare math |
| Date/time and vehicle selection | Part 3 | Implemented | Future-ride validation and availability checks |
| Checkout and payment choice | Part 3 | Extended | Cash + Razorpay, disabled state when unconfigured |
| Booking list and detail | Part 3 | Extended | Status filters, exact ID search, route map |
| Live partner tracking | Part 4 | Extended | Socket + polling fallback |
| In-ride chat | Part 4 | Implemented | Persisted messages, participant checks |
| Pickup/drop OTP | Part 1/4 | Implemented | Hashed codes, emailed, state-gated |
| Cancellation and refund | Part 4 | Extended | Eligible states, Razorpay refund attempt |
| Rating and review | Part 4+ | Extended | One rating per completed ride; vehicle average |

### Partner journey

| Capability | Source | Status | Notes |
| --- | --- | --- | --- |
| Business/vehicle onboarding | Part 2 | Extended | Draft saving, six steps, resubmission |
| Document uploads | Part 2 | Extended | DL/RC/insurance (+ permit), Cloudinary or local dev |
| Bank/payout details | Part 2 | Extended | AES-256-GCM encryption, last4-only responses |
| Video KYC | Part 1/2/4 | Implemented | ZEGOCLOUD token04 + UIKit; recorded fallback |
| Pricing setup | Part 2 | Implemented | Per km/base/hour/minimum/waiting |
| Application review | Part 2 | Extended | Approve/reject, reason, email, socket, KYC reset |
| Partner dashboard | Part 2 | Extended | Requests, active rides, completed, earnings, rating |
| Ride requests | Part 2 | Implemented | Accept/reject with reason and notifications |
| Ride progression | Part 2/4 | Extended | Arrived → started → completed with OTP guards |
| Fleet management | Part 2 | Extended | Add/edit/delete, availability, filters |
| Earnings ledger | Part 2/4 | Extended | Range filters, monthly trend, CSV, payment split |
| Payout account updates | Part 2/4 | Extended | Confirmation match, encryption, last4 |

### Admin and platform

| Capability | Source | Status | Notes |
| --- | --- | --- | --- |
| Admin marketplace overview | Part 4 | Extended | Revenue, bookings, vendors, vehicles, signup trend |
| Vendor review list/detail | Part 2/4 | Extended | Tabs, search, pagination, empty states |
| Approve/reject partner | Part 2/4 | Extended | Vehicle publish/unpublish, email + socket |
| KYC review | Part 4 | Extended | Evidence view; optional forced re-verification |
| All-bookings console | Part 4 | Extended | Status tabs, search, pagination, fee breakdown |
| Commission split | Part 4 | Implemented | 10% platform / 90% partner, stored per booking |
| Live map | Part 1/4 | Adapted | Leaflet + OpenStreetMap + OSRM (not Google Maps) |
| Chat | Part 4 | Implemented | Socket + persisted history |
| Razorpay payments | Part 1/4 | Implemented | Order, signature/capture verification, refund |
| ZEGOCLOUD video KYC | Part 1/4 | Implemented | Official token04 algorithm |
| Deployment | Part 4 | Extended | Vercel + separate socket + Atlas, with full docs |
| Realtime | Part 4 | Extended | Signed tokens, rooms, internal-secret emit, polling fallback |

### Engineering additions not demonstrated in the videos

| Addition | Why it matters |
| --- | --- |
| Server-side fare/route recalculation | The client cannot alter the price |
| Zod validation on mutating APIs | Prevents malformed/unsafe data |
| Role/ownership checks on every resource | Prevents horizontal/vertical privilege escalation |
| AES-256-GCM payout encryption | Protects sensitive bank data at rest |
| OTP hashing + production leakage guard | Codes are never stored or returned in production |
| Rate limiting | Slows brute force, spam and geocoding abuse |
| Automated unit tests (62) | Protects money, auth and token logic |
| Responsive verification | 390px mobile is a first-class target |
| Docs set (architecture/env/deploy/test/reference) | Reproducible setup and operation |
| npm-workspaces monorepo (`frontend` / `backend` / `shared`) | Clear server/client boundaries and reusable server code |
| Admin bootstrap script | Production does not depend on demo data |
| Local fallbacks for email/uploads/maps/payments/KYC | Development works without paid credentials |
| Graceful empty/loading/error states | Dashboard UX is usable with sparse data |

## 4. Fidelity decisions

### Kept from the source

- Next.js App Router with TypeScript.
- MongoDB with Mongoose.
- Dark, animated marketing home and the RYDEX visual identity.
- Vehicle categories: bike, car, auto, loading, truck.
- Auth.js-style authentication with Google and credentials.
- Socket.IO realtime tracking and chat.
- Razorpay payment flow with a platform commission.
- ZEGOCLOUD video KYC with admin review.
- Partner onboarding and admin approval.
- Vercel-oriented deployment model (with a separate realtime process).
- Leaflet-based maps and OTP-verified rides.

### Rebuilt or extended

- **Design system:** the original look was recreated with Tailwind v4 tokens and custom components; it is intentionally inspired by, not pixel-identical to, the video.
- **Data model:** production-oriented schemas, indexes, select:false secrets and embedded snapshots.
- **Onboarding:** six explicit steps with draft save, completion checks and resubmission.
- **Admin review:** explicit KYC revocation on rejection, vehicle publish/unpublish, audit-friendly timestamps.
- **Money:** shared fare module, integer rupees, 90/10 split, per-booking snapshots, refund attempts.
- **Realtime:** signed short-lived tokens, private rooms, internal-secret emit, polling fallback.
- **Security:** bcrypt, hashed OTPs, encrypted payout data, validation, rate limits and role/ownership checks.
- **Operations:** env template, docs, admin bootstrap, seed, tests and deployment checklists.

### Deliberate differences and limitations

| Area | Difference | Reason |
| --- | --- | --- |
| Copy language | English product copy and docs | Required for this delivery; the source is Hindi |
| Visual fidelity | Recreated layout, not a frame-by-frame clone | Keeps the code maintainable and uses recovered assets |
| Maps | Leaflet + OpenStreetMap + OSRM | Open, no Google Maps key requirement |
| Payments | Razorpay order/verify/refund, **no webhook** | Matches the demonstrated browser flow; webhooks are a production hardening step |
| Email | Gmail SMTP or dev outbox | Simple setup; transactional provider recommended at scale |
| Uploads | Cloudinary in production, local dev fallback | Serverless-safe and demo-friendly |
| Rate limiting | In-process memory | Simple and dependency-free; Redis needed for multi-instance strict limits |
| Realtime hosting | Separate Socket.IO service | Vercel cannot host persistent WebSockets |
| KYC | ZEGOCLOUD when configured; recorded fallback | Keeps onboarding usable without paid credentials |
| Commission | Fixed 10% / 90% | Matches the video; no admin commission settings UI |
| Demo data | Seeded accounts and vehicles | Reproducible tours; must not be used in production |
| Notifications | Email + in-app realtime | No SMS/push provider |
| Native app | None | Web-first delivery |
| Coupons/wallet | Not implemented | Not part of the confirmed source scope |
| Driver assignment | Vehicle owner is the partner | Matches the owner-partner model shown |
| Analytics | Dashboard aggregates only | No third-party product analytics |

## 5. How to verify each part locally

```bash
npm run seed
npm run dev
```

### Part 1 - Home and auth

1. Open <http://localhost:3000>; check the hero, categories, featured fleet, how-it-works, pricing, FAQ, footer and mobile nav.
2. Register a new rider; read the OTP from `frontend/.mail-outbox/mail.log` or the development prompt; verify.
3. Sign in, update the profile, sign out.
4. Try the forgot-password flow end to end.

### Part 2 - Partner onboarding and admin review

1. Sign in as `partner@rydex.app / Partner@12345` or create a fresh account and switch to partner mode.
2. Walk through all six onboarding steps; save a draft, refresh, and confirm progress.
3. Submit; sign in as `admin@rydex.app / Admin@12345`; open **Vendors** and review the application.
4. Reject with a reason, optionally tick **Require a fresh video KYC**, then have the partner edit/resubmit.
5. Approve; confirm the partner dashboard unlocks and the vehicle is public in `/fleet`.
6. Add/edit/delete a vehicle, toggle availability, accept a request and move it through the ride states.
7. Open earnings, export CSV, update payout details and confirm only last4 is shown.

### Part 3 - Rider booking

1. Search from the home widget or `/book`.
2. Pick a category, vehicle, pickup/drop, date/time and cash payment.
3. Confirm the fare breakdown and create the booking.
4. Open `/bookings`, filter/search, open the detail page and cancel or continue the ride.

### Part 4 - Tracking, OTP, chat and deployment

1. As the partner, accept the booking; as the rider, watch the status update.
2. Send chat messages from both sides.
3. Start with the pickup OTP; the drop OTP is emailed. Complete with the drop OTP.
4. Rate the trip.
5. Review KYC evidence and the commission breakdown in the admin console.
6. Follow [DEPLOYMENT.md](DEPLOYMENT.md) for Vercel + socket + Atlas.

## 6. Verdict

The delivered app covers every confirmed feature from the four videos:

- The cinematic public site and authentication.
- Rider search, booking, checkout, payments and bookings management.
- Partner onboarding, admin approval, fleet, ride lifecycle and earnings.
- Live tracking, chat, pickup/drop OTPs, video KYC and the 90/10 commission.
- Realtime updates, responsive layouts and deployment guidance.

It also adds production-oriented work the videos do not cover: server-authoritative pricing, encrypted payout data, role/ownership enforcement, validation, rate limiting, automated tests, a documented environment, a production admin bootstrap and a reusable deployment runbook.

The main intentional gaps are the absence of a Razorpay webhook, Redis-backed distributed rate limits, a committed browser E2E project, SMS/push notifications and pixel-perfect visual cloning. These are documented in [ARCHITECTURE.md](ARCHITECTURE.md#14-security-model), [TESTING.md](TESTING.md#9-known-gaps) and this comparison rather than hidden behind demo-only behavior.
