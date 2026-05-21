/**
 * WebAuthn registration (enroll a new passkey).
 *
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║  CLIENT vs SERVER — read this before copying any of this file             ║
 * ╠═══════════════════════════════════════════════════════════════════════════╣
 * ║  In this demo EVERYTHING happens in the browser. In production you MUST   ║
 * ║  split the flow into a client half and a server half:                     ║
 * ║                                                                           ║
 * ║  ┌────────── CLIENT ──────────┐       ┌────────── SERVER ──────────┐      ║
 * ║  │ 1. Ask server for options  │  ──►  │ A. Generate `challenge`    │      ║
 * ║  │    (POST /register/begin)  │  ◄──  │    + `user.id` and remember│      ║
 * ║  │                            │       │    them in the session     │      ║
 * ║  │ 2. navigator.credentials   │       │                            │      ║
 * ║  │    .create({ publicKey })  │       │                            │      ║
 * ║  │                            │       │                            │      ║
 * ║  │ 3. Send the resulting      │  ──►  │ B. Verify attestation:     │      ║
 * ║  │    `credential.response`   │       │    - challenge matches     │      ║
 * ║  │    to the server           │       │    - origin / rpIdHash OK  │      ║
 * ║  │                            │       │    - UV flag if required   │      ║
 * ║  │                            │       │    - parse public key,     │      ║
 * ║  │                            │       │      signCount, transports │      ║
 * ║  │                            │       │ C. Persist credential row  │      ║
 * ║  │                            │       │    in your real database   │      ║
 * ║  │                            │       │    keyed to the user       │      ║
 * ║  └────────────────────────────┘       └────────────────────────────┘      ║
 * ║                                                                           ║
 * ║  Inline `[SERVER]` comments below mark each block that must move.         ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 *
 * Flow as wired in THIS demo (everything on the client):
 *   1. Build `PublicKeyCredentialCreationOptions` (challenge, RP, user, algo).
 *   2. Call `navigator.credentials.create({ publicKey })` → browser shows the
 *      system passkey UI (Touch ID / Windows Hello / QR / USB key).
 *   3. Extract the public key + signature counter from the returned credential.
 *   4. POST the row to `/api/users` (persisted in MongoDB).
 */

import {
  AuthenticatorAttachment,
  AttestationConveyancePreference,
  CoseAlgorithmIdentifier,
  CredentialOperationTimeoutMs,
  DemoAccountDerivedLabelFallback,
  DemoFormPlaceholder,
  DemoUserFacingAlert,
  PublicKeyCredentialType,
  ResidentKeyRequirement,
  SyntheticLocalEmailDomain,
  SyntheticLocalEmailUuidPrefixChars,
  UserVerificationRequirement,
} from '@/constants';
import type { DemoPasskeyUser } from './db';
import { addDemoPasskeyUser } from './db';
import { getRegistrationArtifacts } from './registrationArtifacts';
import { transportsFromAttestationResponse } from './webauthnTransports';
import {
  bufferToBase64Url,
  randomUserHandle,
  randomWebAuthnChallenge,
} from './webauthnEncoding';
import {
  formatWebAuthnErrorMessage,
  logWebAuthnErrorMessage,
} from './webauthnErrorMessage';

export type DemoPasskeyRegistrationParams = {
  passkeyName: string;
  accountDisplayName: string;
  accountEmail: string;
  authenticatorAttachment: AuthenticatorAttachment;
  rpId: string;
};

export type RegisterPasskeyOk = {
  ok: true;
  recordId: string;
  credential: PublicKeyCredential;
  savedRow: DemoPasskeyUser;
};

export type RegisterPasskeyFail = {
  ok: false;
  message: string;
  reason:
    | 'unsupported'
    | 'null_credential'
    | 'cancelled'
    | 'save_failed'
    | 'webauthn_error';
};

export type RegisterPasskeyResult = RegisterPasskeyOk | RegisterPasskeyFail;

function assertWebAuthnAvailable(): RegisterPasskeyFail | null {
  if (!navigator.credentials?.create) {
    return {
      ok: false,
      reason: 'unsupported',
      message: DemoUserFacingAlert.WebAuthnUnavailable,
    };
  }
  return null;
}

