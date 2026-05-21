import { DemoUserFacingAlert } from '@/constants';

const CANCELLED_ERROR_NAMES = new Set([
  'NotAllowedError',
  'AbortError',
  'TimeoutError',
]);

export type WebAuthnErrorMessage = {
  /** User dismissed the sheet, timed out, or the platform aborted — not an app bug. */
  cancelled: boolean;
  message: string;
};

/** Map DOMException / Error from `credentials.create` | `credentials.get` for UI + logging. */
export function formatWebAuthnErrorMessage(e: unknown): WebAuthnErrorMessage {
  const name =
    e instanceof DOMException
      ? e.name
      : e instanceof Error
        ? e.name
        : 'UnknownError';
  const detail = e instanceof Error ? e.message : String(e);

  if (CANCELLED_ERROR_NAMES.has(name)) {
    return {
      cancelled: true,
      message: DemoUserFacingAlert.PasskeyCeremonyCancelled,
    };
  }

  return {
    cancelled: false,
    message: detail ? `${name}: ${detail}` : name,
  };
}

/** Avoid `console.error(DOMException)` — Next.js dev overlay treats it as a runtime crash. */
export function logWebAuthnErrorMessage(
  scope: 'create' | 'get',
  result: WebAuthnErrorMessage,
  elapsedMs: number
): void {
  const line = `[passkey:${scope}] ${result.message} (${elapsedMs.toFixed(0)}ms)`;
  if (result.cancelled) {
    console.info(line);
    return;
  }
  console.warn(line);
}
