# Deployment

RYDEX deploys as a normal Next.js app plus one standalone realtime process. This guide covers the recommended production topology, provider configuration, first-admin bootstrap, smoke tests, operations and rollback.

## 1. Target topology

| Component | Recommended host | Why |
| --- | --- | --- |
| Next.js web app | **Vercel** (or any Node 20.9+ host) | App Router, server rendering, API handlers, Auth.js |
| Socket.IO server | **Render / Railway / Fly.io / VPS** | Needs a persistent process and WebSocket support |
| MongoDB | **MongoDB Atlas** | Managed backups, scaling and network controls |
| Uploads | **Cloudinary** | Serverless filesystems are ephemeral |
| Email | Gmail SMTP for small deployments; transactional provider at scale | OTP and booking notifications |
| Payments | Razorpay | Online checkout; cash works without it |
| Video KYC | ZEGOCLOUD | Live verification; recorded fallback exists |

```text
https://app.example.com          https://socket.example.com
        │                                  │
        ▼                                  ▼
   Next.js on Vercel  ── POST /emit ──>  Socket.IO service
        │                                  │
        └────────── MongoDB Atlas ─────────┘ (web only)
```

The Socket.IO process does **not** connect to MongoDB. It validates HMAC tokens signed with `AUTH_SECRET`, joins rooms and fans out events.

## 2. Prerequisites

- Repository pushed to GitHub/GitLab.
- MongoDB Atlas cluster (or managed MongoDB).
- A domain or Vercel subdomain for the web app.
- A second public HTTPS hostname for the socket service.
- Provider accounts as needed: Cloudinary, Razorpay, ZEGOCLOUD, Google, Gmail/email provider, Geoapify.
- Node.js 20.9+ locally for running scripts and smoke tests.

## 3. MongoDB Atlas

1. Create a project and an M0/M10+ cluster.
2. Create a database user with read/write access to the `rydex` database.
3. Add network access:
   - Vercel has no fixed egress IPs on hobby plans. Start with `0.0.0.0/0` while testing, then tighten using a static egress/NAT option or Atlas private endpoints on paid plans.
   - Add your local IP for seeding and smoke tests.
4. Copy the driver connection string:

   ```env
   MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>/rydex?retryWrites=true&w=majority
   ```

5. Choose a cluster region close to the web app to reduce latency.
6. Enable backups appropriate to your plan.
7. Keep `maxPoolSize` in mind: `backend/src/lib/db.ts` uses 10 connections per web instance. Serverless concurrency multiplies this; size Atlas accordingly or use a connection pooler.

## 4. Deploy the Socket.IO server

### 4.1 Host requirements

The service must:

- Run a persistent Node process.
- Support WebSockets (or at least long polling).
- Provide a public HTTPS URL.
- Allow outbound nothing (it needs no external APIs) and inbound from the web app and browsers.

Render, Railway, Fly.io and a small VPS all work. Vercel Functions do **not** work.

### 4.2 Build and start

The socket server is TypeScript and runs with `tsx`. Run these commands from the **repository root** so npm installs the backend workspace and its shared dependency:

```bash
npm ci --include=dev
npm run socket
```

`tsx` is a dev dependency. If your host installs only production dependencies, either install with dev dependencies or compile the server in a build step. A simple Render/Railway configuration:

| Setting | Value |
| --- | --- |
| Build command | `npm ci --include=dev` |
| Start command | `npm run socket` |
| Health check path | `/health` |
| Environment | `NODE_ENV=production` |

The server listens on `SOCKET_PORT` (default `4001`). Many platforms inject `PORT` and expect the process to bind it. Set `SOCKET_PORT` to the port your platform expects, or configure the platform to route to `4001`. For example, on Render set `SOCKET_PORT=10000` if the service's internal port is `10000`.

### 4.3 Environment variables

Set these on the socket service:

```env
NODE_ENV=production
AUTH_SECRET=<same value as the web app>
AUTH_URL=https://app.example.com
SOCKET_INTERNAL_SECRET=<long random shared secret>
SOCKET_PORT=4001
```

Notes:

