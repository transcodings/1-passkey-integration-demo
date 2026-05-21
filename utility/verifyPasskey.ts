/**
 * WebAuthn authentication (sign in with an existing passkey).
 *
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║  CLIENT vs SERVER — read this before copying any of this file             ║
 * ╠═══════════════════════════════════════════════════════════════════════════╣
 * ║  In this demo EVERYTHING happens in the browser. In production you MUST   ║
 * ║  split the flow:                                                          ║
 * ║                                                                           ║
 * ║  ┌────────── CLIENT ──────────┐       ┌────────── SERVER ──────────┐      ║
 * ║  │ 1. Ask server for options  │  ──►  │ A. Generate `challenge`,   │      ║
 * ║  │    (POST /signin/begin)    │  ◄──  │    build allowCredentials  │      ║
 * ║  │                            │       │    from this user's rows,  │      ║
 * ║  │                            │       │    remember the challenge  │      ║
 * ║  │                            │       │                            │      ║
 * ║  │ 2. navigator.credentials   │       │                            │      ║
 * ║  │    .get({ publicKey })     │       │                            │      ║
 * ║  │                            │       │                            │      ║
 * ║  │ 3. Send the resulting      │  ──►  │ B. Verify assertion:       │      ║
 * ║  │    `credential.response`   │       │    - signature with stored │      ║
 * ║  │    to the server           │       │      public_key            │      ║
 * ║  │                            │       │    - challenge matches     │      ║
 * ║  │                            │       │    - origin / rpIdHash OK  │      ║
 * ║  │                            │       │    - UV flag if required   │      ║
 * ║  │                            │       │    - signCount strictly >  │      ║
 * ║  │                            │       │      stored prev_counter   │      ║
 * ║  │                            │  ◄──  │ C. Issue real session      │      ║
 * ║  │                            │       │    (HttpOnly cookie / JWT) │      ║
 * ║  └────────────────────────────┘       └────────────────────────────┘      ║
 * ║                                                                           ║
 * ║  This file only does (2). It then writes a sessionStorage blob in lieu   ║
 * ║  of step (C). DO NOT ship that — sessionStorage is forgeable.            ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */

import {
  CredentialMediation,
  CredentialOperationTimeoutMs,
  DemoSessionJsonKey,
  DemoUserFacingAlert,
  PublicKeyCredentialType,
  SessionStorageKey,
  UserVerificationRequirement,
} from '@/constants';
import type { DemoPasskeyUser } from './db';
import {
  credentialIdBytesFromBase64url,
  randomWebAuthnChallenge,
} from './webauthnEncoding';
import {
  hintsForVerify,
  transportsForVerify,
} from './webauthnTransports';
import {
  formatWebAuthnErrorMessage,
  logWebAuthnErrorMessage,
} from './webauthnErrorMessage';

export type VerifyPasskeyOk = {
  ok: true;
  credential: Credential;
};

export type VerifyPasskeyFail = {
  ok: false;
  message: string;
  reason: 'credential_decode' | 'unsupported' | 'cancelled' | 'webauthn_error';
};

export type VerifyPasskeyResult = VerifyPasskeyOk | VerifyPasskeyFail;

function assertAssertionAvailable(): VerifyPasskeyFail | null {
  if (!navigator.credentials?.get) {
    return {
      ok: false,
      reason: 'unsupported',
      message: DemoUserFacingAlert.WebAuthnUnavailable,
    };
  }
  return null;
}

/**
 * [SERVER in production] Demo-only "session" — a JSON blob in `sessionStorage`
 * so `/dashboard` can render a name. Anyone with devtools can forge it.
 *
 * In production the server, AFTER successfully verifying the assertion,
 * should set an HttpOnly + Secure + SameSite session cookie (or return a
 * signed JWT). The browser never writes its own session.
 */
export function persistPasskeyDemoSession(user: DemoPasskeyUser): void {
  sessionStorage.setItem(
    SessionStorageKey.DemoSession,
    JSON.stringify({
      [DemoSessionJsonKey.UserName]: user.syntheticUserEmail,
      [DemoSessionJsonKey.DisplayName]: user.displayName,
      [DemoSessionJsonKey.SignedInAt]: Date.now(),
      [DemoSessionJsonKey.DbUserId]: user.id,
    })
  );
}

