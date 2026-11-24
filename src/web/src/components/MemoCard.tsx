import {
  AlertTriangle,
  Archive,
  ArchiveRestore,
  Check,
  CheckCircle2,
  Circle,
  CloudOff,
  Copy,
  Loader2,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import { Fragment, useEffect, useRef, useState } from 'react';

import type { MemoItem, MemoSyncStatus } from '@shared/types';

import { cn, copyText, formatMemoTime, haptic } from '../lib/utils';

interface MemoCardProps {
  memo: MemoItem;
  index?: number;
  onToggleComplete?: (id: string, completed: boolean) => void;
  onArchive?: (id: string, archived: boolean) => void;
  onDelete?: (id: string) => void;
  onRestore?: (id: string) => void;
  onPermanentDelete?: (id: string) => void;
  onSelectTag?: (tag: string) => void;
  activeTag?: string;
}

const COPY_FEEDBACK_MS = 1600;
const DELETE_CONFIRM_MS = 2600;
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

const STATUS_META: Record<
  MemoSyncStatus,
  {
    label: string;
    hint: string;
    pill: string;
    Icon: typeof Check;
    spin?: boolean;
  }
> = {
  pending: {
    label: 'Offline',
    hint: 'Tersimpan di perangkat, menunggu koneksi host.',
    pill: 'border-amber-500/20 bg-amber-500/10 text-amber-300',
    Icon: CloudOff,
  },
  syncing: {
    label: 'Syncing',
    hint: 'Sedang dikirim ke laptop.',
    pill: 'border-sky-500/20 bg-sky-500/10 text-sky-300',
    Icon: Loader2,
    spin: true,
  },
  synced: {
    label: 'Synced',
    hint: 'Sudah tersinkronisasi di database host.',
    pill: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300',
    Icon: Check,
  },
  failed: {
    label: 'Failed',
    hint: 'Sinkronisasi terakhir gagal. Akan dicoba lagi.',
    pill: 'border-rose-500/20 bg-rose-500/10 text-rose-300',
    Icon: AlertTriangle,
  },
};

function MemoContent({
  content,
  isCompleted,
  isTrash,
  onSelectTag,
}: {
  content: string;
  isCompleted?: boolean;
  isTrash?: boolean;
  onSelectTag?: (tag: string) => void;
}) {
  const parts = content.split(/(#[\p{L}\p{N}_-]+)/gu);

  return (
    <p
      className={cn(
        'whitespace-pre-wrap break-words text-[15px] leading-relaxed transition-all duration-200 [text-wrap:pretty] sm:text-[14.5px]',
        isTrash
          ? 'text-zinc-400 opacity-75'
          : isCompleted
            ? 'text-zinc-400 line-through decoration-zinc-500/70 opacity-80'
            : 'text-zinc-100',
      )}
    >
      {parts.map((part, index) => {
        if (part.startsWith('#')) {
          const tag = part.slice(1).toLowerCase();
          return (
            <button
              type="button"
              key={index}
              onClick={(e) => {
                e.stopPropagation();
                if (!isTrash) onSelectTag?.(tag);
              }}
              className="memo-hashtag hover:underline focus:outline-none"
            >
              {part}
            </button>
          );
        }
        return <Fragment key={index}>{part}</Fragment>;
      })}
    </p>
  );
}

function CopyButton({ content }: { content: string }) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const resetTimer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(resetTimer.current), []);

  const handleCopy = async () => {
    const ok = await copyText(content);
    haptic(ok ? 10 : [12, 40, 12]);
    setState(ok ? 'copied' : 'failed');

    window.clearTimeout(resetTimer.current);
    resetTimer.current = window.setTimeout(() => setState('idle'), COPY_FEEDBACK_MS);
  };

  const copied = state === 'copied';
  const label = copied ? 'Tersalin' : state === 'failed' ? 'Gagal menyalin' : 'Salin isi memo';

  return (
    <button
      type="button"
      onClick={() => void handleCopy()}
      aria-label={label}
      title={label}
      className={cn(
        '-m-1.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-transparent transition-[color,background-color,border-color,transform] duration-150 ease-glide',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lumos-accent/45',
        'active:scale-90',
        copied
          ? 'border-lumos-accent/30 bg-lumos-accent/10 text-lumos-accent'
          : state === 'failed'
            ? 'text-rose-300'
            : 'text-zinc-500 hover:border-lumos-line hover:bg-lumos-elevated hover:text-zinc-100',
      )}
    >
      <span className="relative h-4 w-4" aria-hidden="true">
        <Copy
          className={cn(
            'absolute inset-0 h-4 w-4 transition-[opacity,transform] duration-200 ease-glide',
            copied ? 'scale-50 opacity-0' : 'scale-100 opacity-100',
          )}
        />
        <Check
          strokeWidth={2.75}
          className={cn(
            'absolute inset-0 h-4 w-4 transition-[opacity,transform] duration-200 ease-glide',
            copied ? 'scale-100 opacity-100' : 'scale-50 opacity-0',
          )}
        />
      </span>
      <span className="sr-only" aria-live="polite">
        {copied ? 'Isi memo tersalin ke clipboard' : ''}
      </span>
    </button>
  );
}

export function MemoCard({
  memo,
  index = 0,
  onToggleComplete,
  onArchive,
  onDelete,
  onRestore,
  onPermanentDelete,
  onSelectTag,
  activeTag,
}: MemoCardProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const confirmTimerRef = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(confirmTimerRef.current), []);

  const meta = STATUS_META[memo.status];
  const inlineTags = new Set(
    (memo.content.match(/#[\p{L}\p{N}_-]+/gu) ?? []).map((tag) => tag.slice(1).toLowerCase()),
  );
  const extraTags = (memo.tags ?? []).filter((tag) => !inlineTags.has(tag.toLowerCase()));
  const isArchived = Boolean(memo.archived);
  const isCompleted = Boolean(memo.completed);
  const isTrash = typeof memo.deletedAt === 'number';

  // Calculate days left in 30-day retention
  const daysLeft = isTrash
    ? Math.max(0, Math.ceil((THIRTY_DAYS_MS - (Date.now() - memo.deletedAt!)) / (24 * 60 * 60 * 1000)))
    : 30;

  const handleToggleComplete = () => {
    if (!onToggleComplete || isTrash) return;
    haptic(isCompleted ? 8 : [12, 30]);
    onToggleComplete(memo.id, !isCompleted);
  };

  const handleToggleArchive = () => {
    if (!onArchive || isTrash) return;
    haptic(10);
    onArchive(memo.id, !isArchived);
  };

  const handleRestoreClick = () => {
    if (!onRestore) return;
    haptic(12);
    onRestore(memo.id);
  };

  const handleDeleteClick = () => {
    if (isTrash) {
      if (!onPermanentDelete) return;
      if (!confirmDelete) {
        haptic(10);
        setConfirmDelete(true);
        window.clearTimeout(confirmTimerRef.current);
        confirmTimerRef.current = window.setTimeout(() => setConfirmDelete(false), DELETE_CONFIRM_MS);
        return;
      }

      window.clearTimeout(confirmTimerRef.current);
      haptic([12, 35, 12]);
      onPermanentDelete(memo.id);
      return;
    }

    if (!onDelete) return;
    if (!confirmDelete) {
      haptic(10);
      setConfirmDelete(true);
      window.clearTimeout(confirmTimerRef.current);
      confirmTimerRef.current = window.setTimeout(() => setConfirmDelete(false), DELETE_CONFIRM_MS);
      return;
    }

    window.clearTimeout(confirmTimerRef.current);
    haptic([12, 35, 12]);
    onDelete(memo.id);
  };

  return (
    <article
      className={cn(
        'group animate-rise-in overflow-hidden rounded-2xl border p-4 shadow-panel transition-all duration-150 ease-glide active:scale-[0.99]',
        isTrash
          ? 'border-rose-500/20 bg-lumos-surface/40 hover:border-rose-500/30'
          : isCompleted
            ? 'border-emerald-500/20 bg-lumos-surface/40 hover:border-emerald-500/30'
            : 'border-lumos-line/80 bg-lumos-surface/70 hover:border-lumos-line-strong hover:bg-lumos-surface/90',
      )}
      style={{ animationDelay: `${Math.min(index, 6) * 40}ms` }}
    >
      <div className="mb-2.5 flex items-center justify-between gap-3">
        {/* Left header: Checklist (if not trash), timestamp, tags/status */}
        <div className="flex items-center gap-2 min-w-0">
          {!isTrash && onToggleComplete && (
            <button
              type="button"
              onClick={handleToggleComplete}
              aria-label={isCompleted ? 'Tandai memo belum selesai' : 'Tandai memo selesai'}
              title={isCompleted ? 'Selesai (klik untuk batal)' : 'Checklist saat selesai'}
              className={cn(
                '-m-1.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-[color,background-color,border-color,transform] duration-150 ease-glide',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/45 active:scale-90',
                isCompleted
                  ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-400'
                  : 'border-transparent text-zinc-500 hover:border-zinc-700 hover:bg-lumos-elevated hover:text-zinc-300',
              )}
            >
              {isCompleted ? (
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Circle className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          )}

          <time
            dateTime={new Date(memo.createdAt).toISOString()}
            className="text-[11px] font-medium tracking-wide text-zinc-400 truncate"
          >
            {formatMemoTime(memo.createdAt)}
          </time>

          {isTrash ? (
            <span
              title="Memo akan terhapus otomatis selamanya setelah 30 hari di Sampah"
              className="rounded-full border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 text-[9.5px] font-semibold text-rose-300"
            >
              Sampah · {daysLeft} hari lagi
            </span>
          ) : isCompleted ? (
            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[9.5px] font-semibold text-emerald-400">
              Selesai
            </span>
          ) : null}
        </div>

        {/* Right header: Action buttons */}
        <div className="flex shrink-0 items-center gap-2">
          <span
            title={meta.hint}
            className={cn(
              'flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium',
              meta.pill,
            )}
          >
            <meta.Icon
              aria-hidden="true"
              className={cn('h-3 w-3', meta.spin && 'animate-spin')}
            />
            {meta.label}
          </span>

          <CopyButton content={memo.content} />

          {/* If in trash, show Restore and Permanent Delete */}
          {isTrash ? (
            <>
              {onRestore && (
                <button
                  type="button"
                  onClick={handleRestoreClick}
                  aria-label="Pulihkan memo dari sampah"
                  title="Pulihkan memo kembali ke daftar aktif"
                  className={cn(
                    '-m-1.5 flex h-9 shrink-0 items-center justify-center gap-1 rounded-lg border border-transparent px-2 text-[10.5px] font-medium text-emerald-400 transition-[color,background-color,border-color,transform] duration-150 ease-glide',
                    'hover:border-emerald-500/30 hover:bg-emerald-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/45 active:scale-90',
                  )}
                >
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Pulihkan</span>
                </button>
              )}
              {onPermanentDelete && (
                <button
                  type="button"
                  onClick={handleDeleteClick}
                  aria-label={confirmDelete ? 'Konfirmasi hapus permanen' : 'Hapus permanen sekarang'}
                  title={confirmDelete ? 'Ketuk lagi untuk menghapus selamanya' : 'Hapus permanen sekarang'}
                  className={cn(
                    '-m-1.5 flex h-9 shrink-0 items-center justify-center gap-1 rounded-lg border transition-[color,background-color,border-color,transform,padding] duration-150 ease-glide',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/45 active:scale-90',
                    confirmDelete
                      ? 'border-rose-500/50 bg-rose-500/20 px-2 text-[10px] font-semibold text-rose-200'
                      : 'w-9 border-transparent text-zinc-500 hover:border-rose-500/30 hover:bg-rose-500/10 hover:text-rose-300',
                  )}
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  {confirmDelete && <span>Hapus Permanen?</span>}
                </button>
              )}
            </>
          ) : (
            <>
              {onArchive && (
                <button
                  type="button"
                  onClick={handleToggleArchive}
                  aria-label={isArchived ? 'Kembalikan memo dari arsip' : 'Arsipkan memo'}
                  title={isArchived ? 'Kembalikan dari arsip' : 'Arsipkan memo'}
                  className={cn(
                    '-m-1.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-transparent transition-[color,background-color,border-color,transform] duration-150 ease-glide',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lumos-accent/45 active:scale-90',
                    isArchived
                      ? 'border-lumos-accent/30 bg-lumos-accent/10 text-lumos-accent'
                      : 'text-zinc-500 hover:border-lumos-line hover:bg-lumos-elevated hover:text-zinc-100',
                  )}
                >
                  {isArchived ? (
                    <ArchiveRestore className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Archive className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
              )}
              {onDelete && (
                <button
                  type="button"
                  onClick={handleDeleteClick}
                  aria-label={confirmDelete ? 'Konfirmasi pindah ke sampah' : 'Pindahkan ke sampah (30 hari)'}
                  title={confirmDelete ? 'Ketuk lagi untuk memindahkan ke sampah (tersimpan 30 hari)' : 'Pindahkan ke sampah (tersimpan 30 hari)'}
                  className={cn(
                    '-m-1.5 flex h-9 shrink-0 items-center justify-center gap-1 rounded-lg border transition-[color,background-color,border-color,transform,padding] duration-150 ease-glide',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/45 active:scale-90',
                    confirmDelete
                      ? 'border-rose-500/40 bg-rose-500/15 px-2 text-[10px] font-semibold text-rose-300'
                      : 'w-9 border-transparent text-zinc-500 hover:border-rose-500/30 hover:bg-rose-500/10 hover:text-rose-300',
                  )}
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  {confirmDelete && <span>Ke Sampah?</span>}
                </button>
              )}
            </>
          )}
        </div>
      </div>

      <MemoContent
        content={memo.content}
        isCompleted={isCompleted}
        isTrash={isTrash}
        onSelectTag={onSelectTag}
      />

      {extraTags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {extraTags.map((tag) => {
            const isTagActive = activeTag === tag.toLowerCase();
            return (
              <button
                type="button"
                key={tag}
                onClick={() => !isTrash && onSelectTag?.(tag.toLowerCase())}
                disabled={isTrash}
                className={cn(
                  'rounded-md border px-1.5 py-0.5 text-[10px] font-medium transition-colors duration-200 focus:outline-none',
                  isTrash
                    ? 'border-lumos-line/50 bg-lumos-surface/40 text-zinc-500 cursor-default'
                    : isTagActive
                      ? 'border-lumos-accent bg-lumos-accent/20 text-lumos-accent'
                      : 'border-lumos-line/80 bg-lumos-elevated/80 text-zinc-300 hover:border-lumos-accent/30 hover:text-zinc-100',
                )}
              >
                #{tag}
              </button>
            );
          })}
        </div>
      )}
    </article>
  );
}
