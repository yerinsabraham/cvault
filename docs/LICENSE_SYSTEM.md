# Creovine License System — Full Implementation Guide

## Overview

The license system lives at the **Creovine platform level** (the backend), not inside
any individual product. CVault VPN is the first product to use it. Future Creovine
products (auth SDK, analytics, etc.) plug into the same system with zero rebuild.

A **License** represents a permission grant: which tenant can use which product,
under which plan, with which limits. Every VPN connect call checks the license
before proceeding.

---

## Architecture

```
Creovine Backend (api.creovine.com)
│
├── /cvault/v1/auth/*          ← existing: user login/register
├── /cvault/v1/devices/*       ← existing: device management
├── /cvault/v1/vpn/*           ← existing: connect/disconnect
│                                  └── NOW checks license before allowing connect
│
└── /cvault/v1/licenses/*      ← NEW: license management (admin-only)
    ├── POST   /                   create a license key
    ├── GET    /                   list all licenses
    ├── GET    /:key               get one license
    ├── POST   /:key/revoke        revoke a license
    └── GET    /:key/usage         get usage stats for a license
```

---

## Database Schema (New Table)

Added to `backend/prisma/schema.prisma`:

```prisma
model License {
  id              String        @id @default(uuid())
  key             String        @unique                  // e.g. cvlt_live_xxxxx
  tenantId        String        @map("tenant_id")
  product         String                                 // e.g. "cvault-vpn"
  plan            LicensePlan   @default(TRIAL)
  status          LicenseStatus @default(ACTIVE)
  maxUses         Int?          @map("max_uses")         // null = unlimited
  usedCount       Int           @default(0) @map("used_count")
  expiresAt       DateTime?     @map("expires_at")       // null = never expires
  metadata        Json          @default("{}")           // custom per-product data
  createdAt       DateTime      @default(now()) @map("created_at")
  updatedAt       DateTime      @updatedAt @map("updated_at")

  tenant          Tenant        @relation(...)

  @@map("licenses")
}

enum LicensePlan {
  TRIAL       // limited uses (default: 5 VPN connects)
  STARTER     // limited uses, higher cap
  PRO         // unlimited (within bandwidth)
  ENTERPRISE  // unlimited + custom config
}

enum LicenseStatus {
  ACTIVE
  REVOKED
  EXPIRED
}
```

### How existing Tenant model connects

