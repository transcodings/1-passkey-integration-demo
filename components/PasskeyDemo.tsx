'use client';

import {
  CredentialButtonCaption,
  CredentialFormBusyAction,
  DemoApiPath,
  DemoAppRoute,
  DemoFormPlaceholder,
  DemoMarketingCopyFragment,
  DemoUserFacingAlert,
  DemoVerifySelectPlaceholder,
  AuthenticatorAttachment,
} from '@/constants';
import { useDemoToast } from '@/components/DemoToastProvider';
import {
  bufferToBase64Url,
  clearDemoPasskeyUsers,
  formatAuthenticatorAttachment,
  listDemoPasskeyUsers,
  persistPasskeyDemoSession,
  registerPasskeyDemo,
  verifyPasskeyWithStoredUser,
  type DemoPasskeyUser,
} from '@/utility';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

export function PasskeyDemo() {
  const router = useRouter();
  const { showToast } = useDemoToast();
  const [demoUsers, setDemoUsers] = useState<DemoPasskeyUser[]>([]);
  const [verifyUserId, setVerifyUserId] = useState('');
  const [log, setLog] = useState('');
  const [busy, setBusy] = useState<CredentialFormBusyAction | null>(null);

  const [passkeyName, setPasskeyName] = useState<string>(
    DemoFormPlaceholder.PasskeyLabel
  );
  /** Passed to WebAuthn `user.displayName` — browsers show this in the passkey sheet. */
  const [accountDisplayName, setAccountDisplayName] = useState<string>(
    DemoFormPlaceholder.DisplayName
  );
  /** Passed to WebAuthn `user.name` — usually email; omit to use an auto `@demo.local` id. */
  const [accountEmail, setAccountEmail] = useState<string>(
    DemoFormPlaceholder.Email
  );
  const [authenticatorAttachment, setAuthenticatorAttachment] = useState(
    AuthenticatorAttachment.Platform
  );

  const appendLog = useCallback((msg: string) => {
    setLog((prev) => `${prev}\n${msg}`.trim());
  }, []);

  const refreshUsers = useCallback(async () => {
    try {
      const users = await listDemoPasskeyUsers();
      setDemoUsers(users);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const loadError = `Failed to load database.json (${message})`;
      setLog((prev) => `${prev ? `${prev}\n` : ''}${loadError}`.trim());
      showToast(loadError, 'error');
    }
  }, [showToast]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial load from database.json API
    void refreshUsers();
  }, [refreshUsers]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync picker selection when API list arrives
    setVerifyUserId((prev) => {
      if (demoUsers.length === 0) return '';
      if (prev && demoUsers.some((u) => u.id === prev)) return prev;
      return demoUsers[0]!.id;
    });
  }, [demoUsers]);

  const createPasskey = useCallback(async () => {
    setBusy(CredentialFormBusyAction.Create);
    const startedAt = performance.now();
    appendLog(`create() invoked at ${new Date().toISOString()}`);
    try {
      const result = await registerPasskeyDemo({
        passkeyName,
        accountDisplayName,
        accountEmail,
        authenticatorAttachment,
        rpId: window.location.hostname,
      });

      const elapsedMs = (performance.now() - startedAt).toFixed(0);
      console.log('[passkey:create] result', result);

      if (!result.ok) {
        appendLog(
          `create ${result.reason} after ${elapsedMs}ms: ${result.message}`
        );
        if (
          result.reason === 'cancelled' ||
          result.reason === 'null_credential'
        ) {
          showToast(result.message, 'info');
          return;
        }
        showToast(result.message, 'error');
        return;
      }

      appendLog(`create resolved in ${elapsedMs}ms`);
      console.log(result.credential);
      await refreshUsers();
      setVerifyUserId(result.recordId);
      appendLog(
        `Registered & saved (${result.savedRow.label}). rawId (base64url): ${bufferToBase64Url(
          result.credential.rawId
        )}`
      );
      showToast(`Passkey saved as “${result.savedRow.label}”.`, 'success');
    } finally {
      setBusy(null);
    }
  }, [
    accountDisplayName,
    accountEmail,
    appendLog,
    authenticatorAttachment,
    passkeyName,
    refreshUsers,
    showToast,
  ]);

  const clearSavedPasskeys = useCallback(async () => {
    if (demoUsers.length === 0) return;
    if (!window.confirm(DemoUserFacingAlert.ClearPasskeysConfirm)) return;

    setBusy(CredentialFormBusyAction.Clear);
    try {
      await clearDemoPasskeyUsers();
      setVerifyUserId('');
      await refreshUsers();
      appendLog('Cleared all rows from database.json.');
      showToast(DemoUserFacingAlert.PasskeysCleared, 'success');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      appendLog(`Clear failed: ${message}`);
      showToast(message, 'error');
    } finally {
      setBusy(null);
    }
  }, [appendLog, demoUsers.length, refreshUsers, showToast]);

  const verifyPasskey = useCallback(async () => {
    let list: DemoPasskeyUser[];
    try {
      list = await listDemoPasskeyUsers();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      appendLog(`Could not load users: ${message}`);
      showToast(message, 'error');
      return;
    }
    const user = list.find((u) => u.id === verifyUserId);
    if (!user) {
      showToast(DemoUserFacingAlert.RegisterOrPickFirst, 'info');
      return;
    }

    setBusy(CredentialFormBusyAction.Verify);
    try {
      const assertion = await verifyPasskeyWithStoredUser(user);
      if (!assertion.ok) {
        if (assertion.reason === 'credential_decode') {
          appendLog(DemoUserFacingAlert.StoredCredentialDecodeFailed);
          showToast(DemoUserFacingAlert.StoredCredentialInvalid, 'error');
          return;
        }
        appendLog(`verify ${assertion.reason}: ${assertion.message}`);
        if (assertion.reason === 'cancelled') {
          showToast(assertion.message, 'info');
          return;
        }
        showToast(assertion.message, 'error');
        return;
      }

      appendLog(
        'Biometric authentication successful (client assertion received).'
      );

      persistPasskeyDemoSession(user);
      router.push(DemoAppRoute.Dashboard);
    } finally {
      setBusy(null);
    }
  }, [appendLog, router, showToast, verifyUserId]);

  const formDisabled = busy !== null;

  return (
    <div className='mx-auto flex w-full max-w-lg flex-col gap-6'>
      <div className='rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950'>
        <h2 className='text-lg font-semibold text-zinc-900 dark:text-zinc-50'>
          {DemoMarketingCopyFragment.CardPanelHeading}
        </h2>
        <p className='mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400'>
          Challenges are generated in the browser for simplicity. Production
          apps should issue challenges from your server and verify attestation /
          assertions there.
        </p>

        <fieldset
          disabled={formDisabled}
          className='mt-6 space-y-3 border-0 p-0'
        >
          <legend className='sr-only'>Registration parameters</legend>
          <label className='flex flex-col gap-1'>
            <span className='text-xs font-medium text-zinc-600 dark:text-zinc-400'>
              Passkey name
            </span>
            <input
              type='text'
              value={passkeyName}
              onChange={(e) => setPasskeyName(e.target.value)}
              className='rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-400 focus:ring-2 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100'
            />
          </label>
          <label className='flex flex-col gap-1'>
            <span className='text-xs font-medium text-zinc-600 dark:text-zinc-400'>
              Name
            </span>
            <input
              type='text'
              value={accountDisplayName}
              onChange={(e) => setAccountDisplayName(e.target.value)}
              className='rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-400 focus:ring-2 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100'
              placeholder='Name shown when creating your passkey'
            />
          </label>
          <label className='flex flex-col gap-1'>
            <span className='text-xs font-medium text-zinc-600 dark:text-zinc-400'>
              Email
            </span>
            <input
              type='email'
              value={accountEmail}
              onChange={(e) => setAccountEmail(e.target.value)}
              className='rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-400 focus:ring-2 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100'
              placeholder='Often shown as the account line (optional)'
            />
            <span className='text-[11px] text-zinc-500 dark:text-zinc-500'>
              Leave blank to use an auto-generated <code>@demo.local</code>{' '}
              address instead.
            </span>
          </label>
          <label className='flex flex-col gap-1'>
            <span className='text-xs font-medium text-zinc-600 dark:text-zinc-400'>
              Where to save this passkey
            </span>
            <select
              value={authenticatorAttachment}
              onChange={(e) =>
                setAuthenticatorAttachment(
                  e.target.value as AuthenticatorAttachment
                )
              }
              className='rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-400 focus:ring-2 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100'
            >
              <option value={AuthenticatorAttachment.Platform}>
                This device (Touch ID / Windows Hello)
              </option>
              <option value={AuthenticatorAttachment.CrossPlatform}>
                Hardware device (phone or security key)
              </option>
              <option value={AuthenticatorAttachment.BrowserDefault}>
                Let the browser choose
              </option>
            </select>
          </label>
        </fieldset>

        <div className='mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap'>
          <button
            type='button'
            onClick={createPasskey}
            disabled={formDisabled}
            className='rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200'
          >
            {busy === CredentialFormBusyAction.Create
              ? CredentialButtonCaption.CreateBusy
              : CredentialButtonCaption.CreateIdle}
          </button>
        </div>

        <div className='mt-10 border-t border-zinc-100 pt-8 dark:border-zinc-800'>
          <h3 className='text-sm font-semibold text-zinc-900 dark:text-zinc-50'>
            Verify (sign in)
          </h3>
          <p className='mt-1 text-xs text-zinc-500 dark:text-zinc-400'>
            Saved in{' '}
            <code className='rounded bg-zinc-100 px-1 text-[10px] dark:bg-zinc-800'>
              database.json
            </code>{' '}
            via{' '}
            <code className='rounded bg-zinc-100 px-1 text-[10px] dark:bg-zinc-800'>
              {DemoApiPath.Users}
            </code>
            — pick who to authenticate as.
          </p>

          <label className='mt-4 flex flex-col gap-1'>
            <span className='text-xs font-medium text-zinc-600 dark:text-zinc-400'>
              Sign in as
            </span>
            <select
              value={verifyUserId}
              onChange={(e) => setVerifyUserId(e.target.value)}
              disabled={formDisabled || demoUsers.length === 0}
              className='rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-400 focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100'
            >
              {demoUsers.length === 0 ? (
                <option value=''>
                  {DemoVerifySelectPlaceholder.NoSavedPasskeys}
                </option>
              ) : (
                demoUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.label} — {u.syntheticUserEmail} ·{' '}
                    {formatAuthenticatorAttachment(u.authenticator_attachment)}
                  </option>
                ))
              )}
            </select>
          </label>

          <div className='mt-4 flex flex-wrap items-center justify-between gap-3'>
            <button
              type='button'
              onClick={verifyPasskey}
              disabled={formDisabled || demoUsers.length === 0 || !verifyUserId}
              className='rounded-lg border border-zinc-300 bg-transparent px-4 py-2.5 text-sm font-medium text-zinc-900 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-100 dark:hover:bg-zinc-900'
            >
              {busy === CredentialFormBusyAction.Verify
                ? CredentialButtonCaption.VerifyBusy
                : CredentialButtonCaption.VerifyIdle}
            </button>

            <button
              type='button'
              onClick={() => void clearSavedPasskeys()}
              disabled={formDisabled || demoUsers.length === 0}
              className='rounded-lg border border-red-200 bg-transparent px-4 py-2.5 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/40'
            >
              {busy === CredentialFormBusyAction.Clear
                ? CredentialButtonCaption.ClearSavedBusy
                : CredentialButtonCaption.ClearSavedIdle}
            </button>
          </div>
        </div>

        {demoUsers.length > 0 && (
          <p className='mt-4 text-sm text-zinc-600 dark:text-zinc-400'>
            {demoUsers.length} registration
            {demoUsers.length === 1 ? '' : 's'} in{' '}
            <code className='text-xs'>database.json</code>.
          </p>
        )}
      </div>

      <div className='rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/40'>
        <p className='text-xs font-medium uppercase tracking-wide text-zinc-500'>
          Console log
        </p>
        <pre className='mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-all font-mono text-xs text-zinc-800 dark:text-zinc-200'>
          {log || '—'}
        </pre>
      </div>
    </div>
  );
}