- `AUTH_SECRET` **must match** the web app. Socket tokens are signed with it.
- `SOCKET_INTERNAL_SECRET` **must match** the web app. `/emit` rejects mismatches with `401`.
- `AUTH_URL` controls the allowed browser origin. The server also allows `http://localhost:3000` and `http://127.0.0.1:3000` for local development. Update `backend/src/socket/server.ts` if you need additional origins.
- Do not set `NEXT_PUBLIC_*` on the socket service; the browser never talks to it for token generation.

### 4.4 Verify

```bash
curl https://socket.example.com/health
```

Expected:

```json
{
  "ok": true,
  "service": "rydex-socket",
  "connections": 0,
  "at": "2026-01-01T00:00:00.000Z"
}
```

Test `/emit` with the secret:

```bash
curl -X POST https://socket.example.com/emit \
  -H "content-type: application/json" \
  -H "x-socket-secret: <secret>" \
  -d "{\"room\":\"user:test\",\"event\":\"test\",\"payload\":{\"ok\":true}}"
```

Expected: `{ "ok": true }`. Without the header: `401`.

### 4.5 Reverse proxy (VPS)

For Nginx:

```nginx
location / {
  proxy_pass http://127.0.0.1:4001;
  proxy_http_version 1.1;
  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection "upgrade";
  proxy_set_header Host $host;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_cache_bypass $http_upgrade;
}
```

Terminate TLS at the proxy or a managed load balancer. Browsers will block mixed-content WebSockets from an HTTPS page.

## 5. Deploy the web app on Vercel

### 5.1 Import and build

1. In Vercel, **Add New → Project** and import the repository.
2. Framework preset: **Next.js**.
3. Root directory: **`frontend`** (the Next.js workspace).
4. In the Root Directory settings, keep **Include source files outside of the Root Directory in the Build Step** enabled. The app imports `backend` and `shared`, which are siblings of `frontend`.
5. Install command: leave the default. Vercel detects the npm workspace from the repository-root lockfile and installs all workspaces.
6. Build command: `npm run build` (the frontend workspace script runs `next build`).
7. Node.js version: 20.9+ (22 LTS recommended).
8. Deploy. The first build may fail until the required env vars are set.

Do **not** set the Root Directory to the repository root: Next.js writes its output to `frontend/.next`, and the Vercel Next.js preset expects the app and its output at the configured root. The monorepo paths are already accounted for by `turbopack.root`, `outputFileTracingRoot` and `transpilePackages` in `frontend/next.config.ts`.

### 5.2 Environment variables

Set these in **Settings → Environment Variables** for Production (and Preview as needed):

```env
# Required
MONGODB_URI=mongodb+srv://...
AUTH_SECRET=<same as socket service>
AUTH_URL=https://app.example.com

# Realtime
NEXT_PUBLIC_SOCKET_URL=https://socket.example.com
SOCKET_EMIT_URL=https://socket.example.com
SOCKET_INTERNAL_SECRET=<same as socket service>
SOCKET_PORT=4001

# Uploads (required in production)
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...

# Email / OTP
EMAIL_USER=...
EMAIL_PASS=...
EMAIL_FROM=RYDEX <no-reply@example.com>

# Optional integrations
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

Important:

- Vercel injects these values into `process.env` at build and runtime. The repository-level `.env` is for local development only and is not required in the deployment.
- `NEXT_PUBLIC_SOCKET_URL`, `NEXT_PUBLIC_ZEGO_APP_ID` and `NEXT_PUBLIC_DEFAULT_*` are embedded at **build time**. Set them before deploying; changing them requires a redeploy.
- `AUTH_URL` must be the final HTTPS origin, with no trailing slash.
- `SOCKET_EMIT_URL` can be the same public URL as `NEXT_PUBLIC_SOCKET_URL` unless you use private networking.
- Do not put `ZEGO_SERVER_SECRET`, `SOCKET_INTERNAL_SECRET` or any provider secret behind a `NEXT_PUBLIC_` name.

### 5.3 First deploy and domain

1. Deploy once to get a `*.vercel.app` URL.
2. Add your custom domain in Vercel.
3. Update `AUTH_URL` to the custom domain.
4. Add the custom domain origin to the socket allow-list if it differs from the one configured at deploy time.
5. Update Google/Razorpay/ZEGOCLOUD callback or origin settings if applicable.
6. Redeploy so build-time public variables and `AUTH_URL`-dependent behavior are consistent.

### 5.4 Alternative Node host

RYDEX also runs on Render, Railway, Fly.io, a VPS or Docker:

```bash
npm ci
npm run build
npm run start
```

- Run `npm ci`, `npm run build` and `npm start` from the repository root so the workspace links are installed.
- Next.js reads the host-provided `PORT` environment variable; set `PORT` or map the platform port to `3000`.
- Terminate TLS at the platform/proxy.
- Run the socket server as a **separate** service.
- Ensure `frontend/public/uploads` is not used for durable storage; configure Cloudinary.

## 6. Provider configuration in production

### Cloudinary

1. Create a production environment/folder.
2. Set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`.
3. Confirm `res.cloudinary.com` is allowed in `frontend/next.config.ts` (it is by default).
4. Upload a test profile image and a KYC video after deployment.