The `Tenant` table already exists. A tenant can hold **many licenses** (one per product
they've purchased). This adds a one-to-many relation: `Tenant → License[]`.

---

## License Key Format

Keys are prefixed so they're identifiable at a glance:

| Prefix       | Meaning                              |
|--------------|--------------------------------------|
| `cvlt_trial_`| CVault trial key                     |
| `cvlt_live_` | CVault paid key                      |
| `crvn_live_` | Generic Creovine platform key        |

Example: `cvlt_trial_a3f8b2c1d9e4f567890abcdef123456`

Generated with: 32 random hex bytes → prefixed.

---

## Plan Limits (CVault VPN — defaults)

| Plan       | Max VPN Connects | Bandwidth | Devices |
|------------|-----------------|-----------|---------|
| TRIAL      | 5               | 500 MB    | 1       |
| STARTER    | 100             | 10 GB     | 3       |
| PRO        | unlimited       | 100 GB    | 10      |
| ENTERPRISE | unlimited       | custom    | custom  |

These defaults live in `license.service.ts`. Per-tenant overrides are stored in
the `metadata` JSON field.

---

## Request Flow — VPN Connect with License Check

```
Client app                  Creovine Backend
───────────────────────────────────────────────────────────
POST /cvault/v1/vpn/connect
 Headers:
   x-api-key: <tenant api key>
   Authorization: Bearer <user JWT>
 Body:
   { deviceId, licenseKey? }
                          │
                          ▼
                    [1] apiKeyAuth middleware
                          → loads Tenant from x-api-key
                          │
                          ▼
                    [2] jwtAuth middleware
                          → loads TenantUser from JWT
                          │
                          ▼
                    [3] licenseCheck (new)
                          → if licenseKey provided: validate it
                          → if no licenseKey: check tenant's default license
                          → checks: status=ACTIVE, not expired
                          → checks: usedCount < maxUses (or unlimited)
                          → if TRIAL and limit hit → 402 Payment Required
                          │
                          ▼
                    [4] create Session + increment usedCount atomically
                          │
                          ▼
                    200 OK { sessionId, plan, usesRemaining }

OR if license invalid/expired:

                    402 {
                          error: "LicenseRequired",
                          message: "Trial limit reached. Upgrade to continue.",
                          upgradeUrl: "https://creovine.com/upgrade"
                        }
```

---

## API Endpoints (New)

All admin endpoints require a special admin API key header:
`x-admin-key: <ADMIN_SECRET from .env>`

### Create License
```
POST /cvault/v1/licenses
x-admin-key: <ADMIN_SECRET>

Body:
{
  "tenantId": "uuid",
  "product": "cvault-vpn",
  "plan": "TRIAL",           // TRIAL | STARTER | PRO | ENTERPRISE
  "maxUses": 5,              // omit for unlimited
  "expiresAt": "2026-12-31", // omit for no expiry
  "metadata": {}
}

Response 201:
{
  "id": "uuid",
  "key": "cvlt_trial_a3f8b2c1...",
  "tenantId": "...",
  "product": "cvault-vpn",
  "plan": "TRIAL",
  "maxUses": 5,
  "usedCount": 0,
  "expiresAt": null,
  "status": "ACTIVE",
  "createdAt": "..."
}
```

### List Licenses
```
GET /cvault/v1/licenses?tenantId=xxx&product=cvault-vpn&plan=TRIAL
x-admin-key: <ADMIN_SECRET>

Response 200:
{
  "licenses": [...],
  "total": 42
}
```

### Get One License
```
GET /cvault/v1/licenses/:key
x-admin-key: <ADMIN_SECRET>

Response 200: { license object + usesRemaining }
```

### Revoke License
```
POST /cvault/v1/licenses/:key/revoke
x-admin-key: <ADMIN_SECRET>

Response 200: { "status": "REVOKED" }
```

### Validate License (public — used by SDKs)
```
POST /cvault/v1/licenses/validate
x-api-key: <tenant api key>

Body: { "key": "cvlt_trial_xxx", "product": "cvault-vpn" }

Response 200:
{
  "valid": true,
  "plan": "TRIAL",
  "usesRemaining": 3,
  "expiresAt": null
}

Response 402:
{
  "valid": false,
  "reason": "trial_exhausted",  // trial_exhausted | expired | revoked | invalid
  "upgradeUrl": "https://creovine.com/upgrade"
}
```

---

## SDK Integration (How App Developers Use It)

When a developer integrates the CVault SDK into their app, they:

1. Sign up on creovine.com → get a `tenantId` + `apiKey`
2. Request a license key (you generate it from the admin API)
3. Initialize the SDK with their license key:

### Flutter SDK usage
```dart
await CVaultSDK.init(
  licenseKey: 'cvlt_trial_a3f8b2c1...',
  apiKey: 'their-tenant-api-key',
);

// SDK enforces limits internally — throws LicenseException when exhausted
await CVaultSDK.connect();
```

### JS SDK usage
```js
const cvault = new CVaultSDK({
  licenseKey: 'cvlt_trial_a3f8b2c1...',
  apiKey: 'their-tenant-api-key',
});

await cvault.vpn.connect({ deviceId });
// throws { code: 'LICENSE_EXHAUSTED' } when trial is up
```

---

## Files Being Created / Modified

```
backend/
├── prisma/
│   └── schema.prisma                ← MODIFIED: add License model + enums
│
├── src/
│   ├── services/
│   │   └── license.service.ts       ← NEW: key gen, validate, create, revoke
│   │
│   ├── middleware/
│   │   └── license.middleware.ts    ← NEW: licenseCheck() used on /vpn/connect
│   │
│   ├── routes/
│   │   ├── license.routes.ts        ← NEW: CRUD admin endpoints + /validate
│   │   └── vpn.routes.ts            ← MODIFIED: add licenseCheck preHandler
│   │
│   └── index.ts                     ← MODIFIED: register license routes
```

---

## Environment Variables (add to .env)

```env
ADMIN_SECRET=your-strong-admin-secret-here
TRIAL_MAX_USES=5
```

---

## Migration Steps (on the server)

```bash
# 1. SSH into DigitalOcean
ssh -i ~/.ssh/cvault_vpn_server root@165.22.138.31

# 2. Pull latest code
cd /opt/cvault && git pull

# 3. Install deps
cd backend && npm install

# 4. Run Prisma migration
npx prisma migrate deploy

# 5. Restart backend
systemctl restart cvault-backend
```

---

## Testing the System

```bash
# Create a trial license (replace with real tenantId)
curl -X POST https://api.creovine.com/cvault/v1/licenses \
  -H "x-admin-key: $ADMIN_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"tenantId":"<id>","product":"cvault-vpn","plan":"TRIAL","maxUses":5}'

# Validate it
curl -X POST https://api.creovine.com/cvault/v1/licenses/validate \
  -H "x-api-key: <tenant-api-key>" \
  -H "Content-Type: application/json" \
  -d '{"key":"cvlt_trial_xxx","product":"cvault-vpn"}'

# Connect VPN (license checked automatically)
curl -X POST https://api.creovine.com/cvault/v1/vpn/connect \
  -H "x-api-key: <api-key>" \
  -H "Authorization: Bearer <jwt>" \
  -H "Content-Type: application/json" \
  -d '{"deviceId":"<id>"}'
# After 5 connects → returns 402 LicenseRequired
```
