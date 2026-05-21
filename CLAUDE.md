# 1-passkey — Claude briefing

Read **`AGENTS.md`** first for project-wide editor / agent conventions.

## What this repo does

- **No Transcodes**. The demo uses the browser-native **`navigator.credentials` (WebAuthn)** API for passkey registration and authentication only.
- **Next.js 16 App Router**. Credential rows persist in **MongoDB** via **`/api/users`** (`lib/passkeyUserStore.ts`).
- **Challenge**: Generated in the browser for demo simplicity. Production apps should issue challenges on the server and bind them to a session or store.

## Directory map

| Path | Role |
|------|------|
| `components/PasskeyDemo.tsx` | UI, loading, alerts; WebAuthn calls delegated to `utility/` |
| `utility/` | `registerPasskeyDemo`, `verifyPasskeyWithStoredUser`, **`db.ts`**, **`registrationArtifacts.ts`**, binary helpers, formatting + DB fetch re-exports (`@/utility`) |
| `utility/helpers.ts` | `formatAuthenticatorAttachment` + re-exports (`db`, `registrationArtifacts`) for `@/utility` |
| `utility/webauthnEncoding.ts` | Challenges, `user.id` random bytes, base64url helpers |
| `utility/webauthnTransports.ts` | `getTransports()` persistence + verify-time replay |
| `utility/db.ts` | Client `DemoPasskeyUser` shape + `fetch('/api/users')` |
| `lib/mongodb.ts` | MongoDB client singleton (server-only) |
| `lib/passkeyUserStore.ts` | MongoDB CRUD + legacy-row migration |
| `constants.ts` | Single source for protocol / session / API / copy **enums and constants** |
| `utility/registrationArtifacts.ts` | Attestation parsing (cbor-x), SPKI PEM, sign counter |
| `app/api/users/route.ts` | HTTP wrapper for MongoDB store |

## Import rules

- Prefer **`from '@/utility'`** for shared helpers, registration, and verification in UI / flows.
- Server routes under `app/api/**` should import from **`@/lib/*`** and types from **`@/utility/db`** only; do not add WebAuthn client code there.

## Run

```bash
cp .env.example .env.local   # set MONGODB_URI
npm run dev                  # port 4000
```

After code changes, confirm **`npm run build`** and **`npm run lint`** pass.
