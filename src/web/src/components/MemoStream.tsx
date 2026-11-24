import { Archive, CheckCircle2, Filter, Sparkles, Tag, Trash2, X } from 'lucide-react';
import { useMemo, useState } from 'react';

import type { MemoItem } from '@shared/types';

import { cn, haptic } from '../lib/utils';
import { MemoCard } from './MemoCard';

interface MemoStreamProps {
  memos: MemoItem[];
  isLoading?: boolean;
  selectedTag?: string;
  onSelectTag?: (tag: string | undefined) => void;
  onToggleComplete?: (id: string, completed: boolean) => void;
  onArchive?: (id: string, archived: boolean) => void;
  onDelete?: (id: string) => void;
  onRestore?: (id: string) => void;
  onPermanentDelete?: (id: string) => void;
}

type StreamTab = 'active' | 'completed' | 'all' | 'archived' | 'trash';

function StreamSkeleton() {
  return (
    <div className="space-y-2.5" aria-hidden="true">
      {[0, 1].map((item) => (
        <div
          key={item}
          className="animate-soft-pulse rounded-2xl border border-lumos-line/70 bg-lumos-surface/50 p-4"
        >
          <div className="mb-3 flex items-center justify-between">
            <div className="h-2.5 w-16 rounded-full bg-lumos-line/60" />
            <div className="h-4 w-16 rounded-full bg-lumos-line/40" />
          </div>
          <div className="h-3 w-11/12 rounded-full bg-lumos-line/60" />
          <div className="mt-2 h-3 w-2/3 rounded-full bg-lumos-line/40" />
        </div>
      ))}
    </div>
  );
}

function EmptyStream({
  tab,
  hasTagFilter,
}: {
  tab: StreamTab;
  hasTagFilter: boolean;
}) {
  let title = 'Belum ada memo';
  let desc = 'Tulis ide atau catatan di atas. Tersimpan aman secara lokal di perangkat.';

  if (hasTagFilter) {
    title = 'Tidak ada memo untuk tag ini';
    desc = 'Coba pilih tag lain atau bersihkan filter tag di atas.';
  } else if (tab === 'trash') {
    title = 'Sampah kosong';
    desc = 'Memo yang kamu hapus akan disimpan di sini selama 30 hari sebelum dihapus permanen secara otomatis.';
  } else if (tab === 'completed') {
    title = 'Belum ada memo yang selesai';
    desc = 'Checklist memo yang sudah selesai untuk melacak kemajuan tugasmu.';
  } else if (tab === 'archived') {
    title = 'Arsip masih kosong';
    desc = 'Memo yang kamu arsipkan akan tersimpan rapi di sini.';
  } else if (tab === 'active') {
    title = 'Semua tugas telah diselesaikan!';
    desc = 'Tidak ada memo aktif yang tertunda saat ini. Bagus sekali!';
  }

  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-lumos-line/90 px-6 py-12 text-center">
      <div className="mb-3 grid h-11 w-11 place-items-center rounded-full bg-lumos-accent/5 text-lumos-accent/80 ring-1 ring-inset ring-lumos-accent/15">
        {tab === 'trash' ? (
          <Trash2 className="h-5 w-5 text-rose-400" aria-hidden="true" />
        ) : tab === 'archived' ? (
          <Archive className="h-5 w-5" aria-hidden="true" />
        ) : tab === 'completed' ? (
          <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
        ) : (
          <Sparkles className="h-5 w-5" aria-hidden="true" />
        )}
      </div>
      <p className="text-sm font-medium text-zinc-300">{title}</p>
      <p className="mt-1 max-w-[32ch] text-xs leading-relaxed text-zinc-500">{desc}</p>
    </div>
  );
}

