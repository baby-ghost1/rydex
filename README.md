# RYDEX - Multi-Vendor Vehicle Booking Platform

RYDEX is a full-stack, production-oriented multi-vendor vehicle booking build. Yeh app riders ko verified local vehicle owners ke saath connect karta hai bikes, cars, autos, loading vehicles aur trucks mein - live tracking, pickup/drop OTP verification, video KYC, real payments, partner earnings aur admin review console.

The application keeps the demonstrated stack (Next.js App Router, MongoDB, Auth.js, Socket.IO, Razorpay, Cloudinary, ZEGOCLOUD, Leaflet) aur ek real product ki tarah run karne ke liye required engineering work add karta hai: server-side authorization, encrypted payout details, rate limiting, validation, automated tests, responsive layouts aur deployment documentation.

---

## Contents

- [Feature tour](#feature-tour)
- [Demo accounts](#demo-accounts)
- [Stack](#stack)
- [Project structure](#project-structure)
- [Quick start](#quick-start)
- [Environment variables](#environment-variables)
- [Scripts](#scripts)
- [How the core flows work](#how-the-core-flows-work)
- [Testing](#testing)
- [Deployment](#deployment)
- [Security notes](#security-notes)
- [Known limitations](#known-limitations)
- [Documentation](#documentation)

---

## Feature tour

### Riders

- Cinematic, animated marketing site with vehicle categories, featured fleet, how-it-works, partner earnings, FAQ aur contact pages.
- Fleet browser with category, price, text search aur sorting filters.
- Route-aware booking: map picker, pickup/drop search, date aur time, OSRM distance aur fare estimate, cash ya online payment.
- Personal dashboard with upcoming rides, quick booking, completed-trip totals aur spend.
- Booking detail with live status, route map, partner location updates, in-ride chat, pickup/drop OTP verification, cancellation, payment state aur post-trip rating.
- Bookings list with status filters aur exact booking-ID search.
- Profile settings with avatar upload, phone/name updates aur session refresh.
- Email/password registration with a six-digit email OTP, resend, sign-in, Google OAuth when configured, aur ek full forgot/reset-password flow.
- Role switching between rider aur partner without creating a second account.

### Partners

- Six-step onboarding wizard: vehicle, documents, payout account, video KYC, pricing aur final review.
- Draft saving, step completion tracking, resubmission after changes, aur clear pending/rejected/approved states.
- Video KYC through a ZEGOCLOUD room when configured, ya a recorded-video upload fallback.
- Partner dashboard with ride requests, active rides, completed trips, net earnings aur fleet size.
- Accept/reject requests aur move a ride through arrived → started → completed, including OTP checks.
- Fleet management: add, edit, delete, aur toggle availability for every vehicle.
- Earnings ledger with range filters, gross/platform-fee/net breakdown, trip rows aur CSV export.
- Payout account updates validated aur encrypted; sirf last four digits hi client ko return hote hain.

### Admins

- Marketplace overview: revenue, gross bookings, active vendors, live vehicles, booking activity aur partner signups.
- Vendor network with status tabs, counts, search aur pagination.
- Vendor review screen with business details, documents, KYC evidence, vehicle draft, pricing aur metrics.
- Approve ya request changes; rejection can optionally revoke KYC evidence aur force a fresh video.
- Approval publishes the owner's vehicles aur sends email plus ek in-app realtime notification.
- All-bookings console with status tabs, search by route/date/booking ID, pagination aur fee breakdowns.

### Platform

- Realtime Socket.IO updates for new requests, booking status, partner location, chat, review results aur new applications.
- Signed, short-lived socket tokens aur ek internal-secret-protected emit endpoint.
- Graceful polling fallback if the Socket.IO process is unavailable.
- Gmail SMTP in production aur ek local `frontend/.mail-outbox/mail.log` fallback in development.
- Cloudinary uploads in production aur ek local `frontend/public/uploads` fallback in development, with MIME/size validation.
- Geoapify/Nominatim location search, OSRM routing aur OpenStreetMap tiles.
- Zod validation on every mutating endpoint, per-process rate limits on sensitive endpoints, aur role/ownership checks.
- Responsive desktop aur mobile layouts with a 256 px dashboard sidebar, mobile drawers aur zero-horizontal-overflow pages.

---

## Demo accounts

`npm run seed` creates these accounts with pre-approved partners, vehicles, completed trips aur ek live booking to exercise the full UI.

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@rydex.app` | `Admin@12345` |
| Rider | `rider@rydex.app` | `Rider@12345` |
| Partner - Velocity Rides | `partner@rydex.app` | `Partner@12345` |
| Partner - MetroWheels | `metro@rydex.app` | `Metro@12345` |
| Partner - CargoLine Logistics | `cargo@rydex.app` | `Cargo@12345` |

> **SECURITY WARNING**: These are demo credentials only. Change ALL passwords before deploying to production. The seed command is for demos and local development only.
> 
> In production, use `npm run create-admin` to create a production admin with secure credentials.
> Demo partners and users should register normally via the application.

---

## Stack

| Layer | Technology |
| --- | --- |
| Repository | npm workspaces monorepo (`frontend` (Next.js), `backend` (server-only), `shared` (isomorphic)) |
| Framework | Next.js 16.2 (App Router, React 19.2, TypeScript) |
| Styling | Tailwind CSS v4, custom RYDEX design tokens, `motion` animations, Lucide icons, Sonner toasts |
| Database | MongoDB with Mongoose 9 |
| Auth | Auth.js v5 (credentials + optional Google OAuth), bcrypt, JWT sessions |
| State | Redux Toolkit for the booking draft aur auth modal; local state for dashboards |
| Realtime | Standalone Socket.IO 4 server on port 4001, HMAC-signed tokens |
| Maps | Leaflet + react-leaflet, OpenStreetMap tiles, OSRM routing, Geoapify/Nominatim geocoding |
| Payments | Razorpay orders + signature verification; cash fallback |
| Uploads | Cloudinary; local uploads in development |
| Email | Nodemailer + Gmail app password; dev mail outbox |
| Video KYC | ZEGOCLOUD token04 + Prebuilt UIKit; recorded-video fallback |
| Tests | Vitest 5 (unit aur integration-style suites) |

---

## Project structure

```
rydex/                              # npm workspaces monorepo
├─ frontend/                        # Next.js app workspace
│  ├─ public/                       # Brand, hero, vehicle and icon assets
│  ├─ src/
│  │  ├─ app/                       # Routes: pages, layouts aur thin API adapters
│  │  │  ├─ api/                    # Re-export handlers from the backend workspace
│  │  │  ├─ dashboard/              # Rider, partner aur admin dashboards
│  │  │  ├─ book/ bookings/ fleet/  # Public booking journey
│  │  │  └─ login/ verify-email/    # Auth pages aur legal/contact pages
│  │  ├─ components/                # Public, booking aur dashboard components
│  │  ├─ hooks/                     # useBookingSocket
│  │  ├─ lib/                       # Typed fetch/upload helpers
│  │  └─ redux/                     # Store, hooks aur UI slice
│  ├─ next.config.ts                # Monorepo root, env loading, image hosts
│  └─ package.json
├─ backend/                         # Server-only workspace
│  ├─ src/
│  │  ├─ auth.ts                    # Auth.js configuration
│  │  ├─ http/routes/               # API handler implementations
│  │  ├─ lib/                       # DB, auth guards, crypto, OTP, email, socket, geo
│  │  ├─ env.ts                     # Loads the repository .env for standalone processes
│  │  ├─ models/                    # User, Vehicle, Booking, Contact schemas
│  │  ├─ scripts/seed.ts            # Demo data seed
│  │  ├─ scripts/create-admin.ts    # Production admin bootstrap
│  │  └─ socket/server.ts           # Standalone Socket.IO process
│  └─ package.json
├─ shared/                          # Isomorphic workspace
│  ├─ src/
│  │  ├─ constants.ts               # Categories, fare config, statuses
│  │  ├─ fare.ts                    # Fare and distance math
│  │  ├─ types/                     # Shared domain types aur Auth.js augmentation
│  │  ├─ utils.ts                   # INR/date/class helpers
│  │  ├─ validation.ts              # Zod schemas used by APIs aur forms
│  │  └─ __tests__/                 # Fare, validation aur utility tests
│  └─ package.json
├─ docs/                            # Architecture, environment, deployment, testing, comparison
├─ .env                             # Single local configuration file (ignored by Git)
├─ .env.example                     # Documented environment template
├─ package.json                     # Workspaces aur orchestration scripts
└─ vitest.config.mts                # Root test runner
```

`frontend` is a self-contained Next.js project, so Next-specific files (`public/`, `next.config.ts`, `next-env.d.ts`, `postcss.config.mjs`) live there. All server-only code lives in `backend`; domain types, Zod schemas aur fare math live in `shared`. Cross-workspace imports use `@rydex/backend/*` aur `@rydex/shared/*`, while `@/*` maps to `frontend/src/*` inside the app.

Next.js requires API route files under `frontend/src/app/api/**/route.ts`. They stay deliberately small aur re-export the handler from `backend/src/http/routes/**`:

```ts
// frontend/src/app/api/bookings/route.ts
export { GET, POST } from "@rydex/backend/http/routes/bookings/route";
```

### Layer boundaries

| Layer | May import | Must not import |
| --- | --- | --- |
| `shared/src` | Other `shared` modules | `frontend`, `backend`, `app` |
| `backend/src` | `@rydex/shared/*`, backend modules, Node APIs | `frontend` components, Redux |
| `frontend/src` | `@rydex/shared/*`, frontend modules, `next/navigation`, browser APIs | Backend models, secrets, Node-only modules |
| `frontend/src/app` | Pages import frontend components; route adapters import backend handlers | Business logic directly (keep adapters thin) |

The `frontend/src/app/api/**/route.ts` files are one ya two lines, for example:

```ts
// frontend/src/app/api/bookings/route.ts
export { GET, POST } from "@rydex/backend/http/routes/bookings/route";
```

This keeps Next.js HTTP routing conventions while the implementation lives in the backend folder. Next.js 16 passes route params as a promise; the backend handlers type them accordingly. `frontend/next.config.ts` sets `turbopack.root` aur `outputFileTracingRoot` to the monorepo root, adds both workspace packages to `transpilePackages`, aur loads the root `.env` explicitly.

---

## Quick start

### Prerequisites

- **Node.js 20.9+** aur npm 10+
- A MongoDB database - local MongoDB 7+ ya ek free MongoDB Atlas cluster
- Optional credentials for Google, Gmail, Cloudinary, Razorpay, ZEGOCLOUD aur Geoapify. Har optional service ka ek documented development fallback.

### 1. Install

```bash
npm install
```

Run this from the repository root. npm installs aur links all three workspaces (`@rydex/frontend`, `@rydex/backend`, `@rydex/shared`) aur the root tooling.

### 2. Configure

```bash
cp .env.example .env          # macOS/Linux
Copy-Item .env.example .env   # Windows PowerShell
```

Set the three required values:

```env
MONGODB_URI=mongodb://127.0.0.1:27017/rydex
AUTH_SECRET=<random 32-byte string>
AUTH_URL=http://localhost:3000
```

Generate a secret:

```bash
npx auth secret
# ya
openssl rand -base64 32
```

Keep a single `.env` at the repository root. `frontend/next.config.ts` loads it for the Next.js runtime with `@next/env`, aur `backend/src/lib/env.ts` loads it for the seed, admin bootstrap aur Socket.IO process. Do not create separate `frontend/.env` ya `backend/.env` copies.

### 3. Seed demo data

```bash
npm run seed
```

The seed is safe to re-run for demos: it upserts the demo accounts aur recreates their vehicles aur bookings.

### 4. Run web + realtime together

```bash
npm run dev
```

- Web: <http://localhost:3000>
- Socket health: <http://localhost:4001/health>

`npm run dev` starts both processes with `concurrently`. If you only need the web app, use `npm run dev:web`; realtime features tab `polling`. To run sirf the Socket.IO server, use `npm run dev:socket` ya `npm run socket`.

### 5. Sign in

Use ek account from [Demo accounts](#demo-accounts), ya create ek rider account. Development mein, verification aur reset OTPs are written to `frontend/.mail-outbox/mail.log` aur shown on screen when email is not configured.

---

## Environment variables

Only three variables are required locally: `MONGODB_URI`, `AUTH_SECRET` aur `AUTH_URL`. Everything else unlocks ek integration ya tunes development behavior.

| Variable | Required | Fallback / notes |
| --- | --- | --- |
| `MONGODB_URI` | Yes | Local MongoDB ya Atlas connection string |
| `AUTH_SECRET` | Yes | Auth.js JWT aur socket-token signing secret |
| `AUTH_URL` | Yes | Canonical URL; sirf emails, CORS aur share links use |

> **Secret rotation warning:** changing `AUTH_SECRET` invalidates sessions/socket tokens, aur **breaks** existing payout ciphertext. Re-encrypt ya re-enter payout details after rotation.

### Authentication

| Variable | Required | Behavior / fallback |
| --- | --- | --- |
| `AUTH_GOOGLE_ID` | No | Google OAuth client ID. The Google button is hidden unless both ID aur secret are set. |
| `AUTH_GOOGLE_SECRET` | No | Google OAuth client secret. |

Google setup:

1. Open Google Cloud Console → APIs & Services → Credentials.
2. Configure the OAuth consent screen (External is fine for testing; add test users).
3. Create an **OAuth client ID** of type **Web application**.
4. Add authorized JavaScript origins:
   - `http://localhost:3000`
   - `https://your-domain.com`
5. Add authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google`
   - `https://your-domain.com/api/auth/callback/google`
6. Copy the client ID aur secret into `AUTH_GOOGLE_ID` aur `AUTH_GOOGLE_SECRET`.
7. Restart the dev server. The Google button appears on login/register.

Google sign-in creates ek verified user automatically on first use. It does not create ek partner profile; the user can start onboarding from the dashboard.

### Email and OTP

| Variable | Required | Behavior / fallback |
| --- | --- | --- |
| `EMAIL_USER` | No | Gmail address used as the SMTP user. Without it, mail is written to `frontend/.mail-outbox/mail.log`. |
| `EMAIL_PASS` | No | Gmail **App Password** (not the normal account password). |
| `EMAIL_FROM` | No | Sender line. Defaults to `RYDEX <no-reply@rydex.app>`; the SMTP account still sends the message. |

Gmail setup:

1. Enable 2-Step Verification on the Google account.
2. Open <https://myaccount.google.com/apppasswords>.
3. Create ek app password for "Mail".
4. Set `EMAIL_USER` to the full Gmail address aur `EMAIL_PASS` to the 16-character app password.
5. Restart the app aur register ek test account.

Development behavior:

- Without credentials, OTPs aur notifications are appended to `frontend/.mail-outbox/mail.log`.
- The verification screens may show the development OTP when email is not configured.
- In production, OTPs are **never** returned to clients, even if SMTP is missing. Configure email before launching.

> Gmail SMTP is fine for demos aur low volume. Production mein, transactional provider use kar lo.

### Uploads (Cloudinary)

| Variable | Required | Behavior / fallback |
| --- | --- | --- |
| `CLOUDINARY_CLOUD_NAME` | Production: yes | Cloudinary cloud name. |
| `CLOUDINARY_API_KEY` | Production: yes | Cloudinary API key. |
| `CLOUDINARY_API_SECRET` | Production: yes | Cloudinary API secret. |

Setup:

1. Create ek Cloudinary account aur open the dashboard.
2. Copy **Cloud name**, **API Key** aur **API Secret** from the product environment.
3. Set all three variables.
4. Uploads go to the `rydex` folder using the correct resource type aur format allow-list.

Without Cloudinary:

- Development stores files in `frontend/public/uploads` aur returns `/uploads/<hash>.<ext>`.
- Production refuses local uploads aur asks for ek URL ya Cloudinary configuration. Yeh intentional hai: serverless filesystems are ephemeral.

### Payments (Razorpay)

| Variable | Required | Behavior / fallback |
| --- | --- | --- |
| `RAZORPAY_KEY_ID` | No | Razorpay key ID. Online payment is disabled when either key is missing. |
| `RAZORPAY_KEY_SECRET` | No | Razorpay key secret, used for order creation, signature verification aur refunds. |

Setup:

1. Create ek Razorpay account aur open **Settings → API Keys**.
2. Generate a **test** key pair for local development.
3. Set `RAZORPAY_KEY_ID` aur `RAZORPAY_KEY_SECRET`.
4. Enable the payment methods you want in the Razorpay dashboard (cards, UPI, netbanking, wallets).
5. Use Razorpay test cards/UPI IDs for checkout.

Behavior:

- Cash bookings work with ya without Razorpay.
- Online checkout is hidden/disabled with ek clear message when unconfigured.
- The key ID is returned from the server per order; no public Razorpay variable is required.
- Yahan sirf webhook wiring na hai. Payment is confirmed when the browser returns aur the server verifies the signature. If the browser closes mid-flow, reconcile in Razorpay dashboard; production mein, ek webhook add kar lo.
- Rejected/cancelled paid bookings trigger ek refund attempt.

### Video KYC (ZEGOCLOUD)

| Variable | Required | Behavior / fallback |
| --- | --- | --- |
| `NEXT_PUBLIC_ZEGO_APP_ID` | No | Numeric ZEGOCLOUD App ID. Must be available at build time. |
| `ZEGO_SERVER_SECRET` | No | Exactly 32 characters. Used to generate token04. Never expose to the browser. |

Setup:

1. <https://console.zegocloud.com/> par ek project bana lo.
2. Copy the **App ID** aur **Server Secret**.
3. Set `NEXT_PUBLIC_ZEGO_APP_ID` aur `ZEGO_SERVER_SECRET`.
4. Restart/redeploy the app. `NEXT_PUBLIC_*` values are baked in at build time.
5. Allow camera aur microphone access on the onboarding page. HTTPS (ya localhost) is required by browsers.

Without ZEGOCLOUD:

- The onboarding KYC step offers ek recorded video upload instead.
- Admins review the uploaded video URL.
- Live KYC endpoints return ek clear `503` with the fallback message.

### Geocoding and maps

| Variable | Required | Behavior / fallback |
| --- | --- | --- |
| `GEOAPIFY_KEY` | No | Server-side Geoapify key. Preferred for search. Falls back to Nominatim. |
| `NEXT_PUBLIC_DEFAULT_LAT` | No | Default map center latitude. Defaults to Bengaluru (`12.9716`). |
| `NEXT_PUBLIC_DEFAULT_LNG` | No | Default map center longitude. Defaults to `77.5946`. |

Details:

- Geoapify is optional. Nominatim aur OSRM public endpoints work without ek key but are shared community services with usage policies. Production traffic should use ek commercial geocoder aur ek self-hosted ya commercial OSRM instance.
- OpenStreetMap tiles are loaded directly by Leaflet. Keep the attribution intact aur follow the OSM tile usage policy.
- `NEXT_PUBLIC_DEFAULT_*` are baked in at build time.

### Realtime socket server

| Variable | Required | Behavior / fallback |
| --- | --- | --- |
| `NEXT_PUBLIC_SOCKET_URL` | Production: for realtime | Browser-facing Socket.IO URL, e.g. `https://socket.example.com`. Empty in production means no realtime client; polling continues to work. |
| `SOCKET_EMIT_URL` | Production: for realtime | Server-to-server base URL for `POST /emit`. Empty in production disables emits. Locally defaults to `http://127.0.0.1:4001`. |
| `SOCKET_INTERNAL_SECRET` | Production: yes | Shared secret for `/emit`, compared in constant time. Use ek long random value. Locally defaults to `rydex-socket-dev-secret`. |
| `SOCKET_PORT` | No | Socket server port. Defaults to `4001`. |

Setup:

1. Choose ek long random `SOCKET_INTERNAL_SECRET` aur use the same value on the web app aur socket service.
2. Ensure `AUTH_SECRET` is identical on both services; socket tokens are HMAC-signed with it.
3. Locally, `npm run dev` starts both. For separate terminals use `npm run dev:web` aur `npm run dev:socket`.
4. In production, deploy the socket server to ek host that supports persistent processes (Render, Railway, Fly.io, VPS). Point both URLs at it.
5. Verify `GET https://socket.example.com/health` returns `{ "ok": true, ... }`.

The socket server allows origins from `AUTH_URL` plus `http://localhost:3000` aur `http://127.0.0.1:3000`. For additional preview domains, update `src/backend/socket/server.ts` ya put the socket behind ek proxy that controls CORS.

### Demo seed

| Variable | Required | Behavior / fallback |
| --- | --- | --- |
| `SEED_ADMIN_EMAIL` | No | Admin email created by `npm run seed`. Defaults to `admin@rydex.app`. |
| `SEED_ADMIN_PASSWORD` | No | Admin password for the seed. Defaults to `Admin@12345`. |

The rider aur partner demo passwords are defined in `src/backend/scripts/seed.ts`. Either:

1. Modify the relevant entries in `src/backend/scripts/seed.ts` before seeding, ya
2. Sign in aur use **Forgot password** after configuring email, ya
3. Update the password hash directly in MongoDB with ek bcrypt hash generated by ek script.

For ek production launch, demo seed ko production database par na chalao. Set `ADMIN_EMAIL`, `ADMIN_PASSWORD` aur `ADMIN_NAME`, tab `npm run create-admin` chalao ek first production admin deliberately banayenge. Partners aur riders tab normal registration flow se signup kar sakte hain.

### Production admin bootstrap

| Variable | Required | Behavior |
| --- | --- | --- |
| `ADMIN_EMAIL` | Yes (script) | Email for the first production admin. Validated before the upsert. |
| `ADMIN_PASSWORD` | Yes (script) | New password, at least 8 characters. Hashed with bcrypt; never printed. |
| `ADMIN_NAME` | No | Display name. Defaults to `RYDEX Admin`. |

Run `npm run create-admin` with these variables to create ya update ek admin without seeding demo data. The script is safe to re-run to rotate the admin password. It does not create rider, partner ya demo accounts.

---

## Scripts

Run these from the repository root. Har ek script relevant workspace ko delegate karta hai.

| Command | What it does |
| --- | --- |
| `npm run dev` | Web + Socket.IO server together |
| `npm run dev:web` | Next.js dev server on port 3000 |
| `npm run dev:socket` | Socket.IO dev server with watch mode |
| `npm run build` | Production Next.js build |
| `npm run start` | Start the built Next.js app |
| `npm run socket` | Start the Socket.IO server without watch |
| `npm run seed` | Upsert demo accounts aur recreate demo vehicles/bookings |
| `npm run create-admin` | Create ya update ek admin from `ADMIN_EMAIL`, `ADMIN_PASSWORD` aur `ADMIN_NAME` |
| `npm run lint` | ESLint with the Next.js core-web-vitals aur TypeScript rules |
| `npm run typecheck` | TypeScript without emitting |
| `npm test` | Run all Vitest suites once |
| `npm run test:watch` | Vitest watch mode |

---

## How the core flows work

### Authentication

Auth.js v5 handles credentials aur Google sign-in. Credentials registration stores ek bcrypt password hash plus ek hashed six-digit OTP with ek expiry; the OTP is emailed aur never returned in production. Sessions are JWTs, but the session callback re-reads the user from MongoDB so role ya partner-status changes take effect without waiting for the token to expire. Dashboard pages use server-side guards, aur har API handler re-checks the current user.

### Booking lifecycle

1. Rider chooses ek vehicle, route, date/time aur payment method.
2. The backend recalculates fare aur distance server-side, creates the booking aur sends ek realtime request to the partner.
3. Partner accepts ya rejects. Accepted rides move through `arrived → started → completed`; either side can cancel according to the allowed transitions.
4. Pickup aur drop OTPs are stored as hashes. The rider shares the pickup code, tab the drop code, aur har verification is recorded.
5. Cash bookings are marked paid on completion. Online bookings create ek Razorpay order aur are sirf marked paid after the signature is verified.
6. Completed bookings feed partner earnings (90% partner / 10% platform) aur rider spend totals.

### Realtime

The standalone Socket.IO server authenticates each connection with ek one-hour HMAC token issued by `GET /api/socket/token`. Clients join ek private user room aur, on booking pages, the booking room. API routes emit through `SOCKET_EMIT_URL` with ek `x-socket-secret` header; the socket server validates it with ek timing-safe comparison. Realtime events drive request queues, status badges, live location markers aur chat. Polling remains active as ek fallback.

### Money

Fare math is shared between client preview aur server validation. Har booking stores the gross fare, distance/base/hour/minimum breakdown, platform fee aur partner earning. Payout account numbers are encrypted with AES-256-GCM at rest; responses expose sirf `accountNumberLast4`. Admin approval publishes vehicles; rejection can clear KYC evidence aur force a fresh video.

### External services without credentials

| Integration | Without credentials |
| --- | --- |
| Google OAuth | Button hidden |
| Gmail | OTPs aur notifications written to `frontend/.mail-outbox/mail.log`; `devOtp` can be shown in development only |
| Cloudinary | Files stored in `frontend/public/uploads` (development only) |
| Razorpay | Online payment disabled with ek clear message; cash works |
| ZEGOCLOUD | Recorded video upload fallback for KYC |
| Geoapify | Nominatim search aur OpenStreetMap tiles |
| Socket.IO | Dashboard polling fallback |

---

## Testing

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

The Vitest suite covers fare math aur formatting, validation schemas, OTP generation/hashing, AES-256-GCM encryption, in-memory rate-limit windows, signed socket tokens, ZEGOCLOUD token04 generation aur pagination. The full browser verification record (rider, partner onboarding, admin review, payments, realtime, mobile) is documented in [docs/TESTING.md](docs/TESTING.md).

---

## Deployment

RYDEX deploys as three pieces:

1. **Next.js web app** - Vercel (ya any Node 20.9+ host).
2. **Socket.IO process** - Render, Railway, Fly.io ya ek small VPS. Vercel cannot host ek persistent Socket.IO server.
3. **MongoDB Atlas** - plus Cloudinary, Gmail, Razorpay aur ZEGOCLOUD credentials as needed.

**On Vercel, set the project Root Directory to `frontend` and keep the Include source files outside of the Root Directory in the Build Step option enabled.** Vercel detects the npm workspace, installs from the repository root, aur the frontend `build` script compiles the Next.js app with `backend` aur `shared` available.

The short version:

```env
# Vercel
MONGODB_URI=...
AUTH_SECRET=...
AUTH_URL=https://your-domain.com
NEXT_PUBLIC_SOCKET_URL=https://your-socket-service.example.com
SOCKET_EMIT_URL=https://your-socket-service.example.com
SOCKET_INTERNAL_SECRET=...
SOCKET_PORT=4001
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
EMAIL_USER=...
EMAIL_PASS=...
EMAIL_FROM=RYDEX <no-reply@example.com>
AUTH_GOOGLE_ID=...
AUTH_GOOGLE_SECRET=...
RAZORPAY_KEY_ID=...
RAZORPAY_KEY_SECRET=...
NEXT_PUBLIC_ZEGO_APP_ID=...
ZEGO_SERVER_SECRET=...
GEOAPIFY_KEY=...
NEXT_PUBLIC_DEFAULT_LAT=12.9716
NEXT_PUBLIC_DEFAULT_LNG=77.5946
```

Full steps, provider settings, health checks aur ek production checklist are in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

---

## Security notes

- Passwords are hashed with bcrypt (cost 12); OTPs are hashed with SHA-256 aur expire.
- Production never returns OTPs; `devOtpField()` aur `devPickupOtp` are development-only.
- Email verification required before credentials sign-in.
- Auth.js JWT sessions backed by fresh database reads for role/status.
- Server-side page guards for the dashboard, admin aur partner areas.
- `requireUser`/`requireRole` plus resource ownership checks in har sensitive API.
- Zod validation for all mutating payloads; registration, vehicles, bookings, onboarding, payout, review, contact aur status updates have dedicated schemas.
- AES-256-GCM encryption for payout account numbers with random IV aur auth tag; sirf last four digits leave the server.
- Secret-scoped socket tokens; timing-safe internal-secret check on `/emit`; allow-listed CORS origins.
- Uploads enforce a 10 MB limit aur ek allow-list of image, PDF aur video MIME types.
- Auth.js pages aur API handlers re-check database state, so ek stale JWT cannot preserve revoked access.
- Use HTTPS in production, rotate all demo secrets, aur restrict MongoDB/Cloudinary/Razorpay keys to the minimum required scope.

---

## Known limitations

- ZEGOCLOUD video KYC needs ek configured App ID/secret aur browser camera permissions. Without them the recorded-video fallback is used, aur ek admin still reviews the evidence.
- Razorpay online payments require live/test API keys. Cash bookings are fully functional without them.
- The Socket.IO process is a single instance. For horizontal scaling, add ek Redis adapter aur keep the emit endpoint behind ek private network.
- Rate limits are held in process memory. Serverless aur multi-instance deployments can see independent windows per instance; use ek shared store (Redis/Upstash) if you need strict platform-wide limits.
- The local uploads fallback is development-only; production must use Cloudinary (ya another object store).
- The demo seed creates predictable accounts aur data. Replace ya remove it in ek real production launch.
- Email delivery uses Gmail SMTP; for high volume, swap in ek transactional provider.

---

## Documentation

- [Architecture](docs/ARCHITECTURE.md) - runtime topology, folders, data model, flows, security.
- [Environment](docs/ENVIRONMENT.md) - har variable aur provider setup.
- [Deployment](docs/DEPLOYMENT.md) - Vercel + Socket.IO + Atlas, provider configuration, checklist.
- [Testing](docs/TESTING.md) - commands, coverage aur the end-to-end verification matrix.
- [Reference comparison](docs/REFERENCE-COMPARISON.md) - how the build maps to the four source videos aur where it intentionally goes further.

---

Built for the multi-vendor vehicle booking series. Product copy aur documentation are in English.