### Google OAuth

1. Add the production origin to **Authorized JavaScript origins**.
2. Add `https://app.example.com/api/auth/callback/google` to **Authorized redirect URIs**.
3. Set `AUTH_GOOGLE_ID`/`AUTH_GOOGLE_SECRET`.
4. Publish the OAuth consent screen if external users should sign in.

### Email / OTP

1. Gmail: use an App Password, not the account password.
2. For scale, use a transactional provider and update `backend/src/lib/email.ts` to its SMTP/API settings.
3. Verify SPF/DKIM/DMARC and a custom `EMAIL_FROM`.
4. Test registration, resend, forgot-password and booking OTPs from a clean browser.

In production, OTPs are never returned to clients. Without working email, users cannot complete registration or password reset.

### Razorpay

1. Complete KYC and activate live mode.
2. Use live keys: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`.
3. Enable the payment methods you support.
4. Decide capture behavior. The verify route accepts `captured` or `authorized`; auto-capture is simplest.
5. Test a live/low-value payment and a refund before launch.

Online payment is optional. If keys are absent, the UI hides/disables online checkout and cash remains fully functional.

### ZEGOCLOUD

1. Create a production project.
2. Set `NEXT_PUBLIC_ZEGO_APP_ID` and the 32-character `ZEGO_SERVER_SECRET`.
3. Allow camera/microphone permissions in the browser; HTTPS is required.
4. Test the partner KYC room and the admin review screen.
5. If you skip ZEGOCLOUD, the recorded-video upload path still works.

### Geoapify

1. Create a key with geocoding access.
2. Set `GEOAPIFY_KEY` on the web service.
3. Confirm search and reverse geocoding use `provider: "geoapify"` when the key is valid.
4. For high traffic, self-host OSRM or use a commercial routing provider; the public OSRM/Nominatim endpoints are shared services.

## 7. Production data and first admin

**Do not run the demo seed against production.** It creates predictable accounts and sample vehicles/bookings.

Bootstrap an admin with the dedicated script:

```bash
ADMIN_EMAIL=admin@example.com \
ADMIN_PASSWORD='<strong unique password>' \
ADMIN_NAME='Operations Admin' \
npm run create-admin
```

PowerShell:

```powershell
$env:ADMIN_EMAIL="admin@example.com"
$env:ADMIN_PASSWORD="<strong unique password>"
$env:ADMIN_NAME="Operations Admin"
npm run create-admin
```

The script:

- Loads the repository-level `.env` through `backend/src/lib/env.ts` (or uses process env supplied by the host).
- Validates the email and an 8+ character password.
- Hashes the password with bcrypt (cost 12).
- Upserts the user with `role: admin`, `partnerStatus: none`, `emailVerified` set.
- Prints the email and name, never the password.

After creating the admin:

1. Sign in at `/login`.
2. Open `/dashboard/admin`.
3. Partners register and complete onboarding through the UI; approve them from **Vendors**.
4. Add real vehicles through the partner fleet screen; they publish when the partner is approved.

If you want demo data in a staging environment, run `npm run seed` against a staging database only, then rotate/delete the demo accounts.

## 8. Smoke test checklist

Run after every production deploy:

### Public and auth

- [ ] `/`, `/fleet`, `/book`, `/contact`, `/terms`, `/privacy` return `200`.
- [ ] Home anchors (`/#how-it-works`, `/#pricing`, `/#faq`) land below the fixed nav.
- [ ] Register a new rider; OTP email arrives; verification works.
- [ ] Sign out and sign back in with the new account.
- [ ] Forgot-password sends a code and the reset works; the old password fails.
- [ ] Google sign-in works if configured; the button is hidden otherwise.

