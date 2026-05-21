/**
 * Random bytes + base64url encoding for WebAuthn challenges and Credential User Entity `user.id`.
 * Browser-only (`crypto`, `atob`).
 */
import { CryptographicEntropyBytes } from '@/constants';

const cryptoGlobal = globalThis.crypto;

/** 32-byte WebAuthn challenge (demo generates client-side — production uses server-bound nonces). */
export function randomWebAuthnChallenge(): ArrayBuffer {
  const buf = new ArrayBuffer(CryptographicEntropyBytes.WebAuthnChallenge);
  cryptoGlobal.getRandomValues(new Uint8Array(buf));
  return buf;
}

/** Credential User Entity `user.id`; random 16 bytes per WebAuthn guidance. */
export function randomUserHandle(): ArrayBuffer {
  const buf = new ArrayBuffer(CryptographicEntropyBytes.UserHandle);
  cryptoGlobal.getRandomValues(new Uint8Array(buf));
  return buf;
}

/** `ArrayBuffer` → base64url (no padding). Used for `credential.rawId` persistence. */
export function bufferToBase64Url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/** Stored `credential_id` (base64url) → raw `ArrayBuffer` for `allowCredentials[].id`. */
export function credentialIdBytesFromBase64url(b64: string): ArrayBuffer {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4);
  const normalized = `${b64}${pad}`.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(normalized);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength
  ) as ArrayBuffer;
}
