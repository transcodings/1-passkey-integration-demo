/**
 * Single source of truth for values that would otherwise be duplicated as string/number literals.
 * WebAuthn enums follow W3C / COSE names where applicable.
 */

/** `PublicKeyCredentialDescriptor.type` — [W3C WebAuthn]. */
export enum PublicKeyCredentialType {
  PublicKey = 'public-key',
}

/** `AuthenticatorSelectionCriteria.userVerification`. */
export enum UserVerificationRequirement {
  Preferred = 'preferred',
}

/** `AuthenticatorSelectionCriteria.residentKey` (discoverable credential preference). */
export enum ResidentKeyRequirement {
  Discouraged = 'discouraged',
  Preferred = 'preferred',
  Required = 'required',
}

/**
 * `PublicKeyCredentialCreationOptions.hints` (WebAuthn L3).
 * Order = priority. `ClientDevice` keeps the UA on the platform authenticator path
 * (Touch ID / Windows Hello) instead of jumping to the cross-device QR/BLE sheet.
 */
export enum WebAuthnHint {
  SecurityKey = 'security-key',
  ClientDevice = 'client-device',
  Hybrid = 'hybrid',
}

/** `PublicKeyCredentialCreationOptions.attestation`. */
export enum AttestationConveyancePreference {
  None = 'none',
}

/** `pubKeyCredParams[].alg` — COSE algorithm identifiers. */
export enum CoseAlgorithmIdentifier {
  Es256 = -7,
}

/**
 * `AuthenticatorSelectionCriteria.authenticatorAttachment`.
 * `BrowserDefault` means we omit the property and let the UA choose.
 */
export enum AuthenticatorAttachment {
  BrowserDefault = '',
  Platform = 'platform',
  CrossPlatform = 'cross-platform',
}

export const AUTHENTICATOR_ATTACHMENT_VALUES: ReadonlySet<string> = new Set(
  Object.values(AuthenticatorAttachment) as string[]
);

export function isAuthenticatorAttachment(
  value: unknown
): value is AuthenticatorAttachment {
  return (
    typeof value === 'string' && AUTHENTICATOR_ATTACHMENT_VALUES.has(value)
  );
}

/** `PublicKeyCredentialDescriptor.transports` — [W3C WebAuthn]. */
export enum AuthenticatorTransport {
  Usb = 'usb',
  Nfc = 'nfc',
  Ble = 'ble',
  Internal = 'internal',
  Hybrid = 'hybrid',
}

export const AUTHENTICATOR_TRANSPORT_VALUES: ReadonlySet<string> = new Set(
  Object.values(AuthenticatorTransport) as string[]
);

export function isAuthenticatorTransport(
  value: unknown
): value is AuthenticatorTransport {
  return (
    typeof value === 'string' && AUTHENTICATOR_TRANSPORT_VALUES.has(value)
  );
}

export function isAuthenticatorTransportList(
  value: unknown
): value is AuthenticatorTransport[] {
  return Array.isArray(value) && value.every(isAuthenticatorTransport);
}

export enum CredentialFormBusyAction {
  Create = 'create',
  Verify = 'verify',
  Clear = 'clear',
}

/** `PublicKeyCredentialRequestOptions.timeout` default (ms). */
export enum CredentialOperationTimeoutMs {
  Default = 60_000,
}

export enum CryptographicEntropyBytes {
  WebAuthnChallenge = 32,
  UserHandle = 16,
}

export enum SyntheticLocalEmailUuidPrefixChars {
  /** Length of UUID slice placed before `{@SyntheticLocalEmailDomain.Local}`. */
  Default = 12,
}

/** Shown before `@demo.local` when Email is blank. */
export enum SyntheticLocalEmailDomain {
  Local = '@demo.local',
}

// --- Persistence & HTTP ---

export enum DemoApiPath {
  Users = '/api/users',
}

/** Keys used in older `database.json` rows before snake_case. */
export enum LegacyPasskeyUserJsonKey {
  CredentialIdBase64url = 'credentialIdBase64url',
  PasskeyName = 'passkeyName',
  AuthenticatorAttachmentCamel = 'authenticatorAttachment',
}

