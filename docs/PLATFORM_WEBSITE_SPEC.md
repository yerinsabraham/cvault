# Creovine Platform — Website Developer Specification

**Version:** 1.0  
**Date:** February 2026  
**Prepared by:** Creovine Engineering  
**Recipient:** Website / Frontend Developer  

---

## 1. What Is Creovine?

Creovine is a developer platform — similar in concept to BytePlus, Twilio, or Firebase —
that provides SDKs, APIs, and downloadable apps that other developers and businesses
integrate into their own products.

The first product is **CVault**: a white-label VPN SDK + desktop app (macOS, Windows)
with iOS and Android apps coming. More products (auth SDK, analytics, etc.) will be
added to the same platform over time.

The website serves two types of users:

| User Type | What they do |
|---|---|
| **Developers / Businesses** | Sign up, browse products, download apps/SDKs, manage licenses, view usage, pay |
| **Creovine Admins** | Manage products, generate and revoke license keys, view all tenants, manage billing, upload new versions |

---

## 2. Authentication — Use the Existing Backend (NOT Firebase)

**Recommendation: Use the existing Creovine backend for all auth.**

Do not use Firebase Auth. Reasons:

- The backend already has tenant-based auth (register, login, JWT) at `api.creovine.com`
- Every website user IS a tenant — the same `Tenant` record drives their API key,
  license entitlements, and billing
- Adding Firebase would create two separate identity systems that would need to stay
  in sync, causing confusion and bugs
- The existing backend already returns JWT tokens — the website just stores them
  in `localStorage` or `httpOnly` cookies and attaches them to every API call

### Auth Endpoints (already live)

| Action | Endpoint |
|---|---|
| Register | `POST /cvault/v1/auth/register` |
| Login | `POST /cvault/v1/auth/login` |
| Token refresh | Add to backend if needed (currently 15-min JWT) |

### Website Auth Flow

```
User enters email + password on website
  → POST /cvault/v1/auth/register  (sign up)
  → POST /cvault/v1/auth/login     (sign in)
  ← Returns: { accessToken, user: { id, email, tenantId } }

Website stores accessToken (httpOnly cookie recommended for security)
Every subsequent API call: Authorization: Bearer <accessToken>
```

### Admin vs Regular User

Add an `isAdmin` boolean or `role` field to the `TenantUser` model on the backend.
Creovine staff accounts with `role: 'ADMIN'` see the admin dashboard sections.
Regular developer accounts see only their own data.

---

## 3. Website Pages & Structure

```
creovine.com
│
├── / (Landing page)
├── /products                  ← browse all products
│   └── /products/cvault       ← CVault product page
├── /docs                      ← documentation hub
│   └── /docs/cvault           ← CVault docs
├── /pricing                   ← plans + pricing
├── /sign-up
├── /sign-in
│
└── /dashboard                 ← authenticated area
    ├── /dashboard/overview        ← summary stats
    ├── /dashboard/products        ← my licensed products
    │   └── /dashboard/products/cvault
    ├── /dashboard/api-keys        ← tenant API keys
    ├── /dashboard/licenses        ← license keys
    ├── /dashboard/usage           ← usage + metrics
    ├── /dashboard/billing         ← subscription + payments
    └── /dashboard/downloads       ← download app files

└── /admin                     ← Creovine-staff only
    ├── /admin/tenants             ← all customer accounts
    ├── /admin/licenses            ← all license keys across all tenants
    ├── /admin/products            ← manage products + versions + downloads
    ├── /admin/billing             ← all payments + revenue
    └── /admin/metrics             ← platform-wide analytics
```

---

## 4. Dashboard — Developer/Customer Sections

### 4.1 Overview

Summary cards visible on first login:

- Active products licensed
- Current plan (Trial / Starter / Pro / Enterprise)
- VPN connections used this month vs limit
- Bandwidth used this month
- Next billing date

### 4.2 My Products

Lists all Creovine products the tenant has access to.  
For each product shows:
- Product name + icon
- Current plan
- License key (masked, with copy button)
- Uses remaining (e.g. "3 / 5 trial connects left")
- Download buttons for each platform (macOS, Windows, iOS, Android, SDK)
- Link to docs for that product
- Upgrade button

**API call:**
```
GET /cvault/v1/licenses?tenantId=<id>
x-api-key: <tenant api key>
Authorization: Bearer <jwt>
```

### 4.3 API Keys

Shows the tenant's API key and API secret (used for backend-to-backend calls).
- Copy to clipboard button
- Regenerate button (creates new key, warns old one will stop working)

### 4.4 License Keys

Table of all license keys for the tenant:

| Key | Product | Plan | Uses | Expires | Status | Actions |
|---|---|---|---|---|---|---|
| cvlt_trial_xxx | CVault VPN | TRIAL | 3/5 | Never | Active | Revoke |

- Filter by product / plan / status
- Copy key button
- Revoke button (calls `POST /cvault/v1/licenses/:key/revoke`)

### 4.5 Usage & Metrics

Charts and tables showing:

