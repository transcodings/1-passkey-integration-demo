import {
  clearPasskeyUsers,
  deletePasskeyUser,
  DemoApiProblemMessage,
  extractIncomingRecord,
  isIncomingPasskeyUser,
  listPasskeyUsers,
  upsertPasskeyUser,
} from '@/lib/passkeyUserStore';
import { UsersApiJsonKey } from '@/constants';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const users = await listPasskeyUsers();
    return NextResponse.json({ [UsersApiJsonKey.Users]: users });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'read failed';
    return NextResponse.json({ [UsersApiJsonKey.Error]: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const bodyUnknown: unknown = await req.json();
    const incomingPayload = extractIncomingRecord(bodyUnknown);

    if (!incomingPayload || !isIncomingPasskeyUser(incomingPayload)) {
      return NextResponse.json(
        { [UsersApiJsonKey.Error]: DemoApiProblemMessage.InvalidUserPayload },
        { status: 400 }
      );
    }

    const next = await upsertPasskeyUser(incomingPayload);
    return NextResponse.json({ [UsersApiJsonKey.User]: next });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'write failed';
    return NextResponse.json({ [UsersApiJsonKey.Error]: msg }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const id = new URL(req.url).searchParams.get('id');

    if (id) {
      const removed = await deletePasskeyUser(id);
      if (!removed) {
        return NextResponse.json(
          { [UsersApiJsonKey.Error]: DemoApiProblemMessage.UserNotFound },
          { status: 404 }
        );
      }
      return NextResponse.json({ ok: true, removed: 1 });
    }

    const removed = await clearPasskeyUsers();
    return NextResponse.json({ ok: true, removed });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'delete failed';
    return NextResponse.json({ [UsersApiJsonKey.Error]: msg }, { status: 500 });
  }
}
