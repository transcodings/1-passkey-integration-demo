# Agent rules — `1-passkey`

Before editing code, read this file and **`CLAUDE.md`** when you need quick project context.

<!-- BEGIN:nextjs-agent-rules -->
## Next.js version note

This project’s Next.js may differ from your training data — APIs, conventions, and file layout can change. When in doubt, read `node_modules/next/dist/docs/` and follow deprecation notices.

<!-- END:nextjs-agent-rules -->

## Product scope

- **No external auth SaaS / Transcodes SDK.** This sample is WebAuthn + browser `localStorage` only.
- If a request implies **production-grade verification** (full attestation or assertion verification) and nothing else is specified, make **minimal changes** only and leave limitations in comments or README.

## Architecture conventions

1. **`@/utility`**: Barrel (`index.ts`) for UI — registration, verification, session hint, base64url/challenge helpers, `formatAuthenticatorAttachment`, DB re-exports. **`utility/helpers.ts`** only formats + re-exports; **`utility/webauthnEncoding.ts`** holds challenge / `user.id` / base64url codecs.
2. **`@/constants`**: Keep repeated strings, numbers, and enums here; avoid scattering literals in components (existing pattern).
3. **`@/utility/db`**: `DemoPasskeyUser` schema plus browser `listDemoPasskeyUsers` / `addDemoPasskeyUser` / delete / clear — all backed by **`localStorage['database.json']`**, the same JSON array shape as the old file. **`utility/registrationArtifacts.ts`** parses attestation artifacts.

## Change checklist

- Do **not** grow `PasskeyDemo` with large WebAuthn or persistence logic again; extend **`utility/registerPasskey.ts`** and **`utility/verifyPasskey.ts`** instead.
- Keep browser-only APIs (`navigator`, `localStorage`, `sessionStorage`) inside **`'use client'`** trees and `utility/*`.
- When changing the row shape, update **`utility/db.ts`** validation type guards.
- **`react-hooks/set-state-in-effect`** from **`npm run lint`** may stay disabled **with a one-line comment explaining why** (session / list hydrate patterns).

## Run / verify

```bash
npm run lint
npm run build
```

Default dev port is **4000** (`package.json` scripts).
