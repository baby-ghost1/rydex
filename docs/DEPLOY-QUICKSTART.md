# Deploy (free tier) - Vercel + Render + MongoDB Atlas

Quickstart for a zero-cost production deploy. Full details (providers, scaling,
rollback, security) live in `DEPLOYMENT.md`.

```text
Vercel (Next.js + API)  ── POST /emit ──>  Render: rydex-socket (Socket.IO)
        │                                          │
        └──────────── MongoDB Atlas M0 ────────────┘
```

> ⚠️ **Before anything else:** make sure `.env` is never pushed.
> `git ls-files .env` must print nothing (it is gitignored).

---

## Step 0 - Secrets to generate (once)

```bash
# Node one-liners (run locally)
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"   # AUTH_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"   # SOCKET_INTERNAL_SECRET
```

Keep both in a notepad - the **same values** go to Vercel and Render.

---

## Step 1 - MongoDB Atlas (5 min)

1. <https://cloud.mongodb.com> → **Free (M0)** cluster.
2. **Database Access**: new user, password, **Read and write to any database**.
3. **Network Access**: `0.0.0.0/0` (Vercel has no fixed IPs on the free plan).
4. **Connect → Drivers**: copy the string →
   `mongodb+srv://user:pass@cluster0.xxxxx.mongodb.net/rydex?retryWrites=true&w=majority`

---

## Step 2 - Render: socket service (5 min)

Easiest path - **Blueprint**:

1. <https://dashboard.render.com> → **New → Blueprint** → connect the
   `baby-ghost1/rydex` repo → Render reads `render.yaml` from the repo root.
2. Fill the three prompted secrets (`sync: false` fields):
   - `AUTH_SECRET` - same as above
   - `SOCKET_INTERNAL_SECRET` - same as above
   - `AUTH_URL` - your Vercel URL, e.g. `https://rydex.vercel.app`
     (update it later if you add a custom domain)
3. Deploy. Note the service URL: `https://rydex-socket-xxxx.onrender.com`.

Manual fallback (if not using the blueprint): **New → Web Service**,
build `npm ci --include=dev`, start `npm run socket`, health check `/health`.

Verify: `curl https://<socket-url>/health` → `{"ok":true,"service":"rydex-socket",...}`

---

## Step 3 - Vercel: web app (5 min)

1. <https://vercel.com/new> → import `baby-ghost1/rydex`.
2. **Framework**: Next.js - **Root Directory**: `frontend`
   (enable *"Include source files outside of the Root Directory"*).
3. **Settings → Environment Variables** - paste all of these (Production):

```env
# Required
MONGODB_URI=<your Atlas URI from Step 1>
AUTH_SECRET=<same as Render>
AUTH_URL=https://<your-app>.vercel.app

# Realtime - both MUST be set or realtime silently disables in production
NEXT_PUBLIC_SOCKET_URL=https://<socket-url from Step 2>
SOCKET_EMIT_URL=https://<socket-url from Step 2>
SOCKET_INTERNAL_SECRET=<same as Render>

# Uploads (required in production)
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...

# Email / OTP (registration + password reset need this in production)
EMAIL_USER=...
EMAIL_PASS=...
EMAIL_FROM=RYDEX <no-reply@yourdomain.com>

# Optional integrations
GEOAPIFY_KEY=...
AUTH_GOOGLE_ID=...
AUTH_GOOGLE_SECRET=...
RAZORPAY_KEY_ID=...
RAZORPAY_KEY_SECRET=...
NEXT_PUBLIC_ZEGO_APP_ID=...
ZEGO_SERVER_SECRET=...
```

4. **Deploy**. First build takes ~2 min (Turbopack).

> `NEXT_PUBLIC_*` values are baked at **build time** - set them *before*
> deploying, and redeploy after changing any.

---

## Step 4 - Post-deploy wiring (5 min)

1. Reopen Render → **rydex-socket → Environment** → set `AUTH_URL` to the final
   Vercel URL → **Deploy/Restart** (CORS allow-list is read at boot).
2. Google Cloud Console (if used): add origin
   `https://<app>.vercel.app` + redirect URI
   `https://<app>.vercel.app/api/auth/callback/google`.
3. Create the admin (from repo root, with production `MONGODB_URI` in env):

   ```powershell
   $env:MONGODB_URI="<atlas uri>"; $env:AUTH_SECRET="<secret>"
   $env:ADMIN_EMAIL="admin@yourdomain.com"; $env:ADMIN_PASSWORD="<12+ chars>"; $env:ADMIN_NAME="Admin"
   npm run create-admin
   ```

   **Do not run `npm run seed` against production.**
4. Atlas → Network Access: keep `0.0.0.0/0` only while testing.

---

## Step 5 - Smoke test (2 min)

- [ ] `https://<app>.vercel.app/` renders (hero + navbar).
- [ ] `curl https://<socket>/health` → `{"ok":true,...}`.
- [ ] Register → OTP email arrives → verify → login works.
- [ ] `/fleet` filters + create a booking.
- [ ] Open a booking → **chat sends/receives without refresh** (socket live).
- [ ] `/api/config` shows your integrations as enabled.

---

## Known free-tier limitations

| Limitation | Impact | When to fix |
| --- | --- | --- |
| Render free sleeps after ~15 min idle | First realtime event after idle is delayed ~30-60 s (client auto-reconnects) | Real users arrive |
| Vercel Hobby function limits | Fine for this app's API; no cron | Scale |
| Atlas M0: 512 MB, shared | Fine for demo/small launch | Real data volume |
| No custom domain on Render free | Socket URL is `*.onrender.com` (HTTPS - OK) | Branding |
| In-process rate limits | Per-instance only | Multi-instance |

Upgrade paths: Render **Starter ($7/mo)** removes socket sleep; Vercel
**Pro** raises function limits; Atlas **M10** for production data.
