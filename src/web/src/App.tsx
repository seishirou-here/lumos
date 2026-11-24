import { useCallback, useEffect, useRef, useState } from 'react';
import { Calendar as CalendarIcon, MessageSquareText } from 'lucide-react';

import type { MemoItem, MemoSyncStatus } from '@shared/types';

import { CalendarView } from './components/CalendarView';
import { Composer } from './components/Composer';
import { Header, type ConnectionStatus } from './components/Header';
import { MemoStream } from './components/MemoStream';
import {
  archiveServerMemo,
  checkHealth,
  completeServerMemo,
  deleteServerMemo,
  dumpMemos,
  fetchMemos,
  restoreServerMemo,
} from './lib/api';
import {
  clearPendingDelete,
  getPendingDeleteIds,
  getPendingMemos,
  listMemos,
  mergeServerMemos,
  queuePendingDelete,
  removeMemo,
  saveMemo,
  updateMemo,
} from './lib/storage';
import { useMemoSync } from './lib/useMemoSync';
import { createMemoId, extractTags } from './lib/utils';

const HEALTH_POLL_INTERVAL = 20_000;
const HEALTH_TIMEOUT = 5_000;

/**
 * Keep optimistic local writes visible when the archive response lands while a
 * memo is still being saved: only already-synced entries may be replaced.
 */