export function MemoStream({
  memos,
  isLoading = false,
  selectedTag,
  onSelectTag,
  onToggleComplete,
  onArchive,
  onDelete,
  onRestore,
  onPermanentDelete,
}: MemoStreamProps) {
  const [tab, setTab] = useState<StreamTab>('active');

  // Compute tag tracker metrics directly from current non-deleted, non-archived memos
  const tagStats = useMemo(() => {
    const map = new Map<string, { total: number; completed: number; active: number }>();

    for (const memo of memos) {
      if (memo.archived || memo.deletedAt) continue;
      const inline = (memo.content.match(/#[\p{L}\p{N}_-]+/gu) ?? []).map((t) =>
        t.slice(1).toLowerCase(),
      );
      const allTags = new Set([...inline, ...(memo.tags ?? []).map((t) => t.toLowerCase())]);

      for (const tag of allTags) {
        if (!tag) continue;
        let stat = map.get(tag);
        if (!stat) {
          stat = { total: 0, completed: 0, active: 0 };
          map.set(tag, stat);
        }
        stat.total += 1;
        if (memo.completed) {
          stat.completed += 1;
        } else {
          stat.active += 1;
        }
      }
    }

    return Array.from(map.entries())
      .map(([tag, stat]) => ({ tag, ...stat }))
      .sort((a, b) => b.total - a.total || a.tag.localeCompare(b.tag));
  }, [memos]);

  // Filter memos by selected status tab and tag
  const filteredMemos = useMemo(() => {
    return memos.filter((memo) => {
      // 1. Trash tab check
      if (tab === 'trash') {
        if (!memo.deletedAt) return false;
      } else {
        // Non-trash tabs never show deleted memos
        if (memo.deletedAt) return false;

        if (tab === 'archived') {
          if (!memo.archived) return false;
        } else {
          if (memo.archived) return false;
          if (tab === 'active' && memo.completed) return false;
          if (tab === 'completed' && !memo.completed) return false;
        }
      }

      // 2. Metadata tag filter
      if (selectedTag && tab !== 'trash') {
        const cleanSelected = selectedTag.toLowerCase();
        const inline = (memo.content.match(/#[\p{L}\p{N}_-]+/gu) ?? []).map((t) =>
          t.slice(1).toLowerCase(),
        );
        const hasTag =
          inline.includes(cleanSelected) ||
          (memo.tags ?? []).some((t) => t.toLowerCase() === cleanSelected);
        if (!hasTag) return false;
      }

      return true;
    });
  }, [memos, tab, selectedTag]);

  // Counts for tabs
  const aliveMemos = memos.filter((m) => !m.deletedAt);
  const nonArchived = aliveMemos.filter((m) => !m.archived);
  const activeCount = nonArchived.filter((m) => !m.completed).length;
  const completedCount = nonArchived.filter((m) => m.completed).length;
  const archivedCount = aliveMemos.filter((m) => m.archived).length;
  const trashCount = memos.filter((m) => Boolean(m.deletedAt)).length;

  const handleTabChange = (newTab: StreamTab) => {
    haptic(8);
    setTab(newTab);
  };

  const handleTagClick = (tag: string) => {
    haptic(8);
    if (selectedTag === tag) {
      onSelectTag?.(undefined);
    } else {
      onSelectTag?.(tag);
    }
  };

  return (
    <section aria-labelledby="stream-heading" className="pb-8">
      {/* Tag Tracker Bar (Hidden in Trash tab) */}
      {tab !== 'trash' && tagStats.length > 0 && (
        <div className="mb-4 rounded-2xl border border-lumos-line/60 bg-lumos-surface/50 p-3 backdrop-blur-sm">
          <div className="mb-2 flex items-center justify-between text-[11px] font-semibold text-zinc-400">
            <span className="flex items-center gap-1.5 uppercase tracking-wider">
              <Tag className="h-3 w-3 text-lumos-accent" />
              Tag Tracker
            </span>
            {selectedTag && (
              <button
                type="button"
                onClick={() => {
                  haptic(8);
                  onSelectTag?.(undefined);
                }}
                className="flex items-center gap-1 text-[10.5px] font-medium text-lumos-accent hover:underline"
              >
                Reset filter
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-1.5">
            {tagStats.map((stat) => {
              const isSelected = selectedTag === stat.tag;
              const allDone = stat.total > 0 && stat.completed === stat.total;
              return (
                <button
                  type="button"
                  key={stat.tag}
                  onClick={() => handleTagClick(stat.tag)}
                  className={cn(
                    'group flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-all duration-150',
                    isSelected
                      ? 'border-lumos-accent bg-lumos-accent/20 text-lumos-accent shadow-sm shadow-lumos-accent/20 ring-1 ring-lumos-accent/30'
                      : 'border-lumos-line/70 bg-lumos-surface/80 text-zinc-300 hover:border-lumos-line-strong hover:bg-lumos-elevated hover:text-zinc-100',
                  )}
                >
                  <span>#{stat.tag}</span>
                  <span
                    className={cn(
                      'rounded-md px-1 py-0.2 text-[10px] tabular-nums font-semibold',
                      isSelected
                        ? 'bg-lumos-accent/30 text-lumos-accent'
                        : allDone
                          ? 'bg-emerald-500/15 text-emerald-400'
                          : 'bg-zinc-800 text-zinc-400',
                    )}
                  >
                    {stat.completed}/{stat.total}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Filter Header and View Tabs */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2
            id="stream-heading"
            className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500"
          >
            {tab === 'trash' ? 'Kotak Sampah (30 Hari)' : 'Memos'}
          </h2>
          {selectedTag && tab !== 'trash' && (
            <span className="flex items-center gap-1 rounded-full border border-lumos-accent/30 bg-lumos-accent/10 px-2 py-0.5 text-[10px] font-semibold text-lumos-accent">
              <Filter className="h-2.5 w-2.5" />#{selectedTag}
            </span>
          )}
        </div>

        {!isLoading && (
          <div className="flex flex-wrap items-center gap-1 rounded-full border border-lumos-line bg-lumos-surface p-0.5 text-[10px] font-medium">
            <button
              type="button"
              onClick={() => handleTabChange('active')}
              className={cn(
                'rounded-full px-2.5 py-0.5 transition-colors',
                tab === 'active'
                  ? 'bg-lumos-accent/20 text-lumos-accent'
                  : 'text-zinc-400 hover:text-zinc-200',
              )}
            >
              Aktif ({activeCount})
            </button>
            <button
              type="button"
              onClick={() => handleTabChange('completed')}
              className={cn(
                'rounded-full px-2.5 py-0.5 transition-colors',
                tab === 'completed'
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'text-zinc-400 hover:text-zinc-200',
              )}
            >
              Selesai ({completedCount})
            </button>
            <button
              type="button"
              onClick={() => handleTabChange('all')}
              className={cn(
                'rounded-full px-2.5 py-0.5 transition-colors',
                tab === 'all'
                  ? 'bg-lumos-accent/20 text-lumos-accent'
                  : 'text-zinc-400 hover:text-zinc-200',
              )}
            >
              Semua ({nonArchived.length})
            </button>
            <button
              type="button"
              onClick={() => handleTabChange('archived')}
              className={cn(
                'flex items-center gap-1 rounded-full px-2.5 py-0.5 transition-colors',
                tab === 'archived'
                  ? 'bg-lumos-accent/20 text-lumos-accent'
                  : 'text-zinc-400 hover:text-zinc-200',
              )}
            >
              <Archive className="h-2.5 w-2.5" aria-hidden="true" />
              <span>Arsip ({archivedCount})</span>
            </button>
            <button
              type="button"
              onClick={() => handleTabChange('trash')}
              className={cn(
                'flex items-center gap-1 rounded-full px-2.5 py-0.5 transition-colors',
                tab === 'trash'
                  ? 'bg-rose-500/20 text-rose-300'
                  : 'text-zinc-400 hover:text-zinc-200',
              )}
            >
              <Trash2 className="h-2.5 w-2.5" aria-hidden="true" />
              <span>Sampah ({trashCount})</span>
            </button>
          </div>
        )}
      </div>

      {isLoading ? (
        <StreamSkeleton />
      ) : filteredMemos.length === 0 ? (
        <EmptyStream tab={tab} hasTagFilter={Boolean(selectedTag)} />
      ) : (
        <div className="space-y-2.5">
          {filteredMemos.map((memo, index) => (
            <MemoCard
              key={memo.id}
              memo={memo}
              index={index}
              onToggleComplete={onToggleComplete}
              onArchive={onArchive}
              onDelete={onDelete}
              onRestore={onRestore}
              onPermanentDelete={onPermanentDelete}
              onSelectTag={(tag) => onSelectTag?.(tag)}
              activeTag={selectedTag}
            />
          ))}
        </div>
      )}
    </section>
  );
}
