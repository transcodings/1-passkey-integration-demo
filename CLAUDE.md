# 1-passkey — Claude briefing

Read **`AGENTS.md`** first for project-wide editor / agent conventions.

## What this repo does

- **No Transcodes**. The demo uses the browser-native **`navigator.credentials` (WebAuthn)** API for passkey registration and authentication only.
- **Next.js 16 App Router**. Server responsibilities are **`/api/users`** for reading/writing `database.json`.
- **Challenge**: Generated in the browser for demo simplicity. Production apps should issue challenges on the server and bind them to a session or store.

## Directory map

| Path | Role |
|------|------|
| `components/PasskeyDemo.tsx` | UI, loading, alerts; WebAuthn calls delegated to `utility/` |
| `utility/` | `registerPasskeyDemo`, `verifyPasskeyWithStoredUser`, **`db.ts`**, **`registrationArtifacts.ts`**, binary helpers, formatting + DB fetch re-exports (`@/utility`) |
| `utility/helpers.ts` | `formatAuthenticatorAttachment` + re-exports (`db`, `registrationArtifacts`) for `@/utility` |
| `utility/webauthnEncoding.ts` | Challenges, `user.id` random bytes, base64url helpers |
| `utility/db.ts` | Client `DemoPasskeyUser` shape + `fetch('/api/users')` |
| `constants.ts` | Single source for protocol / session / API / copy **enums and constants** |
| `utility/registrationArtifacts.ts` | Attestation parsing (cbor-x), SPKI PEM, sign counter |
| `app/api/users/route.ts` | `database.json` CRUD + legacy-row migration |
| `database.json` | Plain JSON array demo store (sample rows may be committed) |

## Import rules

- Prefer **`from '@/utility'`** for shared helpers, registration, and verification in UI / flows.
- Server routes under `app/api/**` should import types from **`@/utility/db`** only; do not add WebAuthn client code there.

## Run

```bash
npm run dev   # port 4000 (defined in package scripts)
```

After code changes, confirm **`npm run build`** and **`npm run lint`** pass.
