# Security Documentation

This document outlines the security measures implemented in RYDEX and provides guidelines for secure deployment.

## Table of Contents

1. [Security Overview](#security-overview)
2. [Authentication & Authorization](#authentication--authorization)
3. [Data Protection](#data-protection)
4. [API Security](#api-security)
5. [Environment & Configuration](#environment--configuration)
6. [Deployment Security Checklist](#deployment-security-checklist)
7. [Incident Response](#incident-response)
8. [Security Testing](#security-testing)

---

## Security Overview

RYDEX implements defense-in-depth security with multiple layers:

- **Server-side validation**: All business logic validated on server
- **Encryption at rest**: Sensitive data encrypted in database
- **Secure sessions**: JWT with database-backed verification
- **Rate limiting**: Per-endpoint protection against abuse
- **Security headers**: Browser protection against common attacks

---

## Authentication & Authorization

### Implemented Controls

| Control | Implementation | Status |
|---------|---------------|--------|
| Password hashing | bcrypt (cost 12) | ✅ |
| OTP hashing | SHA-256 + pepper + expiry | ✅ |
| Session management | Auth.js JWT + DB verification | ✅ |
| Role-based access | User/Partner/Admin roles | ✅ |
| Resource ownership | Server-side ownership checks | ✅ |
| Email verification | Required before sign-in | ✅ |
| Generic error responses | No account enumeration | ✅ |

### Authentication Flow

1. **Registration**: Email + password → bcrypt hash → OTP sent → email verified
2. **Sign-in**: Credentials verified → JWT issued → session created
3. **Session validation**: JWT validated → user re-fetched from DB → role/status verified
4. **Authorization**: Each API checks role + resource ownership

### Role Matrix

| Capability | Rider | Partner | Admin |
|------------|-------|---------|-------|
| Browse fleet | ✅ | ✅ | ✅ |
| Create booking | ✅ | ✅* | ✅ |
| View own bookings | ✅ | Partner rides | All |
| Accept/reject rides | ❌ | ✅ | Override |
| Manage fleet | ❌ | ✅ | ❌ |
| Admin dashboards | ❌ | ❌ | ✅ |

*Cannot book own vehicles

---

## Data Protection

### Encryption Standards

| Data Type | Encryption | Key Management |
|-----------|-----------|----------------|
| Passwords | bcrypt (cost 12) | N/A (one-way) |
| OTP codes | SHA-256 + AUTH_SECRET pepper | AUTH_SECRET |
| Payout account numbers | AES-256-GCM | Derived from AUTH_SECRET |
| Socket tokens | HMAC-SHA256 | AUTH_SECRET |

### Payout Account Security

- Full account number encrypted with AES-256-GCM
- Random IV + auth tag per encryption
- API responses expose only `accountNumberLast4`
- Key rotation requires re-encryption

### Data Minimization

- `select: false` on sensitive fields (passwordHash, OTP hashes)
- Explicit opt-in for sensitive field queries
- No plaintext secrets in logs or responses

---

## API Security

### Input Validation

All mutating endpoints use Zod schemas:
- Registration, login, password reset
- Vehicle creation/update
- Booking creation/status transitions
- Partner onboarding steps
- Payout account updates
- Admin vendor reviews

### Rate Limiting

| Endpoint | Limit | Window |
|----------|-------|--------|
| Auth registration | 5 req | 15 min |
| OTP verification | 5 req | 10 min |
| Password reset | 3 req | 15 min |
| Booking creation | 8 req | 1 min |
| Chat messages | 30 req | 1 min |
| Location updates | 60 req | 1 min |
| Contact form | 5 req | 15 min |
| Geo search | 20 req | 1 min |

### Security Headers (next.config.ts)

```typescript
headers: [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-XSS-Protection', value: '1; mode=block' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
]
```

### CORS Configuration

- Socket.IO: Allow-listed origins from AUTH_URL + localhost
- API routes: Same-origin (Next.js handles)

---

## Environment & Configuration

### Required Production Variables

```env
# Core (REQUIRED)
MONGODB_URI=mongodb+srv://user:secure_password@cluster/rydex
AUTH_SECRET=32-byte-random-secret  # Generate: npx auth secret
AUTH_URL=https://your-domain.com

# Socket.IO (REQUIRED for realtime)
NEXT_PUBLIC_SOCKET_URL=https://socket.your-domain.com
SOCKET_EMIT_URL=https://socket.your-domain.com
SOCKET_INTERNAL_SECRET=long-random-secret  # 32+ chars

# Optional Integrations
CLOUDINARY_CLOUD_NAME=your_cloud
CLOUDINARY_API_KEY=your_key
CLOUDINARY_API_SECRET=your_secret
EMAIL_USER=your@gmail.com
EMAIL_PASS=gmail_app_password  # Not account password!
AUTH_GOOGLE_ID=your_client_id
AUTH_GOOGLE_SECRET=your_client_secret
RAZORPAY_KEY_ID=rzp_test_xxx
RAZORPAY_KEY_SECRET=your_secret
GEOAPIFY_KEY=your_key
NEXT_PUBLIC_ZEGO_APP_ID=your_app_id
ZEGO_SERVER_SECRET=32-char-secret
```

### Secret Generation Commands

```bash
# Auth.js secret (32 bytes)
npx auth secret
# or
openssl rand -base64 32

# Socket internal secret
openssl rand -base64 48

# ZEGOCLOUD server secret (exactly 32 chars)
openssl rand -base64 32 | tr -d '=+/' | cut -c1-32
```

### Security Rules

1. **Never commit `.env`** - Added to `.gitignore`
2. **Use environment variables** - Not `.env` files in production
3. **Rotate secrets** - After any potential exposure
4. **Different secrets per environment** - Dev/Staging/Prod
5. **Principle of least privilege** - Minimal DB/user permissions

---

## Deployment Security Checklist

### Pre-Deployment

- [ ] All production secrets generated and stored securely
- [ ] `.env` NOT committed to git (verify with `git ls-files | grep .env`)
- [ ] MongoDB Atlas: IP allowlist configured (not 0.0.0.0/0)
- [ ] MongoDB Atlas: Database user with read/write only (no admin)
- [ ] Cloudinary: Upload presets with format/size restrictions
- [ ] Razorpay: Webhook configured for payment reconciliation
- [ ] Google OAuth: Authorized domains configured
- [ ] Email: App password (not account password) for Gmail
- [ ] HTTPS enforced on all domains
- [ ] Security headers verified in production

### Post-Deployment Verification

- [ ] `GET /api/config` shows correct integrations enabled
- [ ] Auth flow works: register → verify → login → dashboard
- [ ] Admin dashboard accessible only to admin role
- [ ] Partner dashboard accessible only to approved partners
- [ ] Socket.IO health check returns `{ ok: true }`
- [ ] Real-time events work (booking updates, chat, location)
- [ ] Payment flow works (Razorpay test mode)
- [ ] File uploads go to Cloudinary (not local)
- [ ] Emails delivered (check spam folder)
- [ ] Rate limiting triggers appropriately
- [ ] Error pages don't leak stack traces

### Ongoing Security

- [ ] Monitor failed login attempts
- [ ] Review MongoDB access logs
- [ ] Update dependencies monthly (`npm audit`)
- [ ] Rotate secrets quarterly
- [ ] Backup verification monthly
- [ ] Security headers audit quarterly

---

## Incident Response

### Credential Exposure Response

If any secret is exposed:

1. **Immediately rotate the secret**
   - Generate new secret
   - Update in all environments
   - Redeploy affected services

2. **Audit access**
   - Check MongoDB access logs
   - Review Auth.js session activity
   - Check for unauthorized admin creation

3. **Force re-authentication**
   - Change AUTH_SECRET to invalidate all sessions
   - Users will need to log in again

4. **Document incident**
   - What was exposed
   - When detected
   - Actions taken
   - Lessons learned

### Common Scenarios

| Scenario | Response |
|----------|----------|
| MongoDB password leaked | Rotate in Atlas, update MONGODB_URI, redeploy |
| AUTH_SECRET leaked | Generate new, update all services, force re-login |
| Socket secret leaked | Rotate, update web + socket services |
| Google OAuth secret leaked | Rotate in Google Cloud Console, update env |
| Razorpay secret leaked | Rotate in Razorpay dashboard, update env |

---

## Security Testing

### Automated Tests

```bash
# Run all tests including security-related
npm test

# Type checking
npm run typecheck

# Linting
npm run lint

# Build verification
npm run build
```

### Manual Security Tests

#### Authentication Tests
- [ ] Register with existing email → proper error
- [ ] Login with wrong password → generic error (no enumeration)
- [ ] Login with unverified email → blocked
- [ ] Expired OTP → rejected
- [ ] Used OTP → rejected
- [ ] Password reset for non-existent email → generic success

#### Authorization Tests
- [ ] Rider cannot access `/dashboard/partner`
- [ ] Partner cannot access `/dashboard/admin`
- [ ] Non-owner cannot update vehicle
- [ ] Non-participant cannot view booking
- [ ] Non-admin cannot approve vendors

#### Input Validation Tests
- [ ] SQL injection in search → sanitized
- [ ] XSS in chat messages → escaped
- [ ] Oversized file upload → rejected
- [ ] Invalid file type → rejected
- [ ] Malformed booking data → validation error

#### Rate Limiting Tests
- [ ] Exceed login attempts → 429 response
- [ ] Exceed booking attempts → 429 response
- [ ] Exceed chat messages → 429 response

### Penetration Testing Checklist

- [ ] OWASP Top 10 coverage
- [ ] Authentication bypass attempts
- [ ] Authorization bypass attempts
- [ ] Input validation fuzzing
- [ ] Session management testing
- [ ] API endpoint enumeration
- [ ] Business logic flaws
- [ ] Client-side security (CSP, headers)

---

## Security Contacts

For security issues, contact: **security@rydex.app**

### Responsible Disclosure

We appreciate security researchers who:
1. Report vulnerabilities privately
2. Allow reasonable time for fixes
3. Don't access/modify user data
4. Don't disrupt services

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-11-04 | Initial security documentation |

---

**Last Updated**: November 4, 2026  
**Next Review**: February 4, 2027