export async function verifyPasskeyWithStoredUser(
  user: DemoPasskeyUser
): Promise<VerifyPasskeyResult> {
  const blocked = assertAssertionAvailable();
  if (blocked) return blocked;

  // `credential_id` is stored as base64url. WebAuthn needs the raw bytes
  // back in an ArrayBuffer to match it against credentials on the device.
  // [SERVER in production] You wouldn't do this in the client at all —
  // the server builds `allowCredentials` from the rows it owns and sends
  // them down ready-to-use.
  let rawId: ArrayBuffer;
  try {
    rawId = credentialIdBytesFromBase64url(user.credential_id);
  } catch {
    return {
      ok: false,
      reason: 'credential_decode',
      message: DemoUserFacingAlert.StoredCredentialInvalid,
    };
  }

  // ┌───────────────────────────────────────────────────────────────────────┐
  // │ [SERVER] `PublicKeyCredentialRequestOptions` must come from the       │
  // │ server, just like the creation options. The client should only do     │
  // │ `navigator.credentials.get({ publicKey: optionsFromServer })`.        │
  // └───────────────────────────────────────────────────────────────────────┘
  //
  // CLIENT-ONLY: navigator.credentials.get can only run in the browser —
  // that's the part the browser handles. Everything around it (build options,
  // verify response) belongs on the server.
  let credential: Credential | null;
  const startedAt = performance.now();
  const verifyTransports = transportsForVerify(
    user.authenticator_attachment,
    user.transports ?? []
  );
  const verifyHints = hintsForVerify(user.authenticator_attachment);

  // ┌───────────────────────────────────────────────────────────────────────┐
  // │ ROR (Related Origin Requests) — the cross-domain knob.                │
  // │                                                                       │
  // │ We MUST pass `rpId` explicitly here. If omitted, the browser defaults │
  // │ to the current origin's host, so credentials registered with a        │
  // │ different rp.id (e.g. registered on demo.mexpert-dvi.com, now         │
  // │ verifying on testing.mexpert-dvi.com or *.vercel.app) will never      │
  // │ match — the ROR fetch never even fires.                               │
  // │                                                                       │
  // │ With `rpId = user.rpid`:                                              │
  // │   - origin == rpId       → normal match                               │
  // │   - origin != rpId       → browser fetches                            │
  // │                            https://{rpId}/.well-known/webauthn        │
  // │                            and only proceeds if current origin is in  │
  // │                            its `origins` list.                        │
  // │                                                                       │
  // │ Requirements:                                                         │
  // │   - The rpId host must serve `/.well-known/webauthn` as JSON.         │
  // │   - All origins that want to share creds must be listed there.        │
  // │   - rpId host must NOT be on the Public Suffix List (so *.vercel.app  │
  // │     can be a consumer, never a base rp.id).                           │
  // │   - Chrome 128+ / Safari 18+ / Edge. Firefox: not yet.                │
  // └───────────────────────────────────────────────────────────────────────┘
  try {
    credential = await navigator.credentials.get({
      publicKey: {
        // [SERVER] Random bytes the authenticator signs. MUST be generated
        // on the server, stored in the session, and compared against
        // clientDataJSON.challenge when the assertion comes back. A
        // browser-generated challenge means no replay protection.
        challenge: randomWebAuthnChallenge(),

        // Browser ceremony timeout (ms).
        timeout: CredentialOperationTimeoutMs.Default,

        // Explicit rp.id from the stored credential row — drives ROR.
        rpId: user.rpid,

        userVerification: UserVerificationRequirement.Preferred,

        // [SERVER] In production the server builds this list. Either:
        //   - look up the user's credentials by their account, OR
        //   - leave it empty for true passwordless (the user picks any
        //     discoverable credential they have for this RP id).
        // Restricting to one id here mirrors our "Sign in as <dropdown>" UX.
        allowCredentials: [
          {
            type: PublicKeyCredentialType.PublicKey,
            id: rawId,
            ...(verifyTransports ? { transports: verifyTransports } : {}),
          },
        ],

        // WebAuthn L3 hints — preferred over the deprecated
        // `authenticatorAttachment` selector for biasing the UI.
        ...(verifyHints ? { hints: verifyHints } : {}),
      },
      mediation: CredentialMediation.Optional,
    });

    // `null` (instead of a rejection) means the ceremony resolved without a
    // credential — treat it the same as a user cancel.
    if (!credential) {
      return {
        ok: false,
        reason: 'cancelled',
        message: DemoUserFacingAlert.AssertionNullCredential,
      };
    }

    // ┌──────────────────────────────────────────────────────────────────┐
    // │ [SERVER] In production we'd stop here on the client and POST     │
    // │ `credential.response` (clientDataJSON, authenticatorData,        │
    // │ signature, userHandle) to /signin/finish. The server then:       │
    // │   1. Looks up the credential row by `credential.rawId`           │
    // │   2. Verifies the signature using the stored `public_key`        │
    // │   3. Verifies challenge / origin / rpIdHash / UV flag            │
    // │   4. Checks `authData.signCount > row.prev_counter` and          │
    // │      updates the row's `prev_counter`                            │
    // │   5. Issues the real session (HttpOnly cookie / JWT)             │
    // │                                                                  │
    // │ This demo just returns the credential and trusts it.             │
    // └──────────────────────────────────────────────────────────────────┘
    return { ok: true, credential };
  } catch (e) {
    const failure = formatWebAuthnErrorMessage(e);
    logWebAuthnErrorMessage('get', failure, performance.now() - startedAt);
    return {
      ok: false,
      reason: failure.cancelled ? 'cancelled' : 'webauthn_error',
      message: failure.message,
    };
  }
}
