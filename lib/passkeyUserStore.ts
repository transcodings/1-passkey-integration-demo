import type { DemoAuthenticatorAttachment, DemoPasskeyUser } from '@/utility/db';
import {
  AuthenticatorAttachment,
  DemoApiProblemMessage,
  isAuthenticatorAttachment,
  isAuthenticatorTransportList,
  LegacyPasskeyUserJsonKey,
  UsersApiJsonKey,
} from '@/constants';
import { getPasskeyUsersCollection } from '@/lib/mongodb';
import { parseStoredTransports } from '@/utility/webauthnTransports';

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
    isAuthenticatorTransportList(x.transports) &&
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
    transports: parseStoredTransports(x.transports),
    displayName: x.displayName,
    syntheticUserEmail: x.syntheticUserEmail,
    createdAt: x.createdAt,
  };
}

function asDemoPasskeyUser(v: unknown): DemoPasskeyUser | null {
  if (isDemoPasskeyUser(v)) return v;
  return tryMigrateLegacyRecord(v);
}

export function isIncomingPasskeyUser(
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
    isAuthenticatorTransportList(x.transports) &&
    typeof x.displayName === 'string' &&
    typeof x.syntheticUserEmail === 'string'
  );
}

export function extractIncomingRecord(v: unknown): unknown {
  if (v === null || typeof v !== 'object') return v;
  const o = v as Record<string, unknown>;
  return o[UsersApiJsonKey.User] !== undefined ? o[UsersApiJsonKey.User] : v;
}

export async function listPasskeyUsers(): Promise<DemoPasskeyUser[]> {
  const collection = await getPasskeyUsersCollection();
  const docs = await collection.find({}).sort({ createdAt: -1 }).toArray();
  const out: DemoPasskeyUser[] = [];
  for (const doc of docs) {
    const user = asDemoPasskeyUser(doc);
    if (user) out.push(user);
  }
  return out;
}

export async function upsertPasskeyUser(
  record: Omit<DemoPasskeyUser, 'createdAt'>
): Promise<DemoPasskeyUser> {
  const next: DemoPasskeyUser = {
    ...record,
    createdAt: Date.now(),
  };
  const collection = await getPasskeyUsersCollection();
  await collection.replaceOne({ id: next.id }, next, { upsert: true });
  return next;
}

export async function deletePasskeyUser(id: string): Promise<boolean> {
  const collection = await getPasskeyUsersCollection();
  const result = await collection.deleteOne({ id });
  return result.deletedCount === 1;
}

export async function clearPasskeyUsers(): Promise<number> {
  const collection = await getPasskeyUsersCollection();
  const result = await collection.deleteMany({});
  return result.deletedCount;
}

export { DemoApiProblemMessage };