function reconcileMemos(previous: MemoItem[], merged: MemoItem[]): MemoItem[] {
  const byId = new Map(previous.map((memo) => [memo.id, memo]));

  for (const memo of merged) {
    const local = byId.get(memo.id);
    if (local && local.status !== 'synced') continue;
    byId.set(memo.id, memo);
  }

  return [...byId.values()].sort((a, b) => b.createdAt - a.createdAt);
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'stream' | 'calendar'>('stream');
  const [memos, setMemos] = useState<MemoItem[]>([]);
  const [selectedTag, setSelectedTag] = useState<string | undefined>(undefined);
  const [connection, setConnection] = useState<ConnectionStatus>('checking');
  const [isHydrating, setIsHydrating] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const syncingRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    listMemos()
      .then((storedMemos) => {
        if (!cancelled) setMemos(storedMemos);
      })
      .catch((error: unknown) => {
        console.error('Lumos: failed to read the local memo queue.', error);
      })
      .finally(() => {
        if (!cancelled) setIsHydrating(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const applyStatus = useCallback(async (ids: string[], status: MemoSyncStatus) => {
    if (ids.length === 0) return;

    const targetIds = new Set(ids);
    setMemos((previous) =>
      previous.map((memo) => (targetIds.has(memo.id) ? { ...memo, status } : memo)),
    );

    await Promise.allSettled(ids.map((id) => updateMemo(id, { status })));
  }, []);

  const flushQueue = useCallback(async () => {
    if (isHydrating || syncingRef.current || !navigator.onLine) return;

    syncingRef.current = true;
    let pendingIds: string[] = [];
    let pushError: unknown;

    try {
      // 0. Flush any pending offline permanent deletions before syncing memos.
      const pendingDeleteIds = await getPendingDeleteIds();
      if (pendingDeleteIds.length > 0) {
        await Promise.allSettled(
          pendingDeleteIds.map(async (id) => {
            await deleteServerMemo(id, { permanent: true });
            await clearPendingDelete(id);
          }),
        );
      }

      const pending = await getPendingMemos();

      // 1. Push local unpublished memos to the host archive.
      if (pending.length > 0) {
        setIsSyncing(true);
        pendingIds = pending.map((memo) => memo.id);
        await applyStatus(pendingIds, 'syncing');

        try {
          const accepted = await dumpMemos(pending);
          const acceptedIds = new Set(accepted);
          const syncedIds = pendingIds.filter((id) => acceptedIds.has(id));
          const rejectedIds = pendingIds.filter((id) => !acceptedIds.has(id));

          if (syncedIds.length > 0) await applyStatus(syncedIds, 'synced');
          if (rejectedIds.length > 0) await applyStatus(rejectedIds, 'failed');
          pendingIds = [];
        } catch (error) {
          pushError = error;
          await applyStatus(pendingIds, 'pending');
          pendingIds = [];
        }
      }

      // 2. Pull active and trash memos from the host archive and merge into IndexedDB + React state.
      try {
        const [serverActive, serverTrash] = await Promise.all([
          fetchMemos({ limit: 200 }),
          fetchMemos({ limit: 100, trash: true }),
        ]);
        const merged = await mergeServerMemos([...serverActive, ...serverTrash]);
        setMemos((previous) => reconcileMemos(previous, merged));
        setConnection('online');
      } catch (error) {
        console.error('Lumos: failed to fetch host memo history.', error);
        if (pushError) setConnection('offline');
      }

      if (pushError) {
        console.error('Lumos: memo dump failed, items stay queued locally.', pushError);
      }
    } catch (error) {
      console.error('Lumos: sync cycle failed, items stay queued locally.', error);
      if (pendingIds.length > 0) await applyStatus(pendingIds, 'pending');
      setConnection('offline');
    } finally {
      syncingRef.current = false;
      setIsSyncing(false);
    }
  }, [applyStatus, isHydrating]);

  useEffect(() => {
    let disposed = false;

    const probeHost = async () => {
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), HEALTH_TIMEOUT);
      const health = await checkHealth(controller.signal);
      window.clearTimeout(timeout);

      if (disposed) return;

      setConnection(health ? 'online' : 'offline');
      if (health) await flushQueue();
    };

    const handleOnline = () => {
      void probeHost();
    };
    const handleOffline = () => {
      setConnection('offline');
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') void probeHost();
    };

    void probeHost();

    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') void probeHost();
    }, HEALTH_POLL_INTERVAL);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      disposed = true;
      window.clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [flushQueue]);

  const handleDump = useCallback(
    async (content: string) => {
      const tags = extractTags(content);
      const memo: MemoItem = {
        id: createMemoId(),
        content,
        createdAt: Date.now(),
        status: 'pending',
        completed: false,
        ...(tags.length > 0 ? { tags } : {}),
      };

      // Optimistic: the stream updates before IndexedDB or the network responds.
      setMemos((previous) => [memo, ...previous]);

      try {
        await saveMemo(memo);
      } catch (error) {
        console.error('Lumos: failed to persist a memo locally.', error);
      }

      void flushQueue();
    },
    [flushQueue],
  );

  const handleToggleComplete = useCallback(
    async (id: string, completed: boolean) => {
      const completedAt = completed ? Date.now() : undefined;

      setMemos((previous) =>
        previous.map((memo) =>
          memo.id === id ? { ...memo, completed, completedAt, status: 'pending' } : memo,
        ),
      );

      try {
        await updateMemo(id, { completed, completedAt, status: 'pending' });
      } catch (error) {
        console.error('Lumos: failed to update completed state locally.', error);
      }

      try {
        const updated = await completeServerMemo(id, completed);
        if (updated) {
          await updateMemo(id, {
            completed: updated.completed,
            completedAt: updated.completedAt,
            status: 'synced',
          });
          setMemos((previous) =>
            previous.map((memo) =>
              memo.id === id
                ? {
                    ...memo,
                    completed: updated.completed,
                    completedAt: updated.completedAt,
                    status: 'synced',
                  }
                : memo,
            ),
          );
          return;
        }
      } catch {
        // Offline or unreachable: stays pending and will flush on reconnect.
      }

      void flushQueue();
    },
    [flushQueue],
  );

  const handleArchiveMemo = useCallback(
    async (id: string, archived: boolean) => {
      setMemos((previous) =>
        previous.map((memo) =>
          memo.id === id ? { ...memo, archived, status: 'pending' } : memo,
        ),
      );

      try {
        await updateMemo(id, { archived, status: 'pending' });
      } catch (error) {
        console.error('Lumos: failed to update archive state locally.', error);
      }

      try {
        const updated = await archiveServerMemo(id, archived);
        if (updated) {
          await updateMemo(id, { archived, status: 'synced' });
          setMemos((previous) =>
            previous.map((memo) =>
              memo.id === id ? { ...memo, archived, status: 'synced' } : memo,
            ),
          );
          return;
        }
      } catch {
        // Offline or unreachable: the memo remains `pending` and will sync on next flushQueue.
      }

      void flushQueue();
    },
    [flushQueue],
  );

  // Soft-delete: Move to trash (30-day retention)
  const handleDeleteMemo = useCallback(
    async (id: string) => {
      const deletedAt = Date.now();

      setMemos((previous) =>
        previous.map((memo) =>
          memo.id === id ? { ...memo, deletedAt, status: 'pending' } : memo,
        ),
      );

      try {
        await updateMemo(id, { deletedAt, status: 'pending' });
      } catch (error) {
        console.error('Lumos: failed to soft-delete memo locally.', error);
      }

      try {
        const res = await deleteServerMemo(id, { permanent: false });
        if (res.memo) {
          await updateMemo(id, { deletedAt: res.memo.deletedAt, status: 'synced' });
          setMemos((previous) =>
            previous.map((memo) =>
              memo.id === id ? { ...memo, deletedAt: res.memo!.deletedAt, status: 'synced' } : memo,
            ),
          );
          return;
        }
      } catch {
        // Offline: memo remains marked deletedAt locally and syncs on flush.
      }

      void flushQueue();
    },
    [flushQueue],
  );

  // Restore soft-deleted memo from trash
  const handleRestoreMemo = useCallback(
    async (id: string) => {
      setMemos((previous) =>
        previous.map((memo) =>
          memo.id === id ? { ...memo, deletedAt: undefined, status: 'pending' } : memo,
        ),
      );

      try {
        await updateMemo(id, { deletedAt: undefined, status: 'pending' });
      } catch (error) {
        console.error('Lumos: failed to restore memo locally.', error);
      }

      try {
        const updated = await restoreServerMemo(id);
        if (updated) {
          await updateMemo(id, { deletedAt: undefined, status: 'synced' });
          setMemos((previous) =>
            previous.map((memo) =>
              memo.id === id ? { ...memo, deletedAt: undefined, status: 'synced' } : memo,
            ),
          );
          return;
        }
      } catch {
        // Offline: stays restored locally and will sync on flush.
      }

      void flushQueue();
    },
    [flushQueue],
  );

  // Permanent immediate deletion (called from Trash tab)
  const handlePermanentDeleteMemo = useCallback(async (id: string) => {
    setMemos((previous) => previous.filter((memo) => memo.id !== id));

    try {
      await Promise.all([removeMemo(id), queuePendingDelete(id)]);
    } catch (error) {
      console.error('Lumos: failed to permanently remove memo locally.', error);
    }

    try {
      await deleteServerMemo(id, { permanent: true });
      await clearPendingDelete(id);
    } catch {
      // Offline: queued in pendingDeleteStore and will flush on reconnect.
    }
  }, []);

  // ── Real-time SSE subscription ──────────────────────────────────────
  const handleSSEMemos = useCallback(
    async (incoming: MemoItem[]) => {
      try {
        const merged = await mergeServerMemos(incoming);
        setMemos((previous) => reconcileMemos(previous, merged));
        setConnection('online');
      } catch (error) {
        console.error('Lumos: failed to merge SSE memos into local store.', error);
      }
    },
    [],
  );

  const handleSSEMemoDeleted = useCallback(async (id: string) => {
    setMemos((previous) => previous.filter((memo) => memo.id !== id));
    try {
      await Promise.all([removeMemo(id), clearPendingDelete(id)]);
    } catch (error) {
      console.error('Lumos: failed to apply SSE memo deletion locally.', error);
    }
  }, []);

  useMemoSync({
    onMemos: handleSSEMemos,
    onMemoDeleted: handleSSEMemoDeleted,
    isReady: !isHydrating,
  });

  const pendingCount = memos.reduce(
    (count, memo) => (memo.status === 'synced' ? count : count + 1),
    0,
  );

  return (
    <div className="relative min-h-dvh overflow-x-hidden bg-lumos-bg transition-colors duration-300">
      <div
        aria-hidden="true"
        className="ambient-glow pointer-events-none fixed inset-x-0 top-0 h-[420px]"
      />
      <div aria-hidden="true" className="grain pointer-events-none fixed inset-0" />

      <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-xl flex-col px-4 sm:px-6">
        <Header status={connection} pendingCount={pendingCount} isSyncing={isSyncing} />

        {/* View Switcher: Stream vs Calendar */}
        <div className="mb-4 flex items-center justify-center">
          <div className="inline-flex rounded-xl border border-lumos-line/60 bg-lumos-surface/80 p-1 shadow-sm backdrop-blur-md">
            <button
              type="button"
              onClick={() => {
                setActiveTab('stream');
              }}
              className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-medium transition-all ${
                activeTab === 'stream'
                  ? 'border border-lumos-accent/30 bg-lumos-accent/15 text-lumos-accent shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <MessageSquareText className="h-3.5 w-3.5" />
              <span>Memos</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('calendar');
              }}
              className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-medium transition-all ${
                activeTab === 'calendar'
                  ? 'border border-lumos-accent/30 bg-lumos-accent/15 text-lumos-accent shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <CalendarIcon className="h-3.5 w-3.5" />
              <span>Kalender</span>
            </button>
          </div>
        </div>

        <main className="flex-1">
          {activeTab === 'stream' ? (
            <>
              <Composer onSubmit={handleDump} />
              <MemoStream
                memos={memos}
                isLoading={isHydrating}
                selectedTag={selectedTag}
                onSelectTag={setSelectedTag}
                onToggleComplete={handleToggleComplete}
                onArchive={handleArchiveMemo}
                onDelete={handleDeleteMemo}
                onRestore={handleRestoreMemo}
                onPermanentDelete={handlePermanentDeleteMemo}
              />
            </>
          ) : (
            <CalendarView />
          )}
        </main>

        <footer className="pb-dock pt-2 text-center text-[10px] tracking-wide text-zinc-500">
          Offline-first · 30 hari sampah · checklist & tag tracker
        </footer>
      </div>
    </div>
  );
}
