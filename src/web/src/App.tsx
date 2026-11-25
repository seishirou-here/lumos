import { Calendar as CalendarIcon, MessageSquareText } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import type { MemoItem } from '@shared/types';

import { AuthGate } from './components/AuthGate';
import { CalendarView } from './components/CalendarView';
import { Composer } from './components/Composer';
import { Header, type ConnectionStatus } from './components/Header';
import { MemoStream } from './components/MemoStream';
import {
  createFirestoreMemo,
  permanentDeleteFirestoreMemo,
  restoreFirestoreMemo,
  setFirestoreMemoArchived,
  softDeleteFirestoreMemo,
  subscribeMemos,
  toggleFirestoreMemoComplete,
} from './lib/firestoreMemos';
import { cn, createMemoId, extractTags, haptic } from './lib/utils';

function LumosWorkspace({ onSignOut }: { onSignOut: () => Promise<void> }) {
  const [activeTab, setActiveTab] = useState<'stream' | 'calendar'>('stream');
  const [memos, setMemos] = useState<MemoItem[]>([]);
  const [selectedTag, setSelectedTag] = useState<string | undefined>(undefined);
  const [isHydrating, setIsHydrating] = useState(true);
  const [hasPendingWrites, setHasPendingWrites] = useState(false);
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const [syncError, setSyncError] = useState<string | null>(null);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeMemos(
      (cloudMemos, pendingWrites) => {
        setMemos(cloudMemos);
        setHasPendingWrites(pendingWrites);
        setIsHydrating(false);
        setSyncError(null);
      },
      (error) => {
        console.error('Lumos: Firestore subscription failed.', error);
        setSyncError(error.message);
        setIsHydrating(false);
      },
    );

    return () => unsubscribe();
  }, []);

  const handleDump = useCallback(async (content: string) => {
    const tags = extractTags(content);
    const hasAgyTag = tags.includes('agy');
    const now = Date.now();

    const memo: MemoItem = {
      id: createMemoId(),
      content,
      createdAt: now,
      status: 'pending',
      completed: false,
      archived: false,
      ...(tags.length > 0 ? { tags } : {}),
      ...(hasAgyTag ? { agyStatus: 'pending' as const, agyUpdatedAt: now } : {}),
    };

    try {
      await createFirestoreMemo(memo);
    } catch (error) {
      console.error('Lumos: failed to write memo to Firestore.', error);
    }
  }, []);

  const handleToggleComplete = useCallback(async (id: string, completed: boolean) => {
    try {
      await toggleFirestoreMemoComplete(id, completed);
    } catch (error) {
      console.error('Lumos: failed to update completed state.', error);
    }
  }, []);

  const handleArchiveMemo = useCallback(async (id: string, archived: boolean) => {
    try {
      await setFirestoreMemoArchived(id, archived);
    } catch (error) {
      console.error('Lumos: failed to update archive state.', error);
    }
  }, []);

  const handleDeleteMemo = useCallback(async (id: string) => {
    try {
      await softDeleteFirestoreMemo(id);
    } catch (error) {
      console.error('Lumos: failed to move memo to trash.', error);
    }
  }, []);

  const handleRestoreMemo = useCallback(async (id: string) => {
    try {
      await restoreFirestoreMemo(id);
    } catch (error) {
      console.error('Lumos: failed to restore memo from trash.', error);
    }
  }, []);

  const handlePermanentDeleteMemo = useCallback(async (id: string) => {
    try {
      await permanentDeleteFirestoreMemo(id);
    } catch (error) {
      console.error('Lumos: failed to permanently delete memo.', error);
    }
  }, []);

  const pendingCount = memos.reduce(
    (count, memo) => (memo.status === 'synced' ? count : count + 1),
    0,
  );

  const agyPendingCount = memos.reduce(
    (count, memo) =>
      !memo.deletedAt && !memo.archived && memo.agyStatus === 'pending' ? count + 1 : count,
    0,
  );

  const connection: ConnectionStatus = isHydrating
    ? 'checking'
    : !isOnline
      ? 'offline'
      : 'online';

  return (
    <div className="relative min-h-dvh overflow-x-hidden bg-lumos-bg transition-colors duration-300">
      <div
        aria-hidden="true"
        className="ambient-glow pointer-events-none fixed inset-x-0 top-0 h-[420px]"
      />
      <div aria-hidden="true" className="grain pointer-events-none fixed inset-0" />

      <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-xl flex-col px-4 sm:px-6">
        <Header
          status={connection}
          pendingCount={pendingCount}
          agyPendingCount={agyPendingCount}
          isSyncing={isOnline && hasPendingWrites}
          onSelectAgyTag={() => {
            setActiveTab('stream');
            setSelectedTag((prev) => (prev === 'agy' ? undefined : 'agy'));
          }}
          onSignOut={() => void onSignOut()}
        />

        {syncError && (
          <div className="mb-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
            Firestore error: {syncError}
          </div>
        )}

        {/* View Switcher: Stream vs Calendar (full-width, 44px touch targets) */}
        <div
          role="tablist"
          aria-label="Tampilan"
          className="mb-4 grid grid-cols-2 gap-1 rounded-2xl border border-lumos-line/60 bg-lumos-surface/80 p-1 shadow-sm backdrop-blur-md sm:mx-auto sm:w-80"
        >
          {(
            [
              { id: 'stream', label: 'Memos', Icon: MessageSquareText },
              { id: 'calendar', label: 'Kalender', Icon: CalendarIcon },
            ] as const
          ).map(({ id, label, Icon }) => {
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => {
                  haptic(8);
                  setActiveTab(id);
                }}
                className={cn(
                  'flex min-h-11 items-center justify-center gap-2 rounded-xl border text-sm font-medium transition-[background-color,border-color,color,transform] duration-150 active:scale-[0.97]',
                  isActive
                    ? 'border-lumos-accent/30 bg-lumos-accent/15 text-lumos-accent shadow-sm'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200 active:bg-lumos-elevated',
                )}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                <span>{label}</span>
              </button>
            );
          })}
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
          Cloud Firestore · Offline-first · #agy inbox · 30 hari sampah
        </footer>
      </div>
    </div>
  );
}

export default function App() {
  return <AuthGate>{(_user, onSignOut) => <LumosWorkspace onSignOut={onSignOut} />}</AuthGate>;
}
