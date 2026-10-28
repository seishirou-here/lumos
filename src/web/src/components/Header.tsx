import { cn } from '../lib/utils';

export type ConnectionStatus = 'checking' | 'online' | 'offline';

interface HeaderProps {
  status: ConnectionStatus;
  pendingCount?: number;
}

const STATUS_META: Record<
  ConnectionStatus,
  { label: string; title: string; pill: string; dot: string }
> = {
  checking: {
    label: 'Checking',
    title: 'Mencari host Lumos di laptop...',
    pill: 'border-zinc-700/70 bg-zinc-900/80 text-zinc-400',
    dot: 'bg-zinc-500',
  },
  online: {
    label: 'Connected',
    title: 'Terhubung ke bridge Lumos di laptop.',
    pill: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300',
    dot: 'bg-emerald-400',
  },
  offline: {
    label: 'Offline',
    title: 'Host belum terjangkau. Memo tersimpan aman di perangkat ini.',
    pill: 'border-amber-500/20 bg-amber-500/10 text-amber-300',
    dot: 'bg-amber-400',
  },
};

export function Header({ status, pendingCount = 0 }: HeaderProps) {
  const meta = STATUS_META[status];
  const waiting = status === 'offline' && pendingCount > 0;
  const label = waiting ? `Offline · ${pendingCount}` : meta.label;
  const title = waiting
    ? `${pendingCount} memo menunggu sinkronisasi ke laptop.`
    : meta.title;

  return (
    <header className="sticky top-0 z-20 -mx-4 mb-6 flex items-center justify-between gap-4 border-b border-zinc-800/60 bg-zinc-950/80 px-4 py-3.5 backdrop-blur-xl sm:-mx-6 sm:px-6">
      <div className="min-w-0">
        <h1 className="text-[17px] font-semibold leading-none tracking-[0.16em] text-zinc-50">
          <span className="mr-1.5 text-amber-300 drop-shadow-[0_0_14px_rgba(251,191,36,0.5)]">
            ⚡
          </span>
          {' '}LUMOS
        </h1>
        <p className="mt-1.5 text-[10px] font-medium uppercase tracking-[0.2em] text-zinc-500">
          Quick dump · Lumi
        </p>
      </div>

      <div
        role="status"
        aria-live="polite"
        aria-label={`${label} — ${title}`}
        title={title}
        className={cn(
          'flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10.5px] font-medium transition-colors duration-300',
          meta.pill,
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            'h-1.5 w-1.5 rounded-full',
            meta.dot,
            status === 'checking' && 'animate-soft-pulse',
          )}
        />
        <span>{label}</span>
      </div>
    </header>
  );
}