/** `sessionStorage` key for signed-in dashboard state. */
export enum SessionStorageKey {
  DemoSession = 'passkey-demo-session',
}

/** localStorage key for appearance (`<html data-theme>` + Tailwind `dark:` variant). */
export enum DemoThemeStorageKey {
  Preference = 'passkey-demo-theme',
}

/** Light / dark / follow OS (`prefers-color-scheme`). */
export enum DemoThemePreference {
  Light = 'light',
  Dark = 'dark',
  System = 'system',
}

/**
 * Attribute on `document.documentElement` that drives the custom `dark:` variant.
 * (`class` on `<html>` is reset by React hydration; `data-theme` is left intact.)
 */
export enum DemoThemeHtmlDataAttribute {
  Key = 'data-theme',
}

/** Values for {@link DemoThemeHtmlDataAttribute.Key} after resolving system preference. */
export enum DemoResolvedThemeMode {
  Light = 'light',
  Dark = 'dark',
}

export enum DemoSessionJsonKey {
  UserName = 'userName',
  DisplayName = 'displayName',
  SignedInAt = 'signedInAt',
  DbUserId = 'dbUserId',
}

export enum UsersApiJsonKey {
  Users = 'users',
  User = 'user',
  Error = 'error',
}

export enum DemoApiProblemMessage {
  InvalidUserPayload = 'Invalid user payload',
  UserNotFound = 'Passkey not found',
}

// --- Demo UI copy (avoid repeating literals across components) ---

export enum DemoFormPlaceholder {
  PasskeyLabel = 'Passkey Login Sample',
  DisplayName = 'John Doe',
  Email = 'johndoe@example.com',
}

export enum DemoAccountDerivedLabelFallback {
  /** When inferring display name only from tokens in the passkey label. */
  User = 'User',
}

export enum DemoSiteMetadataString {
  FullTitle = 'Passkey Login Demo',
  Description = 'Client-side passkey registration and authentication demo',
}

export enum DemoMarketingCopyFragment {
  /** Home hero `<h1>` (short title without em dash subtitle). */
  ShortTitleLine = 'Passkey Login Demo',
  /** Primary card heading in `PasskeyDemo`. */
  CardPanelHeading = 'Passkey Authentication (client-only demo)',
}

/** Client routes for `next/link` / `router.push`. */
export enum DemoAppRoute {
  Home = '/',
  Dashboard = '/dashboard',
}

export enum CredentialButtonCaption {
  CreateIdle = 'Create passkey',
  CreateBusy = 'Creating…',
  VerifyIdle = 'Verify (sign in)',
  VerifyBusy = 'Verifying…',
  ClearSavedIdle = 'Clear saved passkeys',
  ClearSavedBusy = 'Clearing…',
  ClearAllIdle = 'Clear all',
  ClearAllBusy = 'Clearing all…',
  RemoveRow = 'Remove',
}

export enum DemoVerifySelectPlaceholder {
  NoSavedPasskeys = 'No passkeys saved yet',
}

export enum DemoUserFacingAlert {
  WebAuthnUnavailable = 'Your browser does not support the Web Authentication API',
  RegistrationNullCredential = 'Registration cancelled or failed (null credential).',
  RegisterOrPickFirst = 'Register a passkey first, or pick someone from the list.',
  StoredCredentialDecodeFailed = 'Stored credential id could not be decoded.',
  StoredCredentialInvalid = 'Stored credential id is invalid.',
  AssertionNullCredential = 'Assertion cancelled or failed.',
  /** NotAllowedError / AbortError / TimeoutError — user cancelled or the sheet timed out. */
  PasskeyCeremonyCancelled =
    'Passkey was cancelled or timed out. Try again when you are ready.',
  PasskeysCleared = 'All saved passkeys were removed from MongoDB.',
  PasskeyRemoved = 'Passkey removed from MongoDB.',
  ClearPasskeysConfirm =
    'Remove every saved passkey row from MongoDB? This demo does not revoke credentials in the browser or on your device.',
}
