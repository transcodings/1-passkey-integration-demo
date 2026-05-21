/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║  [SERVER] This entire file is server-side logic in production.            ║
 * ╠═══════════════════════════════════════════════════════════════════════════╣
 * ║  Parsing the attestation response (CBOR-decoding `attestationObject`,    ║
 * ║  reading `authData`, extracting the public key + signCount) belongs on   ║
 * ║  the server, NOT in the browser:                                         ║
 * ║                                                                          ║
 * ║    - The browser cannot prove what it parsed — an attacker can replace   ║
 * ║      the bytes before posting them.                                      ║
 * ║    - The server is the only place that already trusts the issued        ║
 * ║      challenge, your RP id, and the user account this row belongs to.   ║
 * ║                                                                          ║
 * ║  We do it in the browser ONLY because this demo has no auth backend.    ║
 * ║  When you move to production, delete this file and use a real WebAuthn  ║
 * ║  library on the server (e.g. SimpleWebAuthn, @passwordless-id/webauthn, ║
 * ║  fido2-lib) which also verifies the attestation signature, the trust    ║
 * ║  chain, and the UV / UP flags.                                          ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 *
 * Pulls the two fields we persist after a successful registration:
 *
 *   - `public_key`   the credential's public key as a PEM string (SPKI / DER).
 *                    Used later to verify sign-in signatures.
 *   - `prev_counter` the authenticator's current signature counter. Future
 *                    assertions with counter ≤ this value should be rejected
 *                    (basic clone / replay detection).
 *
 * Both live inside `AuthenticatorAttestationResponse`:
 *   - `getPublicKey()` is a convenience added by WebAuthn L2; we fall back to
 *     an empty string if the browser doesn't expose it.
 *   - The counter lives at byte offset 33 of `authData`, which is wrapped in
 *     CBOR inside `attestationObject` — hence the `cbor-x` decode step.
 *
 * Demo only: missing/unparseable fields silently fall back to empty/zero.
 * A real server should REJECT the registration instead.
 */
import { decode } from 'cbor-x';

function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary);
}

/** Wrap SPKI DER bytes in the `-----BEGIN PUBLIC KEY-----` PEM envelope. */
function spkiToPem(spki: ArrayBuffer): string {
  const b64 = arrayBufferToBase64(spki);
  const chunked = b64.match(/.{1,64}/g)?.join('\n') ?? b64;
  return `-----BEGIN PUBLIC KEY-----\n${chunked}\n-----END PUBLIC KEY-----`;
}

/**
 * `authData` layout (WebAuthn §6.1):
 *   bytes  0..31  rpIdHash
 *   byte   32     flags (UP, UV, AT, ED, …)
 *   bytes  33..36 signCount (big-endian uint32) ← what we read
 *   (then optional attestedCredentialData / extensions)
 */
function parseAuthDataCounter(authData: Uint8Array): number {
  if (authData.byteLength < 37) return 0;
  const view = new DataView(
    authData.buffer,
    authData.byteOffset,
    authData.byteLength
  );
  return view.getUint32(33, false);
}

export type RegistrationArtifacts = {
  public_key: string;
  prev_counter: number;
};

export function getRegistrationArtifacts(
  credential: PublicKeyCredential
): RegistrationArtifacts {
  const attResp = credential.response as AuthenticatorAttestationResponse & {
    getPublicKey?: () => ArrayBuffer | null;
  };

  // Public key — prefer the L2 convenience method; otherwise leave blank
  // (production would parse the COSE_Key from authData instead).
  let public_key = '';
  try {
    const spki = attResp.getPublicKey?.();
    if (spki && spki.byteLength > 0) public_key = spkiToPem(spki);
  } catch {
    public_key = '';
  }

  // Signature counter — buried inside the CBOR-encoded `attestationObject`.
  let prev_counter = 0;
  try {
    const attObj = decode(
      new Uint8Array(attResp.attestationObject)
    ) as Record<string, unknown>;
    const raw = attObj.authData as Uint8Array | undefined;
    if (raw instanceof Uint8Array) prev_counter = parseAuthDataCounter(raw);
  } catch {
    /* ignore malformed attestationObject in demo */
  }

  return { public_key, prev_counter };
}
