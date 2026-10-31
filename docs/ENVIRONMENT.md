# Environment setup

This guide lists every environment variable RYDEX reads, explains what happens when each one is missing, and walks through the provider setup for local development and production.

## 1. Requirements

| Requirement | Version / notes |
| --- | --- |
| Node.js | **20.9 or newer** (Next.js 16.2 requires it) |
| npm | 10+ |
| MongoDB | Local MongoDB 7+ or a MongoDB Atlas cluster |
| Browser | Current Chrome, Edge, Firefox or Safari; camera/mic access for live KYC |
| OS | Windows, macOS or Linux |

Optional accounts:

- Google Cloud project for Google sign-in.
- Gmail account with 2-Step Verification for SMTP.
- Cloudinary account for production uploads.
- Razorpay account for online payments.
- ZEGOCLOUD project for live video KYC.
- Geoapify account for better geocoding.

## 2. First run

```bash
npm install
cp .env.example .env          # macOS/Linux
Copy-Item .env.example .env   # Windows PowerShell
```

Keep the file at the repository root; do not create per-workspace copies. `frontend/next.config.ts` loads it with `@next/env` for the Next.js server and build, while `backend/src/lib/env.ts` loads it for `npm run seed`, `npm run create-admin` and the Socket.IO process.

Set the three required values:

```env
MONGODB_URI=mongodb://127.0.0.1:27017/rydex
AUTH_SECRET=<random secret>
AUTH_URL=http://localhost:3000
```

Generate a secret:

```bash
npx auth secret
# or
openssl rand -base64 32
```

Seed demo data and start both processes:

```bash
npm run seed
npm run dev
```

- Web: <http://localhost:3000>
- Socket health: <http://localhost:4001/health>

Use `http://localhost:3000`, not `http://127.0.0.1:3000`. Auth.js cookies and the socket CORS allow-list are tied to `AUTH_URL`; mixing the two hostnames can produce confusing login or realtime failures.

## 3. Variable reference

Variables marked **required** have no safe default. Everything else enables an integration or tunes behavior, and the documented fallback applies when unset.

### Core

| Variable | Required | Example | Behavior / fallback |
| --- | --- | --- | --- |
| `MONGODB_URI` | **Yes** | `mongodb://127.0.0.1:27017/rydex` | Mongoose connects lazily. Without it, APIs that touch the database return a configuration error. |
| `AUTH_SECRET` | **Yes** | 32+ random bytes | Signs Auth.js JWTs, OTP hashes and socket tokens; derives the AES key for payout encryption. Must be identical in the web and socket processes. |
| `AUTH_URL` | **Yes** | `http://localhost:3000` | Canonical origin used in emails, socket CORS and share links. Use the exact HTTPS origin in production, without a trailing slash. |

> **Secret rotation warning:** changing `AUTH_SECRET` invalidates sessions and signed socket tokens, and makes previously encrypted payout account numbers undecryptable. Re-encrypt or re-enter payout details after rotation.

### Authentication

| Variable | Required | Behavior / fallback |
| --- | --- | --- |
| `AUTH_GOOGLE_ID` | No | Google OAuth client ID. The Google button is hidden unless both ID and secret are set. |
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
6. Copy the client ID and secret into `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET`.
7. Restart the dev server. The Google button appears on login/register.

Google sign-in creates a verified user automatically on first use. It does not create a partner profile; the user can start onboarding from the dashboard.

### Email and OTP

| Variable | Required | Behavior / fallback |
| --- | --- | --- |
| `EMAIL_USER` | No | Gmail address used as the SMTP user. Without it, mail is written to `frontend/.mail-outbox/mail.log`. |
| `EMAIL_PASS` | No | Gmail **App Password** (not the normal account password). |
| `EMAIL_FROM` | No | Sender line. Defaults to `RYDEX <no-reply@rydex.app>`; the SMTP account still sends the message. |

Gmail setup:

1. Enable 2-Step Verification on the Google account.
2. Open <https://myaccount.google.com/apppasswords>.
3. Create an app password for "Mail".
4. Set `EMAIL_USER` to the full Gmail address and `EMAIL_PASS` to the 16-character app password.
5. Restart the app and register a test account.

Development behavior:

