/**
 * `DemoPasskeyUser` row type and browser-side `fetch` helpers for `/api/users`.
 * Server writes `database.json`; this module is safe to import from client components.
 */
import {
  AuthenticatorAttachment,
  DemoApiPath,
  UsersApiJsonKey,
} from '@/constants';

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

export async function listDemoPasskeyUsers(): Promise<DemoPasskeyUser[]> {
  const res = await fetch(DemoApiPath.Users, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to load users (${res.status})`);
  const data = (await res.json()) as { [UsersApiJsonKey.Users]?: unknown };
  const list = data[UsersApiJsonKey.Users];
  return Array.isArray(list) ? (list as DemoPasskeyUser[]) : [];
}

export async function addDemoPasskeyUser(
  record: Omit<DemoPasskeyUser, 'createdAt'>
): Promise<DemoPasskeyUser> {
  const res = await fetch(DemoApiPath.Users, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(record),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const errBody = data as Record<string, unknown>;
    throw new Error(
      typeof data === 'object' &&
        data !== null &&
        UsersApiJsonKey.Error in errBody &&
        typeof errBody[UsersApiJsonKey.Error] === 'string'
        ? (errBody[UsersApiJsonKey.Error] as string)
        : `Save failed (${res.status})`
    );
  }

  const user =
    typeof data === 'object' &&
    data !== null &&
    UsersApiJsonKey.User in (data as object) &&
    (data as Record<string, unknown>)[UsersApiJsonKey.User] !== null &&
    typeof (data as Record<string, unknown>)[UsersApiJsonKey.User] === 'object'
      ? ((data as Record<string, unknown>)[UsersApiJsonKey.User] as DemoPasskeyUser)
      : null;

  if (!user?.id || user.createdAt == null) throw new Error('Invalid save response');

  return user;
}

export async function deleteDemoPasskeyUser(id: string): Promise<void> {
  const res = await fetch(`${DemoApiPath.Users}?id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const errBody = data as Record<string, unknown>;
    throw new Error(
      typeof data === 'object' &&
        data !== null &&
        UsersApiJsonKey.Error in errBody &&
        typeof errBody[UsersApiJsonKey.Error] === 'string'
        ? (errBody[UsersApiJsonKey.Error] as string)
        : `Delete failed (${res.status})`
    );
  }
}

export async function clearDemoPasskeyUsers(): Promise<void> {
  const res = await fetch(DemoApiPath.Users, { method: 'DELETE' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const errBody = data as Record<string, unknown>;
    throw new Error(
      typeof data === 'object' &&
        data !== null &&
        UsersApiJsonKey.Error in errBody &&
        typeof errBody[UsersApiJsonKey.Error] === 'string'
        ? (errBody[UsersApiJsonKey.Error] as string)
        : `Clear failed (${res.status})`
    );
  }
}