/** Builds `user` + `rp.name` for `PublicKeyCredentialCreationOptions`. */
function resolveRegistrationIdentity(
  recordId: string,
  params: DemoPasskeyRegistrationParams
): { label: string; displayName: string; userName: string } {
  const label = params.passkeyName.trim() || DemoFormPlaceholder.PasskeyLabel;
  const displayName =
    params.accountDisplayName.trim() ||
    label.split(/\s+/)[0] ||
    DemoAccountDerivedLabelFallback.User;
  const emailTrimmed = params.accountEmail.trim();
  const userName = emailTrimmed
    ? emailTrimmed
    : `${recordId.slice(0, SyntheticLocalEmailUuidPrefixChars.Default)}${
        SyntheticLocalEmailDomain.Local
      }`;
  return { label, displayName, userName };
}

export async function registerPasskeyDemo(
  params: DemoPasskeyRegistrationParams
): Promise<RegisterPasskeyResult> {
  const blocked = assertWebAuthnAvailable();
  if (blocked) return blocked;

  // [SERVER] In production these IDs come from the server too:
  //   - `recordId`         your DB primary key (created when the account is)
  //   - `userHandleBuffer` opaque user.id; MUST be issued and remembered
  //                        server-side so re-registration uses the same handle.
  //
  // Decoupled from `user.id` (the WebAuthn user handle) so the credential can
  // be re-bound to a different account without rotating the handle the
  // authenticator stored. NEVER put an email or any PII into a user handle.
  const recordId = crypto.randomUUID();
  const {
    label,
    displayName: displayNameResolved,
    userName: userNameResolved,
  } = resolveRegistrationIdentity(recordId, params);

  const userHandleBuffer = randomUserHandle();

  // ┌───────────────────────────────────────────────────────────────────────┐
  // │ [SERVER] Build `PublicKeyCredentialCreationOptions` on the server.    │
  // │ The client should only RECEIVE this object (typically via             │
  // │ POST /webauthn/register/begin) and pass it straight to                │
  // │ navigator.credentials.create. Building it in the browser — like we    │
  // │ do here — means an attacker can choose their own challenge, user.id,  │
  // │ rp.id, etc., which defeats the whole point of WebAuthn.               │
  // └───────────────────────────────────────────────────────────────────────┘
  const publicKey: PublicKeyCredentialCreationOptions = {
    // [SERVER] Random bytes the authenticator signs. MUST be generated on
    // the server, kept in the session, and compared to clientDataJSON.challenge
    // when the client returns the attestation. A client-side challenge is a
    // demo shortcut only — it provides zero replay protection.
    challenge: randomWebAuthnChallenge(),

    // Relying Party = your site identity.
    //   `id`   must equal the page origin's domain (or a registrable suffix).
    //          A credential is permanently bound to this id.
    //   `name` is shown in the system UI ("Save a passkey for <name>").
    // [SERVER] `id` is policy — it should come from server config so the
    // browser can't be tricked into binding a credential to the wrong domain.
    rp: { name: label, id: params.rpId },

    // The account this credential belongs to.
    //   `id`          opaque bytes; the only field the authenticator stores.
    //   `name`        a stable login identifier (usually the email).
    //   `displayName` human-friendly label shown in the picker.
    // [SERVER] All three fields should come from the server's user record.
    user: {
      id: userHandleBuffer,
      name: userNameResolved,
      displayName: displayNameResolved,
    },

    // Algorithms we accept, in preference order. We only ship ES256 (P-256)
    // because the verify path / stored PEM assume it. Real apps usually
    // include EdDSA (-8) and RS256 (-257) too for wider authenticator support.
    pubKeyCredParams: [
      {
        type: PublicKeyCredentialType.PublicKey,
        alg: CoseAlgorithmIdentifier.Es256,
      },
    ],

    // How long the browser will wait for the user before erroring out (ms).
    timeout: CredentialOperationTimeoutMs.Default,

    // Filter for which authenticators are eligible.
    authenticatorSelection: {
      // "platform"       → only this device's built-in (Touch ID / Hello).
      // "cross-platform" → only roaming (USB key / phone via QR).
      // omitted          → user chooses in the sheet. We omit when the form
      //                    is set to "Browser default".
      ...(params.authenticatorAttachment !==
        AuthenticatorAttachment.BrowserDefault && {
        authenticatorAttachment: params.authenticatorAttachment,
      }),

      // "preferred" = create a discoverable (resident) credential if possible,
      // otherwise a server-side one. Discoverable creds enable usernameless
      // sign-in. We keep "preferred" (not "required") for broader compat with
      // older security keys and small-storage authenticators.
      residentKey: ResidentKeyRequirement.Preferred,

      // Ask for biometric / PIN. "preferred" succeeds even without UV, but
      // sets the UV flag in authData when it ran — which the server can check
      // to treat the credential as a real second factor / passwordless proof.
      userVerification: UserVerificationRequirement.Preferred,
    },

    // We don't need cryptographic proof of the authenticator's make/model,
    // so skip the extra attestation round-trip. Enterprise apps that want
    // to allow-list specific hardware can switch this to "direct" and verify
    // the attestation statement ON THE SERVER against FIDO MDS.
    attestation: AttestationConveyancePreference.None,

    // [SERVER] Production should also include `excludeCredentials` here
    // (a list of this user's already-registered credential ids) so the
    // authenticator refuses to re-enroll the same device twice.
  };

  // ── CLIENT-ONLY: trigger the system passkey UI ────────────────────────────
  // This call MUST stay in the browser — only the browser can talk to the
  // authenticator. The Promise resolves once the user completes the gesture,
  // OR rejects if the user cancels / the sheet times out (NotAllowedError).
  let credential: PublicKeyCredential | null;
  const startedAt = performance.now();
  try {
    credential = (await navigator.credentials.create({
      publicKey,
    })) as PublicKeyCredential | null;
  } catch (e) {
    const elapsedMs = performance.now() - startedAt;
    const failure = formatWebAuthnErrorMessage(e);
    logWebAuthnErrorMessage('create', failure, elapsedMs);
    return {
      ok: false,
      reason: failure.cancelled ? 'cancelled' : 'webauthn_error',
      message: failure.message,
    };
  }

  // A `null` resolution (rather than rejection) is rare but legal — treat it
  // the same as a user cancel.
  if (!credential) {
    return {
      ok: false,
      reason: 'cancelled',
      message: DemoUserFacingAlert.RegistrationNullCredential,
    };
  }

  // ┌───────────────────────────────────────────────────────────────────────┐
  // │ [SERVER] Everything from here down must run on the server.            │
  // │                                                                       │
  // │ Production client just POSTs the raw `credential.response` (clientData │
  // │ JSON, attestationObject) to /webauthn/register/finish. The server:    │
  // │   1. Decodes attestation, verifies the signature                      │
  // │   2. Checks clientDataJSON.challenge === issued challenge             │
  // │   3. Checks clientDataJSON.origin === your origin                     │
  // │   4. Checks authData.rpIdHash === sha256(rp.id)                       │
  // │   5. Checks UV flag if required                                       │
  // │   6. Extracts the public key + signCount + transports                 │
  // │   7. Stores the row keyed to the authenticated user                   │
  // │                                                                       │
  // │ Our `getRegistrationArtifacts` + `POST /api/users` below collapse all │
  // │ of that into "parse a bit, write to MongoDB" — DO NOT ship that.      │
  // └───────────────────────────────────────────────────────────────────────┘
  const arts = getRegistrationArtifacts(credential);
  const transports = transportsFromAttestationResponse(credential);

  // Shape of the row we persist via `POST /api/users` (MongoDB).
  // `credential_id` is base64url(rawId) — the lookup key at sign-in time
  // (sent back as `allowCredentials[].id`).
  const payload: Omit<DemoPasskeyUser, 'createdAt'> = {
    id: recordId,
    credential_id: bufferToBase64Url(credential.rawId),
    rpid: params.rpId,
    label,
    public_key: arts.public_key,
    prev_counter: arts.prev_counter,
    authenticator_attachment: params.authenticatorAttachment,
    transports,
    displayName: displayNameResolved,
    syntheticUserEmail: userNameResolved,
  };

  try {
    const savedRow = await addDemoPasskeyUser(payload);
    return {
      ok: true,
      recordId,
      credential,
      savedRow,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return {
      ok: false,
      reason: 'save_failed',
      message,
    };
  }
}
