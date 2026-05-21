/**
 * Related Origin Requests (ROR) manifest — served at
 *   `https://{rp.id}/.well-known/webauthn`
 *
 * Why a route handler and NOT a `public/.well-known/webauthn` file?
 *   The WebAuthn ROR spec requires `Content-Type: application/json`. Next.js
 *   public files without a `.json` extension are served as
 *   `application/octet-stream` (or `text/plain`), which browsers reject with
 *   "the .well-known/webauthn resource ... had the wrong content-type".
 *
 * Rules of thumb:
 *   - `origins[]` lists every origin that should be allowed to *consume*
 *     credentials registered against the rp.id this domain owns.
 *   - The host serving this file must itself be the rp.id used in
 *     `navigator.credentials.create/get`, and it MUST NOT be on the Public
 *     Suffix List (so `*.vercel.app` can be a consumer in the list, but not
 *     the host of this file).
 *   - Cap the list around ~5 distinct registrable-domain labels. Browsers
 *     may truncate beyond that.
 */
import { NextResponse } from 'next/server';

export const runtime = 'edge';
export const dynamic = 'force-static';
// 'https://1-passkey-integration-demo.vercel.app',
// 'https://demo.mexpert-dvi.com',
// 'https://testing.mexpert-dvi.com',
const RELATED_ORIGINS = [''];

export function GET() {
  return NextResponse.json(
    { origins: RELATED_ORIGINS },
    {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300, s-maxage=300',
      },
    }
  );
}
