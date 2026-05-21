import type { DemoAuthenticatorAttachment, DemoPasskeyUser } from '@/utility/db';
import {
  AuthenticatorAttachment,
  DemoApiProblemMessage,
  isAuthenticatorAttachment,
  isAuthenticatorTransportList,
  LegacyPasskeyUserJsonKey,
  UsersApiJsonKey,
} from '@/constants';
import { parseStoredTransports } from '@/utility/webauthnTransports';
import { readFile, writeFile } from 'fs/promises';
import { NextResponse } from 'next/server';
import path from 'path';

export const runtime = 'nodejs';

const DB_PATH = path.join(process.cwd(), 'database.json');

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

  let attachment: DemoAuthenticatorAttachment = AuthenticatorAttachment.BrowserDefault;
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
    isAuthenticatorTransportList(x.transports) &&
    typeof x.displayName === 'string' &&
    typeof x.syntheticUserEmail === 'string'
  );
}

async function readUsers(): Promise<DemoPasskeyUser[]> {
  let rawText: string;
  try {
    rawText = await readFile(DB_PATH, 'utf-8');
  } catch {
    await writeFile(DB_PATH, '[]', 'utf-8');
    return [];
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText) as unknown;
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

async function writeUsers(users: DemoPasskeyUser[]) {
  const body = `${JSON.stringify(users, null, 2)}\n`;
  await writeFile(DB_PATH, body, 'utf-8');
}

export async function GET() {
  try {
    const users = [...(await readUsers())].sort(
      (a, b) => b.createdAt - a.createdAt
    );
    return NextResponse.json({ [UsersApiJsonKey.Users]: users });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'read failed';
    return NextResponse.json({ [UsersApiJsonKey.Error]: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const bodyUnknown: unknown = await req.json();

    const incomingPayload = extractRecord(bodyUnknown);
    if (!incomingPayload || !isIncomingUser(incomingPayload)) {
      return NextResponse.json(
        { [UsersApiJsonKey.Error]: DemoApiProblemMessage.InvalidUserPayload },
        { status: 400 }
      );
    }

    const p = incomingPayload;
    const next: DemoPasskeyUser = {
      id: p.id,
      credential_id: p.credential_id,
      rpid: p.rpid,
      label: p.label,
      public_key: p.public_key,
      prev_counter: p.prev_counter,
      authenticator_attachment: p.authenticator_attachment,
      transports: p.transports,
      displayName: p.displayName,
      syntheticUserEmail: p.syntheticUserEmail,
      createdAt: Date.now(),
    };

    const existing = await readUsers();
    const withoutDup = existing.filter((u) => u.id !== next.id);
    const merged = [...withoutDup, next];
    await writeUsers(merged);

    return NextResponse.json({ [UsersApiJsonKey.User]: next });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'write failed';
    return NextResponse.json({ [UsersApiJsonKey.Error]: msg }, { status: 500 });
  }
}

function extractRecord(v: unknown): unknown {
  if (v === null || typeof v !== 'object') return v;
  const o = v as Record<string, unknown>;
  return o[UsersApiJsonKey.User] !== undefined ? o[UsersApiJsonKey.User] : v;
}

export async function DELETE(req: Request) {
  try {
    const id = new URL(req.url).searchParams.get('id');
    const existing = await readUsers();

    if (id) {
      const next = existing.filter((u) => u.id !== id);
      if (next.length === existing.length) {
        return NextResponse.json(
          { [UsersApiJsonKey.Error]: DemoApiProblemMessage.UserNotFound },
          { status: 404 }
        );
      }
      await writeUsers(next);
      return NextResponse.json({ ok: true, removed: 1 });
    }

    await writeUsers([]);
    return NextResponse.json({ ok: true, removed: existing.length });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'delete failed';
    return NextResponse.json({ [UsersApiJsonKey.Error]: msg }, { status: 500 });
  }
}