- **VPN Connections:** daily connect count over last 30 days (bar chart)
- **Bandwidth:** MB used per day (line chart)
- **Active Devices:** how many devices registered
- **SDK Downloads:** how many times they've downloaded the SDK files
- **Connection Minutes:** total VPN uptime

**API call:**
```
GET /cvault/v1/usage?from=2026-01-01&to=2026-02-01
Authorization: Bearer <jwt>
```

### 4.6 Billing

- Current plan + price
- Next payment date
- Payment method (card ending in XXXX)
- Invoice history (date, amount, status, download PDF)
- Upgrade / downgrade plan
- Cancel subscription

Integration: **Stripe** (recommended over Paystack for international reach;
add Paystack as secondary option for African markets specifically).

Stripe objects needed:
- `Customer` — one per Creovine tenant
- `Subscription` — tied to their plan (Trial/Starter/Pro/Enterprise)
- `Product` + `Price` — one per plan per product
- Webhook: `invoice.paid`, `invoice.payment_failed`, `customer.subscription.deleted`
  → backend updates tenant plan + license limits accordingly

### 4.7 Downloads

Table of available downloads for each product the tenant has licensed:

| File | Platform | Version | Size | Released |
|---|---|---|---|---|
| CVault.dmg | macOS | 1.0.0 | 19 MB | Feb 24 2026 |
| CVaultSetup.exe | Windows | 1.0.0 | — | Coming soon |
| CVault.apk | Android | — | — | Coming soon |
| cvault_sdk.dart | Flutter SDK | 1.0.0 | — | Coming soon |

- Download button for each (pre-signed URL from storage, or direct CDN link)
- Shows changelog / release notes per version

---

## 5. Admin Dashboard — Creovine-Staff Only

Only accounts with `role: ADMIN` can access `/admin/*`.

### 5.1 All Tenants

Full table of every customer account:

| Tenant | Email | Plan | Products | Registered | Status | Actions |
|---|---|---|---|---|---|---|
| Acme Corp | dev@acme.com | Pro | CVault VPN | Jan 2026 | Active | View / Suspend |

- Search by name / email
- Filter by plan / status
- Click into a tenant → see all their licenses, usage, billing, devices
- Suspend / unsuspend account
- Manually assign or change plan
- Impersonate tenant (view their dashboard as them, for support)

### 5.2 License Key Management

- Generate new license keys (form: tenantId, product, plan, maxUses, expiry)
- Bulk generate (e.g. "generate 100 TRIAL keys for CVault")
- Search / filter all keys across all tenants
- Revoke individual keys
- Export as CSV

**Uses the admin license API:**
```
POST   /cvault/v1/licenses          (x-admin-key header)
GET    /cvault/v1/licenses
POST   /cvault/v1/licenses/:key/revoke
```

### 5.3 Product & Version Management

For each product (CVault, future products):

- Product name, description, icon, status (active / beta / deprecated)
- **Versions table** — where you upload new releases:

  | Version | Platform | File | Size | Release Notes | Date | Published |
  |---|---|---|---|---|---|---|
  | 1.0.0 | macOS | CVault.dmg | 19 MB | Initial release | Feb 24 | ✅ |
  | 1.1.0 | macOS | CVault.dmg | 20 MB | Bug fixes | — | Draft |

- Upload new version → stores file to S3/CDN → updates download links automatically
- Toggle "latest" version per platform
- Write release notes (markdown editor)
- Set publish date (can schedule future releases)

**This is what makes downloads on the customer dashboard update automatically** —
when you publish a new version here, every customer's download page immediately
shows the new file.

### 5.4 Platform-Wide Billing & Revenue

- Total MRR (Monthly Recurring Revenue)
- Revenue by plan (Trial conversions, Starter, Pro, Enterprise)
- Churn rate
- New signups per day / week
- Failed payments + at-risk accounts
- All invoices across all tenants
- Manual refund / credit button

Powered by Stripe dashboard + webhook data synced to the backend DB.

### 5.5 Platform Metrics

Aggregate across ALL tenants:

- Total VPN connections today / this month
- Total bandwidth served
- Total active devices
- Total SDK downloads per platform (macOS / Windows / Android / iOS / Flutter)
- Downloads over time (line chart)
- Top tenants by usage
- Server health (WireGuard peer count, server load, uptime)

---

## 6. Download & Version Tracking

### How to track downloads

When a user clicks Download on the website:

1. Website calls backend: `POST /cvault/v1/downloads/track`
   ```json
   { "product": "cvault-vpn", "platform": "macos", "version": "1.0.0", "tenantId": "..." }
   ```
2. Backend increments a `downloads` counter in the DB
3. Backend returns a pre-signed URL (from S3/CDN) that expires in 5 minutes
4. Website redirects user to that URL to download the file

This way every download is counted, attributed to a tenant, and the actual file
URL is never permanently exposed.

### New backend table needed: `product_releases`

```
product_releases
────────────────────────────────────────────
id          uuid
product     string          (e.g. "cvault-vpn")
version     string          (e.g. "1.0.0")
platform    string          (macos | windows | android | ios | flutter-sdk | js-sdk)
fileUrl     string          (S3/CDN URL)
fileSize    int             (bytes)
releaseNotes text
isLatest    boolean
publishedAt datetime
createdAt   datetime
```

