# Passkey Login Demo

A small **Next.js app** that shows how **passkey (WebAuthn) registration and sign-in** work in the browser.

No auth SDK, no external service — just the standard Web Authentication API, MongoDB for credential metadata, and enough code to follow the flow end to end.

**Good for:** learning what `navigator.credentials.create` / `.get` actually do, copying the pattern into your own app, or demoing Touch ID / Windows Hello / security keys on `localhost` or Vercel.

> **This is a teaching demo, not production auth.** Challenges are created in the browser and assertions are **not** verified on a server. See [What this demo skips](#what-this-demo-skips).

---

## Quick start

```bash
npm install
cp .env.example .env.local
# Edit .env.local — set MONGODB_URI to your Atlas connection string
npm run dev
```

Open [http://localhost:4000](http://localhost:4000).

Passkeys need a **secure context** — `localhost` or HTTPS works.

### Environment variables

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `MONGODB_URI` | Yes | — | MongoDB Atlas connection string |
| `MONGODB_DB_NAME` | No | `passkey-demo` | Database name |
| `MONGODB_COLLECTION` | No | `passkey_users` | Collection for credential rows |

On **Vercel**, add the same variables under Project → Settings → Environment Variables.

---

## What happens when you click the buttons

### 1. Create passkey (registration)

```
You fill the form
       ↓
registerPasskey.ts builds PublicKeyCredentialCreationOptions
       ↓
navigator.credentials.create({ publicKey })
       ↓
Browser shows system UI (Touch ID / Hello / QR / USB key)
       ↓
registrationArtifacts.ts extracts public key + sign counter + transports
       ↓
Row saved to MongoDB via POST /api/users
```

**What gets stored:** credential id, public key (PEM), RP id, transports, label, and display fields — enough to sign in again from the dropdown.

### 2. Verify (sign in)

```
You pick a saved user from the dropdown
       ↓
verifyPasskey.ts loads credential_id + transports from MongoDB
       ↓
navigator.credentials.get({ publicKey: { allowCredentials: […] } })
       ↓
Browser shows the same system UI for that credential
       ↓
Authenticator signs a challenge (assertion)
       ↓
Demo writes a sessionStorage blob → redirect to /dashboard
```

**What the demo treats as “signed in”:** a JSON object in `sessionStorage`. A real app would verify the signature on the server first, then issue a session cookie.

### 3. Dashboard

Shows who you’re signed in as and every row in MongoDB. You can remove individual rows or clear the whole list (demo store only — passkeys on your device are not revoked).

---

## Project layout

```
1-passkey/
├── app/
│   ├── page.tsx                 Home — mounts the passkey form
│   ├── dashboard/page.tsx       After sign-in; lists saved credentials
│   ├── layout.tsx               Root layout, theme, toasts
│   └── api/users/route.ts       GET / POST / DELETE → MongoDB
│
├── lib/
│   ├── mongodb.ts               Connection helper (server-only)
│   └── passkeyUserStore.ts      CRUD + row validation
│
├── components/
│   ├── PasskeyDemo.tsx          Register + verify UI
│   ├── DemoToastProvider.tsx    Toast feedback
│   └── ThemeProvider.tsx        Light / dark / system
│
├── utility/                     All WebAuthn logic lives here
│   ├── registerPasskey.ts       Registration ceremony
│   ├── verifyPasskey.ts         Sign-in ceremony + demo session
│   ├── registrationArtifacts.ts Parse attestation (public key, counter)
│   ├── webauthnTransports.ts    transports extract + verify replay
│   ├── db.ts                    fetch helpers for /api/users
│   ├── webauthnEncoding.ts      base64url, random challenge / user handle
│   └── webauthnErrorMessage.ts    Friendly errors (cancel vs real failure)
│
├── constants.ts                 Enums, API paths, UI copy
├── .env.example                 MONGODB_URI template
└── public/.well-known/webauthn   Related origins (localhost demo only)
```

**Rule of thumb:** UI in `components/`, ceremonies in `utility/`, persistence in `lib/` + `app/api/`.

---

## API & data

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/users` | List all saved credentials |
| `POST` | `/api/users` | Save a new credential after registration |
| `DELETE` | `/api/users` | Clear all rows |
| `DELETE` | `/api/users?id=<uuid>` | Remove one row |

Each MongoDB document matches `DemoPasskeyUser`:

`id`, `credential_id`, `rpid`, `label`, `public_key`, `prev_counter`, `authenticator_attachment`, `transports`, `displayName`, `syntheticUserEmail`, `createdAt`

---

## What this demo skips

Production passkey auth also needs:

- **Server-generated challenges** (random, single-use, bound to the session)
- **Server-side verification** of attestation (register) and assertion (sign-in): signature, origin, RP id, sign counter
- **Real sessions** (HttpOnly cookies or signed JWT), not `sessionStorage`
- **Credential lifecycle** (revoke, device management, account recovery)

For non-obvious WebAuthn options (hints, transports, synced passkeys), see the repo root [`PASSKEY_INTEGRATION_NOTES.md`](../PASSKEY_INTEGRATION_NOTES.md).

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server on port **4000** |
| `npm run build` | Production build |
| `npm run start` | Serve production build on 4000 |
| `npm run lint` | ESLint |

---

## Stack

Next.js 16 · React 19 · Tailwind CSS v4 · TypeScript · `cbor-x` · MongoDB Node driver

---

## Learn more

- [Web Authentication (W3C)](https://www.w3.org/TR/webauthn-3/)
- [MDN: Web Authentication API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Authentication_API)
- [Integrating into your own app](../README.md) — parent repo guide
