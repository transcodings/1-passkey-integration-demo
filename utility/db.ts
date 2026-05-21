/**
 * `DemoPasskeyUser` row type and browser `localStorage` helpers.
 * Persists the same JSON array that used to live in `database.json`.
 * Client-only — safe to import from `'use client'` components.
 */
import {
  AuthenticatorAttachment,
  DemoPasskeyStorageKey,
  DemoStorageProblemMessage,
  isAuthenticatorAttachment,
  LegacyPasskeyUserJsonKey,
} from '@/constants';

/** One-time key from an earlier localStorage migration attempt. */
const LEGACY_LOCAL_STORAGE_KEY = 'passkey-demo-users';

export type DemoAuthenticatorAttachment = AuthenticatorAttachment;

export type DemoPasskeyUser = {
  id: string;
  credential_id: string;
  rpid: string;
  label: string;
  public_key: string;
  prev_counter: number;
  authenticator_attachment: DemoAuthenticatorAttachment;
  displayName: string;
  syntheticUserEmail: string;
  createdAt: number;
};

function requireLocalStorage(): Storage {
  if (typeof window === 'undefined') {
    throw new Error('localStorage is only available in the browser');
  }
  try {
    return window.localStorage;
  } catch {
    throw new Error('localStorage is unavailable');
  }
}

function isDemoPasskeyUser(v: unknown): v is DemoPasskeyUser {
  if (v === null || typeof v !== 'object') return false;
  const x = v as Partial<DemoPasskeyUser>;
  return (
    typeof x.id === 'string' &&
    typeof x.credential_id === 'string' &&
    typeof x.rpid === 'string' &&
    typeof x.label === 'string' &&
    typeof x.public_key === 'string' &&
    typeof x.prev_counter === 'number' &&
    isAuthenticatorAttachment(x.authenticator_attachment) &&
    typeof x.displayName === 'string' &&
    typeof x.syntheticUserEmail === 'string' &&
    typeof x.createdAt === 'number'
  );
}

/** Legacy demo rows before snake_case credential shape */
function tryMigrateLegacyRecord(v: unknown): DemoPasskeyUser | null {
  if (v === null || typeof v !== 'object') return null;
  const x = v as Record<string, unknown>;

  const id = typeof x.id === 'string' ? x.id : null;

  let credential_id: string | null = null;
  if (typeof x.credential_id === 'string') credential_id = x.credential_id;
  else if (typeof x[LegacyPasskeyUserJsonKey.CredentialIdBase64url] === 'string')
    credential_id = x[
      LegacyPasskeyUserJsonKey.CredentialIdBase64url
    ] as string;

  let label = '';
  if (typeof x.label === 'string') label = x.label;
  else if (typeof x[LegacyPasskeyUserJsonKey.PasskeyName] === 'string')
    label = x[LegacyPasskeyUserJsonKey.PasskeyName] as string;

  let attachment: DemoAuthenticatorAttachment =
    AuthenticatorAttachment.BrowserDefault;
  if (isAuthenticatorAttachment(x.authenticator_attachment))
    attachment = x.authenticator_attachment;
  else if (
    isAuthenticatorAttachment(
      x[LegacyPasskeyUserJsonKey.AuthenticatorAttachmentCamel]
    )
  )
    attachment = x[
      LegacyPasskeyUserJsonKey.AuthenticatorAttachmentCamel
    ] as DemoAuthenticatorAttachment;

  if (
    !id ||
    !credential_id ||
    typeof x.displayName !== 'string' ||
    typeof x.syntheticUserEmail !== 'string' ||
    typeof x.createdAt !== 'number'
  )
    return null;

  const rpid = typeof x.rpid === 'string' ? x.rpid : '';

  return {
    id,
    credential_id,
    rpid,
    label,
    public_key: typeof x.public_key === 'string' ? x.public_key : '',
    prev_counter: typeof x.prev_counter === 'number' ? x.prev_counter : 0,
    authenticator_attachment: attachment,
    displayName: x.displayName,
    syntheticUserEmail: x.syntheticUserEmail,
    createdAt: x.createdAt,
  };
}

