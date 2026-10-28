import { useCallback, useEffect, useRef, useState } from 'react';

import type { MemoItem, MemoSyncStatus } from '@shared/types';

import { Composer } from './components/Composer';
import { Header, type ConnectionStatus } from './components/Header';
import { MemoStream } from './components/MemoStream';
import { checkHealth, dumpMemos } from './lib/api';
import { getPendingMemos, listMemos, saveMemo, updateMemo } from './lib/storage';
import { createMemoId, extractTags } from './lib/utils';

const HEALTH_POLL_INTERVAL = 20_000;
const HEALTH_TIMEOUT = 5_000;

export default function App() {
  const [memos, setMemos] = useState<MemoItem[]>([]);
  const [connection, setConnection] = useState<ConnectionStatus>('checking');
  const [isHydrating, setIsHydrating] = useState(true);
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
    let inFlightIds: string[] = [];

    try {
      const pending = await getPendingMemos();
      if (pending.length === 0) return;

      inFlightIds = pending.map((memo) => memo.id);
      await applyStatus(inFlightIds, 'syncing');

      const accepted = await dumpMemos(pending);
      const acceptedIds = new Set(accepted);
      const syncedIds = inFlightIds.filter((id) => acceptedIds.has(id));
      const rejectedIds = inFlightIds.filter((id) => !acceptedIds.has(id));

      if (syncedIds.length > 0) await applyStatus(syncedIds, 'synced');
      if (rejectedIds.length > 0) await applyStatus(rejectedIds, 'failed');

      setConnection('online');
    } catch (error) {
      console.error('Lumos: memo sync failed, items stay queued locally.', error);
      if (inFlightIds.length > 0) await applyStatus(inFlightIds, 'pending');
      setConnection('offline');
    } finally {
      syncingRef.current = false;
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
        <Header status={connection} pendingCount={pendingCount} />

        <main className="flex-1">
          <Composer onSubmit={handleDump} />
          <MemoStream memos={memos} isLoading={isHydrating} />
        </main>

        <footer className="pb-safe pt-2 text-center text-[10px] tracking-wide text-zinc-500">
          Offline-first · disinkronkan ke laptop lewat Tailscale
        </footer>
      </div>
    </div>
  );
}
