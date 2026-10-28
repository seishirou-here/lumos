import { Sparkles } from 'lucide-react';

import type { MemoItem } from '@shared/types';

import { MemoCard } from './MemoCard';

interface MemoStreamProps {
  memos: MemoItem[];
  isLoading?: boolean;
}

function StreamSkeleton() {
  return (
    <div className="space-y-2.5" aria-hidden="true">
      {[0, 1].map((item) => (
        <div
          key={item}
          className="animate-soft-pulse rounded-2xl border border-zinc-800/70 bg-zinc-900/50 p-4"
        >
          <div className="mb-3 flex items-center justify-between">
            <div className="h-2.5 w-16 rounded-full bg-zinc-800" />
            <div className="h-4 w-16 rounded-full bg-zinc-800/80" />
          </div>
          <div className="h-3 w-11/12 rounded-full bg-zinc-800/80" />
          <div className="mt-2 h-3 w-2/3 rounded-full bg-zinc-800/60" />
        </div>
      ))}
    </div>
  );
}

function EmptyStream() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-800/80 px-6 py-12 text-center">
      <div className="mb-3 grid h-11 w-11 place-items-center rounded-full bg-amber-400/5 text-amber-300/70 ring-1 ring-inset ring-amber-400/10">
        <Sparkles className="h-5 w-5" aria-hidden="true" />
      </div>
      <p className="text-sm font-medium text-zinc-400">Belum ada memo</p>
      <p className="mt-1 max-w-[28ch] text-xs leading-relaxed text-zinc-600">
        Tulis ide pertama di atas. Semua dump tersimpan aman di perangkat ini.
      </p>
    </div>
  );
}

export function MemoStream({ memos, isLoading = false }: MemoStreamProps) {
  return (
    <section aria-labelledby="stream-heading" className="pb-6">
      <div className="mb-3 flex items-center gap-3">
        <h2
          id="stream-heading"
          className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500"
        >
          Linimasa Ide
        </h2>
        <span
          aria-hidden="true"
          className="h-px flex-1 bg-gradient-to-r from-zinc-800 to-transparent"
        />
        {!isLoading && memos.length > 0 && (
          <span className="shrink-0 rounded-full border border-zinc-800 bg-zinc-900 px-2 py-0.5 text-[10px] font-medium text-zinc-500">
            {memos.length}
          </span>
        )}
      </div>

      {isLoading ? (
        <StreamSkeleton />
      ) : memos.length === 0 ? (
        <EmptyStream />
      ) : (
        <div className="space-y-2.5">
          {memos.map((memo, index) => (
            <MemoCard key={memo.id} memo={memo} index={index} />
          ))}
        </div>
      )}
    </section>
  );
}
