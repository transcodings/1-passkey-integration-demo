/**
 * UI formatting for stored fields + re-exports so `@/utility` can expose DB and attestation helpers
 * without every consumer importing three modules.
 */
import { AuthenticatorAttachment } from '@/constants';
import type { DemoAuthenticatorAttachment } from './db';

export type { DemoAuthenticatorAttachment, DemoPasskeyUser } from './db';
export {
  addDemoPasskeyUser,
  clearDemoPasskeyUsers,
  deleteDemoPasskeyUser,
  listDemoPasskeyUsers,
} from './db';
export { getRegistrationArtifacts } from './registrationArtifacts';

/** Maps `authenticator_attachment` to short labels in the passkey picker. */
export function formatAuthenticatorAttachment(
  att: DemoAuthenticatorAttachment
): string {
  switch (att) {
    case AuthenticatorAttachment.Platform:
      return 'This device';
    case AuthenticatorAttachment.CrossPlatform:
      return 'Hardware / cross-device';
    default:
      return 'Browser chose';
  }
}