### New backend table needed: `download_events`

```
download_events
────────────────────────────────────────────
id          uuid
tenantId    string
product     string
platform    string
version     string
ip          string          (anonymized)
createdAt   datetime
```

---

## 7. Backend API Additions Needed

The website developer will need these endpoints added to the backend.
Creovine engineering will build them — this is what needs to be added:

| Endpoint | Purpose |
|---|---|
| `GET  /cvault/v1/usage` | Tenant usage metrics |
| `GET  /admin/tenants` | List all tenants (admin) |
| `GET  /admin/tenants/:id` | Get one tenant detail (admin) |
| `PATCH /admin/tenants/:id` | Update tenant status/plan (admin) |
| `GET  /admin/metrics` | Platform-wide metrics (admin) |
| `GET  /admin/revenue` | Billing/revenue summary (admin) |
| `POST /cvault/v1/downloads/track` | Track + serve download |
| `GET  /admin/releases` | List product releases (admin) |
| `POST /admin/releases` | Upload new release (admin) |
| `PATCH /admin/releases/:id` | Publish / set as latest (admin) |
| `POST /stripe/webhook` | Receive Stripe payment events |
| `POST /billing/create-checkout` | Start Stripe checkout session |
| `POST /billing/portal` | Open Stripe billing portal |
| `GET  /billing/plans` | List available plans + prices |

---

## 8. Tech Stack Recommendation for Website

| Concern | Recommendation | Notes |
|---|---|---|
| Framework | Next.js 14 (App Router) | SSR for public pages, CSR for dashboard |
| Styling | Tailwind CSS | |
| Charts | Recharts or Chart.js | Usage + revenue graphs |
| Auth state | Zustand or React Context | Store JWT + user object |
| API calls | Axios or React Query (TanStack) | Auto token refresh, caching |
| Payments | Stripe.js + Stripe Elements | Card input on upgrade page |
| File uploads | AWS S3 presigned PUT | Admin uploads new release files |
| Hosting | Vercel | Easiest for Next.js |
| Domain | creovine.com | Already owned |

---

## 9. Environment Variables the Website Needs

```env
NEXT_PUBLIC_API_URL=https://api.creovine.com
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxx
STRIPE_SECRET_KEY=sk_live_xxx                   # server-side only
STRIPE_WEBHOOK_SECRET=whsec_xxx                 # server-side only
ADMIN_EMAILS=admin@creovine.com                 # comma-separated
```

---

## 10. Security Rules

- All `/admin/*` routes: verify `role === 'ADMIN'` on every request server-side
- JWT stored in `httpOnly` cookie (not localStorage) to prevent XSS theft
- All download URLs are pre-signed and expire after 5 minutes
- License keys shown in dashboard are masked by default: `cvlt_trial_••••••••`
- Rate limit the login endpoint (already done on backend)
- Admin actions (bulk key generation, tenant suspension) require re-authentication confirmation

---

## 11. Stripe Billing Plans

| Plan | Price | Limits |
|---|---|---|
| Trial | Free | 5 VPN connects, 1 device, 500 MB |
| Starter | $9 / month | 100 connects, 3 devices, 10 GB |
| Pro | $29 / month | Unlimited connects, 10 devices, 100 GB |
| Enterprise | Custom | Unlimited everything, SLA, dedicated support |

When a tenant upgrades from Trial → Starter:
1. Stripe creates subscription
2. Stripe webhook fires `invoice.paid`
3. Backend updates tenant's license `plan` to STARTER, `maxUses` to 100
4. Dashboard immediately reflects new limits

---

## 12. Summary — What the Website Developer Needs to Build

### Must Have (Phase 1)
- [ ] Landing page with product listings (CVault as first product)
- [ ] Sign up / Sign in (using existing backend auth)
- [ ] Customer dashboard: overview, products, license keys, downloads
- [ ] Admin dashboard: tenant list, license management, product versions
- [ ] Download tracking + pre-signed URL delivery
- [ ] Stripe checkout for plan upgrades

### Nice to Have (Phase 2)
- [ ] Usage charts + bandwidth graphs
- [ ] Admin revenue / MRR dashboard
- [ ] SDK documentation pages with code samples
- [ ] Changelog / release notes pages
- [ ] Email notifications (new invoice, trial about to expire)
- [ ] Paystack as secondary payment option

### Handoff Checklist from Creovine Engineering
- [x] Backend API running at `api.creovine.com`
- [x] Auth endpoints (register, login)
- [x] License system (create, validate, revoke)
- [x] Tenant + TenantUser database models
- [ ] Usage metrics endpoint (to be added)
- [ ] Admin tenant management endpoints (to be added)
- [ ] Product releases + download tracking (to be added)
- [ ] Stripe webhook handler (to be added)

---

## 13. Contact & Repository

- **Backend API:** `https://api.creovine.com`
- **API Health Check:** `GET https://api.creovine.com/health`
- **GitHub Repo:** `https://github.com/yerinsabraham/cvault`
- **Backend .env location on server:** `/opt/cvault-backend/.env`
- **Server IP:** `165.22.138.31`
