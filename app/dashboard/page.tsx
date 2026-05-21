'use client';

import { useDemoToast } from '@/components/DemoToastProvider';
import {
  CredentialButtonCaption,
  DemoAppRoute,
  DemoSessionJsonKey,
  DemoUserFacingAlert,
  SessionStorageKey,
} from '@/constants';
import {
  clearDemoPasskeyUsers,
  deleteDemoPasskeyUser,
  formatAuthenticatorAttachment,
  listDemoPasskeyUsers,
  type DemoPasskeyUser,
} from '@/utility';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

type DemoSession = {
  [DemoSessionJsonKey.UserName]: string;
  [DemoSessionJsonKey.DisplayName]: string;
  [DemoSessionJsonKey.SignedInAt]: number;
  [DemoSessionJsonKey.DbUserId]?: string;
};

export default function DashboardPage() {
  const router = useRouter();
  const { showToast } = useDemoToast();
  const [session, setSession] = useState<DemoSession | null | undefined>(
    undefined
  );
  const [dbUsers, setDbUsers] = useState<DemoPasskeyUser[]>([]);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(SessionStorageKey.DemoSession);
      if (!raw) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate from sessionStorage on mount
        setSession(null);
        return;
      }
      const parsed = JSON.parse(raw) as DemoSession;
      if (
        !parsed[DemoSessionJsonKey.DisplayName] ||
        !parsed[DemoSessionJsonKey.UserName]
      ) {
        sessionStorage.removeItem(SessionStorageKey.DemoSession);
        setSession(null);
        return;
      }
      setSession(parsed);
    } catch {
      setSession(null);
    }
  }, []);

  const loadDbUsers = useCallback(async () => {
    try {
      setUsersError(null);
      const list = await listDemoPasskeyUsers();
      setDbUsers(list);
    } catch (e) {
      setUsersError(e instanceof Error ? e.message : 'Failed to load');
      setDbUsers([]);
    }
  }, []);

  useEffect(() => {
    if (!session?.[DemoSessionJsonKey.UserName]) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load DB when session becomes ready
    void loadDbUsers();
  }, [session, loadDbUsers]);

  useEffect(() => {
    if (session === null) router.replace(DemoAppRoute.Home);
  }, [session, router]);

  function signOut() {
    sessionStorage.removeItem(SessionStorageKey.DemoSession);
    router.push(DemoAppRoute.Home);
  }

  async function clearAllPasskeys() {
    if (dbUsers.length === 0) return;
    if (!window.confirm(DemoUserFacingAlert.ClearPasskeysConfirm)) return;

    setClearing(true);
    try {
      await clearDemoPasskeyUsers();
      setDbUsers([]);
      showToast(DemoUserFacingAlert.PasskeysCleared, 'success');
      signOut();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Clear failed', 'error');
    } finally {
      setClearing(false);
    }
  }

  async function removePasskey(id: string) {
    if (!window.confirm('Remove this passkey row from MongoDB?')) return;

    setRemovingId(id);
    try {
      await deleteDemoPasskeyUser(id);
      const next = dbUsers.filter((u) => u.id !== id);
      setDbUsers(next);
      showToast(DemoUserFacingAlert.PasskeyRemoved, 'success');
      if (next.length === 0 || next.every((row) => !rowIsCurrent(row))) {
        signOut();
      }
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Remove failed', 'error');
    } finally {
      setRemovingId(null);
    }
  }

  function rowIsCurrent(row: DemoPasskeyUser): boolean {
    const dbUserId = session?.[DemoSessionJsonKey.DbUserId];
    if (dbUserId) {
      return row.id === dbUserId;
    }
    return (
      row.syntheticUserEmail === session?.[DemoSessionJsonKey.UserName] &&
      row.displayName === session?.[DemoSessionJsonKey.DisplayName]
    );
  }

  if (session === undefined || session === null) {
    return (
      <div className="flex min-h-full flex-1 items-center justify-center bg-zinc-50 text-sm text-zinc-500 dark:bg-black dark:text-zinc-400">
        Loading…
      </div>
    );
  }

  const currentRow = dbUsers.find((u) => rowIsCurrent(u)) ?? null;

  return (
    <div className="min-h-full flex-1 bg-zinc-50 px-6 py-10 dark:bg-black">
      <div className="mx-auto max-w-4xl rounded-xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-zinc-100 pb-6 dark:border-zinc-800">
          <div>
            <p className="text-xs uppercase tracking-wide text-zinc-500">
              Dashboard
            </p>
            <h1 className="mt-1 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
              Hello, {session[DemoSessionJsonKey.DisplayName]}
            </h1>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              Signed in as {session[DemoSessionJsonKey.UserName]}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              Session signed in{' '}
              <time
                dateTime={
                  new Date(session[DemoSessionJsonKey.SignedInAt]).toISOString()
                }
              >
                {new Intl.DateTimeFormat(undefined, {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                }).format(new Date(session[DemoSessionJsonKey.SignedInAt]))}
              </time>
            </p>
          </div>
          <button
            type="button"
            onClick={signOut}
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800 transition hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-900"
          >
            Sign out
          </button>
        </header>

        {currentRow && (
          <div className="mt-8 rounded-lg border border-emerald-200 bg-emerald-50/80 p-4 dark:border-emerald-900/80 dark:bg-emerald-950/30">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-emerald-800 dark:text-emerald-300">
              Current credential (matched in MongoDB)
            </h2>
            <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
              <div className="sm:col-span-2">
                <dt className="text-zinc-500 dark:text-zinc-400">label</dt>
                <dd className="font-medium text-zinc-900 dark:text-zinc-100">
                  {currentRow.label}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500 dark:text-zinc-400">rpid</dt>
                <dd className="font-mono text-xs text-zinc-900 dark:text-zinc-100">
                  {currentRow.rpid || '—'}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500 dark:text-zinc-400">
                  authenticator_attachment
                </dt>
                <dd className="text-zinc-900 dark:text-zinc-100">
                  {formatAuthenticatorAttachment(
                    currentRow.authenticator_attachment
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500 dark:text-zinc-400">transports</dt>
                <dd className="font-mono text-xs text-zinc-900 dark:text-zinc-100">
                  {currentRow.transports?.length
                    ? JSON.stringify(currentRow.transports)
                    : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500 dark:text-zinc-400">
                  prev_counter
                </dt>
                <dd className="tabular-nums text-zinc-900 dark:text-zinc-100">
                  {currentRow.prev_counter}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-zinc-500 dark:text-zinc-400">
                  credential_id
                </dt>
                <dd className="break-all font-mono text-[11px] text-zinc-800 dark:text-zinc-200">
                  {currentRow.credential_id}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-zinc-500 dark:text-zinc-400">public_key</dt>
                <dd>
                  <pre className="max-h-36 overflow-auto rounded-md border border-zinc-200 bg-white p-2 text-[10px] leading-snug whitespace-pre-wrap text-zinc-800 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200">
                    {currentRow.public_key || '(no SPKI export from browser)'}
                  </pre>
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-zinc-500 dark:text-zinc-400">record id</dt>
                <dd className="break-all font-mono text-xs text-zinc-800 dark:text-zinc-200">
                  {currentRow.id}
                </dd>
              </div>
            </dl>
          </div>
        )}

        <div className="mt-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              All registrations (MongoDB)
            </h2>
            <button
              type="button"
              onClick={() => void clearAllPasskeys()}
              disabled={
                clearing || removingId !== null || dbUsers.length === 0
              }
              className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/40"
            >
              {clearing
                ? CredentialButtonCaption.ClearAllBusy
                : CredentialButtonCaption.ClearAllIdle}
            </button>
          </div>
          {usersError && (
            <p className="mt-3 text-sm text-red-600 dark:text-red-400">
              {usersError}{' '}
              <button
                type="button"
                className="font-medium underline"
                onClick={() => void loadDbUsers()}
              >
                Retry
              </button>
            </p>
          )}
          <div className="mt-3 overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
            <table className="w-full min-w-[52rem] text-left text-sm">
              <thead className="border-b border-zinc-100 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/60">
                <tr>
                  <th className="px-3 py-2.5 font-medium text-zinc-600 dark:text-zinc-400">
                    Current
                  </th>
                  <th className="px-3 py-2.5 font-medium text-zinc-600 dark:text-zinc-400">
                    label
                  </th>
                  <th className="px-3 py-2.5 font-medium text-zinc-600 dark:text-zinc-400">
                    rpid
                  </th>
                  <th className="px-3 py-2.5 font-medium text-zinc-600 dark:text-zinc-400">
                    Name / email
                  </th>
                  <th className="px-3 py-2.5 font-medium text-zinc-600 dark:text-zinc-400">
                    attachment
                  </th>
                  <th className="px-3 py-2.5 font-medium text-zinc-600 dark:text-zinc-400">
                    counter
                  </th>
                  <th className="px-3 py-2.5 font-medium text-zinc-600 dark:text-zinc-400">
                    registered
                  </th>
                  <th className="px-3 py-2.5 font-medium text-zinc-600 dark:text-zinc-400">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {dbUsers.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-6 text-center text-zinc-500 dark:text-zinc-400"
                    >
                      No rows loaded — create a passkey on the home page.
                    </td>
                  </tr>
                ) : (
                  dbUsers.map((row) => {
                    const isYou = rowIsCurrent(row);
                    return (
                      <tr
                        key={row.id}
                        className={
                          isYou
                            ? 'border-y border-emerald-200 bg-emerald-50/50 dark:border-emerald-900/50 dark:bg-emerald-950/20'
                            : 'border-b border-zinc-100 dark:border-zinc-800/80'
                        }
                      >
                        <td className="px-3 py-2 whitespace-nowrap text-zinc-700 dark:text-zinc-300">
                          {isYou ? 'You' : '—'}
                        </td>
                        <td className="px-3 py-2 font-medium whitespace-nowrap text-zinc-900 dark:text-zinc-100">
                          {row.label || '—'}
                        </td>
                        <td className="max-w-[8rem] truncate px-3 py-2 font-mono text-xs text-zinc-700 dark:text-zinc-300">
                          {row.rpid || '—'}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-zinc-700 dark:text-zinc-300">
                          <span>{row.displayName}</span>
                          <span className="block text-xs text-zinc-500 dark:text-zinc-400">
                            {row.syntheticUserEmail}
                          </span>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-zinc-700 dark:text-zinc-300">
                          {formatAuthenticatorAttachment(
                            row.authenticator_attachment
                          )}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap tabular-nums text-zinc-600 dark:text-zinc-400">
                          {row.prev_counter}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap tabular-nums text-zinc-600 dark:text-zinc-400">
                          {new Intl.DateTimeFormat(undefined, {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          }).format(new Date(row.createdAt))}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => void removePasskey(row.id)}
                            disabled={clearing || removingId !== null}
                            className="rounded-md border border-red-200 px-2 py-1 text-xs font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/40"
                          >
                            {removingId === row.id
                              ? 'Removing…'
                              : CredentialButtonCaption.RemoveRow}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-zinc-500">
            Rows follow the persisted credential shape:{' '}
            <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">
              credential_id
            </code>
            ,{' '}
            <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">rpid</code>
            ,{' '}
            <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">label</code>
            ,{' '}
            <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">
              public_key
            </code>
            ,{' '}
            <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">
              prev_counter
            </code>
            ,{' '}
            <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">
              authenticator_attachment
            </code>
            ,{' '}
            <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">
              transports
            </code>
            .
            {currentRow === null &&
              dbUsers.length > 0 &&
              !usersError &&
              ' No matching row for this session — sign in again from the picker.'}
          </p>
        </div>

        <div className="mt-8 rounded-lg border border-dashed border-zinc-200 p-6 dark:border-zinc-700">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Quick links
          </h2>
          <ul className="mt-3 list-inside list-disc text-sm text-zinc-700 dark:text-zinc-300">
            <li>
              <Link
                href={DemoAppRoute.Home}
                className="font-medium underline-offset-4 hover:underline"
              >
                Passkey demo
              </Link>
            </li>
            <li>Account settings — N/A</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