- Without credentials, OTPs and notifications are appended to `frontend/.mail-outbox/mail.log`.
- The verification screens may show the development OTP when email is not configured.
- In production, OTPs are **never** returned to clients, even if SMTP is missing. Configure email before launching.

> Gmail SMTP is fine for demos and low volume. For production use a transactional provider with SPF/DKIM/DMARC.

### Uploads (Cloudinary)

| Variable | Required | Behavior / fallback |
| --- | --- | --- |
| `CLOUDINARY_CLOUD_NAME` | Production: yes | Cloudinary cloud name. |
| `CLOUDINARY_API_KEY` | Production: yes | Cloudinary API key. |
| `CLOUDINARY_API_SECRET` | Production: yes | Cloudinary API secret. |

Setup:

1. Create a Cloudinary account and open the dashboard.
2. Copy **Cloud name**, **API Key** and **API Secret** from the product environment.
3. Set all three variables.
4. Uploads go to the `rydex` folder with resource types `image`, `video` or `auto` (PDF).

Without Cloudinary:

- Development stores files in `frontend/public/uploads` and returns `/uploads/<hash>.<ext>`.
- Production refuses local uploads and asks for a URL or Cloudinary configuration. This is intentional: serverless filesystems are ephemeral.

### Payments (Razorpay)

| Variable | Required | Behavior / fallback |
| --- | --- | --- |
| `RAZORPAY_KEY_ID` | No | Razorpay key ID. Online payment is disabled when either key is missing. |
| `RAZORPAY_KEY_SECRET` | No | Razorpay key secret, used for order creation, signature verification and refunds. |

Setup:

1. Create a Razorpay account and open **Settings → API Keys**.
2. Generate a **test** key pair for local development.
3. Set `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`.
4. Enable the payment methods you want in the Razorpay dashboard (cards, UPI, netbanking, wallets).
5. Use Razorpay test cards/UPI IDs for checkout.

Behavior:

- Cash bookings work with or without Razorpay.
- Online checkout is hidden/disabled with a clear message when unconfigured.
- The key ID is returned from the server per order; no public Razorpay variable is required.
- There is no webhook wiring in this build. Payment is confirmed when the browser returns and the server verifies the signature. If the browser closes mid-flow, reconcile from the Razorpay dashboard.
- Refunds are attempted on rejection/cancellation of paid bookings; failures are logged and the booking still changes state.

### Video KYC (ZEGOCLOUD)

| Variable | Required | Behavior / fallback |
| --- | --- | --- |
| `NEXT_PUBLIC_ZEGO_APP_ID` | No | Numeric ZEGOCLOUD App ID. Must be available at build time. |
| `ZEGO_SERVER_SECRET` | No | Exactly 32 characters. Used to generate token04. Never expose to the browser. |

Setup:

1. Create a project at <https://console.zegocloud.com/>.
2. Copy the **App ID** and **Server Secret**.
3. Set `NEXT_PUBLIC_ZEGO_APP_ID` and `ZEGO_SERVER_SECRET`.
4. Restart/redeploy the app. `NEXT_PUBLIC_*` values are embedded at build time.
5. Allow camera and microphone access on the onboarding page. HTTPS (or localhost) is required by browsers.

Without ZEGOCLOUD:

- The onboarding KYC step offers a recorded video upload instead.
- Admins review the uploaded video URL.
- Live KYC endpoints return a clear `503` with the fallback message.

### Geocoding and maps

| Variable | Required | Behavior / fallback |
| --- | --- | --- |
| `GEOAPIFY_KEY` | No | Server-side Geoapify key. Preferred for search. Falls back to Nominatim. |
| `NEXT_PUBLIC_DEFAULT_LAT` | No | Default map center latitude. Defaults to Bengaluru (`12.9716`). |
| `NEXT_PUBLIC_DEFAULT_LNG` | No | Default map center longitude. Defaults to `77.5946`. |

Details:

- Geoapify is optional. Nominatim and OSRM public endpoints work without a key but are shared community services with usage policies. Production traffic should use a commercial geocoder and a self-hosted or commercial OSRM instance.
- OpenStreetMap tiles are loaded directly by Leaflet. Keep the attribution intact and follow the OSM tile usage policy.
- `NEXT_PUBLIC_DEFAULT_*` are embedded at build time.

### Realtime socket server

