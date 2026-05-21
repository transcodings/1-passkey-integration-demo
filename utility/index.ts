/**
 * Public entry: import from `@/utility` in UI.
 */

export {
  addDemoPasskeyUser,
  clearDemoPasskeyUsers,
  deleteDemoPasskeyUser,
  formatAuthenticatorAttachment,
  getRegistrationArtifacts,
  listDemoPasskeyUsers,
  type DemoAuthenticatorAttachment,
  type DemoPasskeyUser,
} from './helpers';

export {
  persistPasskeyDemoSession,
  verifyPasskeyWithStoredUser,
  type VerifyPasskeyFail,
  type VerifyPasskeyOk,
  type VerifyPasskeyResult,
} from './verifyPasskey';

export {
  registerPasskeyDemo,
  type DemoPasskeyRegistrationParams,
  type RegisterPasskeyFail,
  type RegisterPasskeyOk,
  type RegisterPasskeyResult,
} from './registerPasskey';

export {
  bufferToBase64Url,
  credentialIdBytesFromBase64url,
  randomUserHandle,
  randomWebAuthnChallenge,
} from './webauthnEncoding';