### Rider

- [ ] Fleet filters, search and sorting work.
- [ ] Create a cash booking; fare and distance are server-calculated.
- [ ] Booking detail shows the map, status and pickup OTP controls.
- [ ] Partner accepts; the rider sees the status without a manual refresh (or within polling).
- [ ] Chat sends and receives; live location updates.
- [ ] Start with pickup OTP; complete with drop OTP.
- [ ] Rate the completed trip; the booking list reflects the state.
- [ ] Cancel an eligible booking and verify the state/refund behavior.
- [ ] Profile update and avatar upload persist.

### Partner

- [ ] Onboard a fresh partner through all six steps.
- [ ] Admin rejects without KYC reset; the partner can edit and resubmit.
- [ ] Admin rejects with KYC reset; old evidence is cleared and a new video is required.
- [ ] Admin approves; vehicles publish and the partner dashboard unlocks.
- [ ] Fleet add/edit/delete/availability work.
- [ ] Requests and rides update in realtime or polling.
- [ ] Earnings show completed trips; CSV downloads.
- [ ] Payout update validates confirmation, encrypts the number and returns only last4.

### Admin

- [ ] Overview metrics render.
- [ ] Vendor tabs, counts, search, pagination and empty states work.
- [ ] Vendor detail shows documents, KYC evidence, vehicle draft and pricing.
- [ ] Approve/reject actions email the partner and update the dashboard.
- [ ] Bookings console filters, searches and pages.
- [ ] Mobile drawer and navigation work; no horizontal overflow.

### Integrations

- [ ] `GET /api/config` reports the integrations you configured.
- [ ] Upload an image, PDF and video; Cloudinary URLs are returned.
- [ ] Online payment: create an order, pay, verify, and confirm the booking is paid.
- [ ] Socket health is green and `/emit` rejects an unauthenticated request.
- [ ] Email delivery works for registration, reset, booking and review messages.

## 9. Operations

### Health and monitoring

| Check | What to monitor |
| --- | --- |
| Web | Vercel deployment health, 5xx rate, function duration, cold starts |
| Socket | `GET /health`, connection count, restart count, memory |
| MongoDB | Connections, slow queries, storage, backup status |
| Razorpay | Failed orders, refund failures, webhook backlog (if added) |
| Email | Bounce/complaint rate, delivery latency |
| Cloudinary | Upload failures, quota, transformations |

There is no bundled APM or error tracker. Add Sentry/OpenTelemetry and structured logs before high-traffic operation. The app logs API errors, socket emit failures, geocoding fallbacks, email failures and Razorpay warnings to stdout.

### Backups

- Enable Atlas continuous backups or scheduled snapshots.
- Test a restore into a staging cluster.
- Back up Cloudinary assets according to your plan.
- Keep environment variables in a secrets manager or the platform's encrypted store; document rotation ownership.

### Scaling

1. **Web:** Vercel scales stateless instances automatically. Watch MongoDB connection limits.
2. **Rate limits:** the limiter is in process memory. Multiple instances each have independent windows. For strict global limits, move buckets to Redis/Upstash.
3. **Socket:** add the Socket.IO Redis adapter before running more than one socket instance. Use sticky sessions if polling transport is enabled across instances.
4. **Database:** add indexes before traffic; use Atlas tiering and read preferences appropriate to your workload.
5. **External services:** move email to a transactional provider, use paid geocoding/routing, and add Razorpay webhooks plus a refund reconciliation job.
6. **Uploads:** use Cloudinary transformations and lifecycle rules; do not serve unoptimized originals.

### Secret rotation

| Secret | Effect |
| --- | --- |
| `AUTH_SECRET` | Invalidates sessions/socket tokens; **breaks existing payout ciphertext** |
| `SOCKET_INTERNAL_SECRET` | Emits fail until both services are updated |
| `AUTH_GOOGLE_SECRET` | Google sign-in fails until updated |
| `EMAIL_PASS` | OTP/notification delivery fails |
| Cloudinary/Razorpay/ZEGO keys | Respective integration fails |
| Admin password | Use the create-admin script to set a new hash |

