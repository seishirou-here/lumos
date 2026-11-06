import { AlertTriangle, Check, CloudOff, Copy, Loader2 } from 'lucide-react';
import { Fragment, useEffect, useRef, useState } from 'react';

import type { MemoItem, MemoSyncStatus } from '@shared/types';

import { cn, copyText, formatMemoTime, haptic } from '../lib/utils';

interface MemoCardProps {
  memo: MemoItem;
  index?: number;
}

const COPY_FEEDBACK_MS = 1600;

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
    hint: 'Sudah masuk antrean triage di laptop.',
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

function MemoContent({ content }: { content: string }) {
  const parts = content.split(/(#[\p{L}\p{N}_-]+)/gu);

  return (
    <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed text-zinc-100 [text-wrap:pretty] sm:text-[14.5px]">
      {parts.map((part, index) =>
        part.startsWith('#') ? (
          <span key={index} className="memo-hashtag">
            {part}
          </span>
        ) : (
          <Fragment key={index}>{part}</Fragment>
        ),
      )}
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
        // 36px visual target inside a 44px hit area (negative margin keeps layout tight).
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

export function MemoCard({ memo, index = 0 }: MemoCardProps) {
  const meta = STATUS_META[memo.status];
  const inlineTags = new Set(
    (memo.content.match(/#[\p{L}\p{N}_-]+/gu) ?? []).map((tag) => tag.slice(1).toLowerCase()),
  );
  const extraTags = (memo.tags ?? []).filter((tag) => !inlineTags.has(tag.toLowerCase()));

  return (
    <article
      className="group animate-rise-in overflow-hidden rounded-2xl border border-lumos-line/80 bg-lumos-surface/70 p-4 shadow-panel transition-all duration-150 ease-glide hover:border-lumos-line-strong hover:bg-lumos-surface/90 active:scale-[0.99] active:border-lumos-line-strong"
      style={{ animationDelay: `${Math.min(index, 6) * 40}ms` }}
    >
      <div className="mb-2.5 flex items-center justify-between gap-3">
        <time
          dateTime={new Date(memo.createdAt).toISOString()}
          className="text-[11px] font-medium tracking-wide text-zinc-400"
        >
          {formatMemoTime(memo.createdAt)}
        </time>

        <div className="flex shrink-0 items-center gap-2.5">
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
        </div>
      </div>

      <MemoContent content={memo.content} />

      {extraTags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {extraTags.map((tag) => (
            <span
              key={tag}
              className="rounded-md border border-lumos-line/80 bg-lumos-elevated/80 px-1.5 py-0.5 text-[10px] font-medium text-zinc-300 transition-colors duration-200 hover:border-lumos-accent/30 hover:text-zinc-100"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}
    </article>
  );
}