| Variable | Required | Behavior / fallback |
| --- | --- | --- |
| `NEXT_PUBLIC_SOCKET_URL` | Production: for realtime | Browser-facing Socket.IO URL, e.g. `https://socket.example.com`. Empty in production means no realtime client; polling continues to work. |
| `SOCKET_EMIT_URL` | Production: for realtime | Server-to-server base URL for `POST /emit`. Empty in production disables emits. Locally defaults to `http://127.0.0.1:4001`. |
| `SOCKET_INTERNAL_SECRET` | Production: yes | Shared secret for `/emit`, compared in constant time. Use a long random value. Locally defaults to `rydex-socket-dev-secret`. |
| `SOCKET_PORT` | No | Socket server port. Defaults to `4001`. |

Setup:

1. Choose a long random `SOCKET_INTERNAL_SECRET` and use the same value on the web app and socket service.
2. Ensure `AUTH_SECRET` is identical on both services; socket tokens are HMAC-signed with it.
3. Locally, `npm run dev` starts both. For separate terminals use `npm run dev:web` and `npm run dev:socket`.
4. In production, deploy the socket server to a host that supports persistent processes (Render, Railway, Fly.io, VPS). Point both URLs at it.
5. Verify `GET https://socket.example.com/health` returns `{ "ok": true, ... }`.

The socket server allows origins from `AUTH_URL` plus `http://localhost:3000` and `http://127.0.0.1:3000`. For additional preview domains, update `backend/src/socket/server.ts` or put the socket behind a proxy that controls CORS.

### Demo seed

| Variable | Required | Behavior / fallback |
| --- | --- | --- |
| `SEED_ADMIN_EMAIL` | No | Admin email created by `npm run seed`. Defaults to `admin@rydex.app`. |
| `SEED_ADMIN_PASSWORD` | No | Admin password for the seed. Defaults to `Admin@12345`. |

The rider and partner demo passwords are defined in `backend/src/scripts/seed.ts`. Modify them there if you need different demo credentials. The seed is for local/demo databases only.

### Production admin bootstrap

| Variable | Required | Behavior |
| --- | --- | --- |
| `ADMIN_EMAIL` | Yes (script) | Email for the first production admin. Validated before the upsert. |
| `ADMIN_PASSWORD` | Yes (script) | New password, at least 8 characters. Hashed with bcrypt; never printed. |
| `ADMIN_NAME` | No | Display name. Defaults to `RYDEX Admin`. |

Run `npm run create-admin` with these variables to create or update an admin without seeding demo data. The script is safe to re-run to rotate the admin password. It does not create rider, partner or demo accounts.

## 4. Production readiness matrix

| Capability | Local default | Production requirement | Consequence if missing |
| --- | --- | --- | --- |
| Database | Local MongoDB | `MONGODB_URI` to Atlas with backups | App cannot read/write |
| Sessions | Random secret | Strong unique `AUTH_SECRET` | Sessions/tokens insecure or invalid |
| Canonical URL | `http://localhost:3000` | Exact HTTPS `AUTH_URL` | Broken email links, CORS issues, OAuth mismatch |
| Realtime | Local socket on 4001 | Socket host + both URLs + internal secret | Polling fallback; no instant updates |
| Email/OTP | Dev outbox | Gmail/transactional SMTP | Registration/reset codes not delivered |
| Uploads | `frontend/public/uploads` | Cloudinary (or another object store) | Uploads rejected in production |
| Payments | Disabled | Razorpay keys | Online payment hidden; cash still works |
| Video KYC | Recorded upload | ZEGOCLOUD project | Recorded fallback; no live calls |
| Geocoding | Nominatim | Geoapify/self-hosted OSRM for scale | Rate limits/slow public endpoints |
| Google sign-in | Hidden | Google OAuth credentials | Email/password still works |
| Demo accounts | Seeded | Removed or rotated | Predictable credentials are a risk |

## 5. Environment hygiene