function asDemoPasskeyUser(v: unknown): DemoPasskeyUser | null {
  if (isDemoPasskeyUser(v)) return v;
  return tryMigrateLegacyRecord(v);
}

function isIncomingUser(
  v: unknown
): v is Omit<DemoPasskeyUser, 'createdAt'> {
  if (v === null || typeof v !== 'object') return false;
  const x = v as Partial<DemoPasskeyUser>;
  return (
    typeof x.id === 'string' &&
    typeof x.credential_id === 'string' &&
    typeof x.rpid === 'string' &&
    typeof x.label === 'string' &&
    typeof x.public_key === 'string' &&
    typeof x.prev_counter === 'number' &&
    isAuthenticatorAttachment(x.authenticator_attachment) &&
    typeof x.displayName === 'string' &&
    typeof x.syntheticUserEmail === 'string'
  );
}

function migrateLegacyStorageKey(storage: Storage): void {
  const current = storage.getItem(DemoPasskeyStorageKey.DatabaseJson);
  if (current != null && current !== '') return;

  const legacy = storage.getItem(LEGACY_LOCAL_STORAGE_KEY);
  if (legacy == null) return;

  storage.setItem(DemoPasskeyStorageKey.DatabaseJson, legacy);
  storage.removeItem(LEGACY_LOCAL_STORAGE_KEY);
}

function readUsers(): DemoPasskeyUser[] {
  const storage = requireLocalStorage();
  migrateLegacyStorageKey(storage);

  const raw = storage.getItem(DemoPasskeyStorageKey.DatabaseJson);
  if (!raw) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    return [];
  }

  if (!Array.isArray(parsed)) return [];

  const out: DemoPasskeyUser[] = [];
  for (const item of parsed) {
    const u = asDemoPasskeyUser(item);
    if (u) out.push(u);
  }
  return out;
}

/** Same serialization as the old `database.json` on disk (`JSON.stringify` + trailing newline). */
function writeUsers(users: DemoPasskeyUser[]): void {
  const storage = requireLocalStorage();
  const body = `${JSON.stringify(users, null, 2)}\n`;
  storage.setItem(DemoPasskeyStorageKey.DatabaseJson, body);
}

export async function listDemoPasskeyUsers(): Promise<DemoPasskeyUser[]> {
  if (typeof window === 'undefined') return [];
  const users = readUsers();
  return [...users].sort((a, b) => b.createdAt - a.createdAt);
}

export async function addDemoPasskeyUser(
  record: Omit<DemoPasskeyUser, 'createdAt'>
): Promise<DemoPasskeyUser> {
  if (!isIncomingUser(record)) {
    throw new Error(DemoStorageProblemMessage.InvalidUserPayload);
  }

  const next: DemoPasskeyUser = {
    id: record.id,
    credential_id: record.credential_id,
    rpid: record.rpid,
    label: record.label,
    public_key: record.public_key,
    prev_counter: record.prev_counter,
    authenticator_attachment: record.authenticator_attachment,
    displayName: record.displayName,
    syntheticUserEmail: record.syntheticUserEmail,
    createdAt: Date.now(),
  };

  const existing = readUsers();
  const withoutDup = existing.filter((u) => u.id !== next.id);
  writeUsers([...withoutDup, next]);
  return next;
}

export async function deleteDemoPasskeyUser(id: string): Promise<void> {
  const existing = readUsers();
  const next = existing.filter((u) => u.id !== id);
  if (next.length === existing.length) {
    throw new Error(DemoStorageProblemMessage.UserNotFound);
  }
  writeUsers(next);
}

export async function clearDemoPasskeyUsers(): Promise<void> {
  writeUsers([]);
}
