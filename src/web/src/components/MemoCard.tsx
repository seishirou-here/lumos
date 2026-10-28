import { AlertTriangle, Check, CloudOff, Loader2 } from 'lucide-react';
import { Fragment } from 'react';

import type { MemoItem, MemoSyncStatus } from '@shared/types';

import { cn, formatMemoTime } from '../lib/utils';

interface MemoCardProps {
  memo: MemoItem;
  index?: number;
}

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
    <p className="whitespace-pre-wrap break-words text-[14.5px] leading-relaxed text-zinc-100">
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

export function MemoCard({ memo, index = 0 }: MemoCardProps) {
  const meta = STATUS_META[memo.status];
  const inlineTags = new Set(
    (memo.content.match(/#[\p{L}\p{N}_-]+/gu) ?? []).map((tag) => tag.slice(1).toLowerCase()),
  );
  const extraTags = (memo.tags ?? []).filter((tag) => !inlineTags.has(tag.toLowerCase()));

  return (
    <article
      className="group animate-rise-in overflow-hidden rounded-2xl border border-lumos-line/80 bg-lumos-surface/70 p-4 shadow-panel transition-colors duration-300 ease-glide hover:border-lumos-line-strong hover:bg-lumos-surface/90"
      style={{ animationDelay: `${Math.min(index, 6) * 40}ms` }}
    >
      <div className="mb-2.5 flex items-center justify-between gap-3">
        <time
          dateTime={new Date(memo.createdAt).toISOString()}
          className="text-[11px] font-medium tracking-wide text-zinc-500"
        >
          {formatMemoTime(memo.createdAt)}
        </time>

        <span
          title={meta.hint}
          className={cn(
            'flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium',
            meta.pill,
          )}
        >
          <meta.Icon
            aria-hidden="true"
            className={cn('h-3 w-3', meta.spin && 'animate-spin')}
          />
          {meta.label}
        </span>
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
