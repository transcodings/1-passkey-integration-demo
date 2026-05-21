# Agent rules — `1-passkey`

Before editing code, read this file and **`CLAUDE.md`** when you need quick project context.

<!-- BEGIN:nextjs-agent-rules -->
## Next.js version note

This project’s Next.js may differ from your training data — APIs, conventions, and file layout can change. When in doubt, read `node_modules/next/dist/docs/` and follow deprecation notices.

<!-- END:nextjs-agent-rules -->

## Product scope

- **No external auth SaaS / Transcodes SDK.** This sample is WebAuthn + MongoDB credential metadata only.
- If a request implies **production-grade verification** (full attestation or assertion verification) and nothing else is specified, make **minimal changes** only and leave limitations in comments or README.

## Architecture conventions

1. **`@/utility`**: Barrel (`index.ts`) for UI — registration, verification, session hint, base64url/challenge helpers, `formatAuthenticatorAttachment`, DB re-exports. **`utility/helpers.ts`** only formats + re-exports; **`utility/webauthnEncoding.ts`** holds challenge / `user.id` / base64url codecs.
2. **`@/constants`**: Keep repeated strings, numbers, and enums here; avoid scattering literals in components (existing pattern).
3. **`@/utility/db`**: `DemoPasskeyUser` schema plus browser `listDemoPasskeyUsers` / `addDemoPasskeyUser`. **`utility/registrationArtifacts.ts`** parses attestation artifacts.
4. **`lib/mongodb.ts` + `lib/passkeyUserStore.ts`**: Server-only MongoDB connection and CRUD. **`app/api/users/route.ts`** is a thin HTTP wrapper.
5. **`MONGODB_URI`** is required at runtime (see `.env.example`).

## Change checklist

- Do **not** grow `PasskeyDemo` with large WebAuthn or persistence logic again; extend **`utility/registerPasskey.ts`** and **`utility/verifyPasskey.ts`** instead.
- Keep browser-only APIs (`navigator`, `sessionStorage`) inside **`'use client'`** trees and `utility/*`; do **not** put them in **`app/api/*`** or **`lib/*`** route handlers (`runtime = 'nodejs'`).
- When changing the row shape, update **`lib/passkeyUserStore.ts`** validation type guards and **`DemoPasskeyUser`** in **`utility/db.ts`**.
- **`react-hooks/set-state-in-effect`** from **`npm run lint`** may stay disabled **with a one-line comment explaining why** (session / list hydrate patterns).

## Run / verify

```bash
npm run lint
npm run build
```

Default dev port is **4000** (`package.json` scripts).