Rotate web and socket `AUTH_SECRET` together. If payout data must survive, decrypt/re-encrypt before rotating or re-enter payout details afterward.

## 10. Rollback

1. **Web:** promote the previous Vercel deployment (Instant Rollback). If the database schema changed, roll back code only if the old code is compatible.
2. **Socket:** redeploy the previous build. Tokens remain valid while `AUTH_SECRET` is unchanged.
3. **Environment:** restore the previous env values. Public variables require a rebuild to take effect.
4. **Database:** restore from an Atlas snapshot only as a last resort; it discards newer writes.
5. **Provider changes:** revert OAuth callbacks, Razorpay keys, Cloudinary settings and DNS as needed.

Keep migrations additive where possible. This project uses Mongoose schemas without a migration framework, so coordinate schema changes with rollbacks.

## 11. Security checklist

- [ ] Unique, strong `AUTH_SECRET` in production; never the example value.
- [ ] Unique, strong `SOCKET_INTERNAL_SECRET`; not exposed to the browser.
- [ ] `AUTH_URL` is the exact HTTPS origin.
- [ ] Demo accounts, demo data and seed credentials removed.
- [ ] Cloudinary configured; local uploads disabled.
- [ ] Email configured; production OTP leakage impossible.
- [ ] Razorpay live keys restricted and tested.
- [ ] Google OAuth redirect URIs limited to your domains.
- [ ] ZEGOCLOUD server secret kept server-side.
- [ ] Mongo Atlas network access restricted; strong DB user password.
- [ ] HTTPS everywhere; HSTS at the proxy/platform if possible.
- [ ] Rate limiting backed by a shared store if you run multiple instances.
- [ ] Error reporting configured; logs do not contain OTPs, passwords or full bank numbers.
- [ ] Backups enabled and restore-tested.
- [ ] Admin accounts limited and reviewed.

## 12. Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| Vercel build fails on env | Missing required vars or old Node | Set vars; use Node 20.9+; rebuild |
| `MONGODB_URI is not configured` in production | Env not set for the environment | Add it to Production and redeploy |
| Mongo connection timeout from Vercel | Atlas IP allow-list or DNS | Allow Vercel egress or use `0.0.0.0/0` temporarily |
| Login loops or session lost | `AUTH_URL` host mismatch | Set the exact public origin; no trailing slash |
| Google callback error | Redirect URI mismatch | Add `<AUTH_URL>/api/auth/callback/google` exactly |
| Socket 400/401 | Token secret mismatch, expired token, wrong project | Use the same `AUTH_SECRET` on both services; check browser console |
| Browser cannot reach socket | Mixed content, wrong URL, CORS | Use HTTPS; set `NEXT_PUBLIC_SOCKET_URL`; include the web origin |
| Realtime silently missing | Empty socket URLs in production | Set both `NEXT_PUBLIC_SOCKET_URL` and `SOCKET_EMIT_URL`; redeploy |
| `/emit` returns 401 | Secret mismatch | Align `SOCKET_INTERNAL_SECRET` on web and socket |
| Uploads 500 in production | Cloudinary missing | Add all three Cloudinary vars |
| Images blocked by Next | Remote host not allow-listed | Use Cloudinary or add the host to `frontend/next.config.ts` |
| OTP not delivered | SMTP/Gmail app password/spam | Check provider logs and spam; use a transactional provider |
| `Too many requests` | Per-instance rate limit | Wait; tune limits; use shared store for global limits |
| Payment disabled | Razorpay keys missing | Add keys and redeploy |
| Payment stays pending | Browser closed before verify | Reconcile in Razorpay; add a webhook |
| Socket service restarts | Free tier sleeping, port mismatch, crash | Use an always-on instance; bind the expected port; check logs |
| `EADDRINUSE` on socket | Port already bound | Change `SOCKET_PORT` or stop the other process |
| KYC camera blocked | Permissions/HTTPS/device | Allow camera/mic; use HTTPS; test another browser |
| `NEXT_PUBLIC_*` change ignored | Build-time embedding | Redeploy after changing the value |
| Admin can't sign in after bootstrap | Wrong env vars or script pointed at another DB | Re-run the script with the production `MONGODB_URI`; check the email |
