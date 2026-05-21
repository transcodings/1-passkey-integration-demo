/**
 * Browser-observed `transports` from registration and verify-time replay.
 * See repo root `PASSKEY_INTEGRATION_NOTES.md` §2–3.
 */
import {
  AuthenticatorAttachment,
  AuthenticatorTransport,
  isAuthenticatorTransport,
  WebAuthnHint,
} from '@/constants';
import type { DemoAuthenticatorAttachment } from './db';

/** Raw values from `AuthenticatorAttestationResponse.getTransports()`. Store as-is. */
export function transportsFromAttestationResponse(
  credential: PublicKeyCredential
): AuthenticatorTransport[] {
  const attResp = credential.response as AuthenticatorAttestationResponse;
  const raw = attResp.getTransports?.() ?? [];
  const out: AuthenticatorTransport[] = [];
  for (const t of raw) {
    if (isAuthenticatorTransport(t)) out.push(t);
  }
  return out;
}

export function parseStoredTransports(value: unknown): AuthenticatorTransport[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isAuthenticatorTransport);
}

/** Drop `internal` for cross-platform creds so QR/hybrid sheet is not hijacked. */
export function transportsForVerify(
  attachment: DemoAuthenticatorAttachment,
  transports: AuthenticatorTransport[]
): AuthenticatorTransport[] | undefined {
  if (transports.length === 0) return undefined;
  if (attachment !== AuthenticatorAttachment.CrossPlatform) return transports;
  const filtered = transports.filter(
    (t) => t !== AuthenticatorTransport.Internal
  );
  return filtered.length > 0 ? filtered : transports;
}

/**
 * Map stored attachment → WebAuthn L3 `hints`.
 * Replaces the deprecated `authenticatorAttachment` selector at verify time.
 */
export function hintsForVerify(
  attachment: DemoAuthenticatorAttachment
): WebAuthnHint[] | undefined {
  switch (attachment) {
    case AuthenticatorAttachment.Platform:
      return [WebAuthnHint.ClientDevice];
    case AuthenticatorAttachment.CrossPlatform:
      return [WebAuthnHint.SecurityKey, WebAuthnHint.Hybrid];
    default:
      return undefined;
  }
}