- The single `.env` at the repository root is ignored by Git. Never commit it, paste it into issues, or expose it to the browser.
- The web app and backend scripts both read that root file. Platform deployments can set the same variables in the hosting dashboard with no `.env` file at all.
- Only variables prefixed `NEXT_PUBLIC_` are visible to client code. Do not put secrets behind that prefix.
- `NEXT_PUBLIC_*` values are baked in at build time. Changing one requires a rebuild/redeploy, not just a process restart.
- Use separate credentials for development, preview and production. Do not reuse the Razorpay live keys in local development.
- Rotate demo passwords, `AUTH_SECRET`, `SOCKET_INTERNAL_SECRET` and provider keys before a public launch.
- Restrict MongoDB Atlas network access and Cloudinary/Razorpay key permissions to the minimum required.
- If you rotate `AUTH_SECRET`, existing payout ciphertext cannot be decrypted. Re-enter payout details or migrate the data first.

## 6. Changing demo credentials

**Admin:** set `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` before running `npm run seed`.

**Rider and partners:** the seed uses hardcoded passwords (`Rider@12345`, `Partner@12345`, `Metro@12345`, `Cargo@12345`). Either:

1. Edit the relevant entries in `backend/src/scripts/seed.ts` before seeding, or
2. Sign in and use **Forgot password** after configuring email, or
3. Update the password hash directly in MongoDB with a bcrypt hash generated by a script.

For a production launch, do not run the demo seed against the production database. Set `ADMIN_EMAIL`, `ADMIN_PASSWORD` and `ADMIN_NAME`, then run `npm run create-admin` to create the first admin deliberately. Partners and riders then use the normal registration flow.

## 7. Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| `MONGODB_URI is not configured` | Root `.env` missing or not loaded | Copy `.env.example` to `<repo>/.env`; restart |
| Mongo connection times out | Local service down, Atlas IP not allow-listed, bad password | Start MongoDB; add your IP in Atlas; verify the URI |
| Login redirects back to `/login` | `AUTH_URL` host differs from the browser host (`127.0.0.1` vs `localhost`) | Use the exact `AUTH_URL` origin |
| Google `redirect_uri_mismatch` | Callback not registered | Add `<AUTH_URL>/api/auth/callback/google` exactly |
| Google button missing | Env vars not set or app not restarted | Set both Google vars and restart |
| OTP never arrives | SMTP unset, app password wrong, spam filtering | Check `frontend/.mail-outbox/mail.log`; use a Gmail app password; check spam |
| `EMAIL_NOT_VERIFIED` at login | Account created but not verified | Complete `/verify-email` or resend the OTP |
| `Too many requests` | Hit the per-IP rate limit | Wait for the window to reset; adjust limits in code for testing |
| Upload fails in production | Cloudinary not configured | Add all three Cloudinary variables |
| Upload fails locally | File over 10 MB or unsupported type | Use JPEG/PNG/WebP/AVIF, PDF, MP4/WebM/MOV under 10 MB |
| Online payment disabled | Razorpay keys missing | Add `RAZORPAY_KEY_ID`/`RAZORPAY_KEY_SECRET` |
| Payment stays pending | Browser closed before verification | Verify via the API/Razorpay dashboard; add a webhook for production |
| Socket won't connect | Wrong URL, CORS, secret mismatch, mixed content | Check `NEXT_PUBLIC_SOCKET_URL`, `AUTH_URL`, `AUTH_SECRET`, and use HTTPS in production |
| Map is blank | Tile network blocked or coordinates invalid | Check network access to OSM tiles; verify default lat/lng |
| `ZEGOCLOUD app ID is invalid` | Env missing or not numeric | Set `NEXT_PUBLIC_ZEGO_APP_ID` and rebuild |
| `ZEGO server secret must be 32 characters` | Wrong secret length | Copy the full 32-character server secret |
| `Registration number already exists` | Seed or E2E data collision | Use a different registration or reset the demo database |
| Dashboard shows "Loading" forever | API error or session expired | Check the browser network tab and server logs; sign in again |

## 8. Verifying the setup

Run these checks after configuring:

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

Then:

1. Open <http://localhost:3000> and complete a fake cash booking with the rider demo account.
2. Sign in as a partner and accept it.
3. Confirm the booking status updates without a refresh (socket) or within the polling interval (fallback).
4. Sign in as admin and open the vendor and booking consoles.
5. Open `/api/config` and confirm the integrations you configured report `true`.

`GET /api/config` returns:

```json
{
  "googleEnabled": false,
  "razorpayEnabled": false,
  "zegoEnabled": false,
  "emailEnabled": false,
  "cloudinaryEnabled": false,
  "demoMode": true
}
```
