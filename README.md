# CVault

**A privacy-first VPN on WireGuard, built as a platform rather than an app.**

Most VPN codebases are one client talking to one server. CVault is a
multi-tenant control plane: a business signs up, gets an API key, and runs VPN
for their own users under their own brand. The desktop app is one consumer of
that API, not the product itself.

---

## The pieces

| | |
| --- | --- |
| **`backend/`** | The control plane. Fastify, Prisma and PostgreSQL. Owns tenants, users, devices, sessions and the WireGuard servers themselves. |
| **`desktop-client/`** | macOS desktop app in Flutter. WireGuard tunnel, live IP display, kill switch. |
| **`sdk-js/`** | JavaScript and TypeScript SDK so someone else can embed VPN into their own product. Node, browser and Electron, with full type definitions. |
| **`web-demo/`** | A small React app that exercises the SDK end to end. |
| **`docs/`** | Product documentation, the licensing design and deployment runbooks. |

---

## The part worth reading

**Device provisioning is the whole problem.** A VPN is easy until you have to
hand out keys. Each device needs its own WireGuard keypair, that public key has
to reach the right server's peer list, and the private key must never touch the
control plane. The interesting code is in `backend/src/services/device.service.ts`
and `wireguard.service.ts`, where a device registration turns into a real peer on
a real server over SSH, and a revoked device has to be removed from that peer
list without disturbing anyone else's tunnel.

**Multi-tenancy is enforced at the API key.** A tenant's API key scopes every
call, so one business can never enumerate or touch another's users, devices or
sessions. Tenants are the isolation boundary, not a filter applied afterwards.

**Sessions are tracked, not inferred.** Connect and disconnect are recorded as
first-class events, which is what makes per-tenant usage and billing possible
later without going back and reconstructing history from logs.

---

## Running it

```bash
cd backend
npm install
docker compose up -d postgres redis
npx prisma migrate dev && npx prisma generate
npm run dev
```

Copy `backend/.env.example` to `.env` and fill it in. It needs a database URL, a
JWT secret, an API encryption key, and SSH access to a WireGuard server.

The SDK and the web demo have their own READMEs.

---

## Status

Version 1.0.0 shipped on macOS in February 2026: WireGuard tunnel, IP display
and kill switch. Windows, Android and iOS were designed for and not shipped.

This repository is published as engineering reference. It is a working system,
not a maintained product, and the deployment guides in `docs/` describe
infrastructure that is no longer running.

Built by [Yerins Abraham](https://github.com/yerinsabraham). More engineering
write-ups at [yerinsabraham.com/engineering](https://yerinsabraham.com/engineering).
