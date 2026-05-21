import { NextResponse } from 'next/server';

/** Same payload as `public/.well-known/webauthn` — update both if you change origins. */
const RELATED_ORIGINS_MANIFEST = {
  origins: ['http://localhost:4000'],
} as const;

const RESPONSE_DELAY_MS = 300;

export async function GET() {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, RESPONSE_DELAY_MS);
  });
  return NextResponse.json(RELATED_ORIGINS_MANIFEST);
}
