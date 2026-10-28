import { cn } from '../lib/utils';
import { THEME_META, useTheme } from '../lib/theme';

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
    pill: 'border-lumos-line bg-lumos-surface/80 text-zinc-400',
    dot: 'bg-zinc-500',
  },
  online: {
    label: 'Connected',
    title: 'Terhubung ke bridge Lumos di laptop.',
    pill: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300',
    dot: 'bg-emerald-400',
  },
  offline: {
    label: 'Offline',
    title: 'Host belum terjangkau. Memo tersimpan aman di perangkat ini.',
    pill: 'border-amber-500/25 bg-amber-500/10 text-amber-300',
    dot: 'bg-amber-400',
  },
};

export function Header({ status, pendingCount = 0 }: HeaderProps) {
  const { theme, toggleTheme } = useTheme();
  const meta = STATUS_META[status];
  const themeMeta = THEME_META[theme];
  const nextTheme = theme === 'sakura' ? 'forest' : 'sakura';

  const waiting = status === 'offline' && pendingCount > 0;
  const label = waiting ? `Offline · ${pendingCount}` : meta.label;
  const title = waiting
    ? `${pendingCount} memo menunggu sinkronisasi ke laptop.`
    : meta.title;

  return (
    <header className="sticky top-0 z-20 -mx-4 mb-6 flex items-center justify-between gap-3 border-b border-lumos-line/60 bg-lumos-bg/80 px-4 py-3.5 backdrop-blur-xl transition-colors duration-300 sm:-mx-6 sm:px-6">
      <div className="min-w-0">
        <h1 className="text-[17px] font-semibold leading-none tracking-[0.16em] text-zinc-50">
          <span className="brand-mark mr-1.5" aria-hidden="true">
            ⚡
          </span>{' '}
          LUMOS
        </h1>
        <p className="mt-1.5 text-[10px] font-medium uppercase tracking-[0.2em] text-zinc-500">
          Quick dump · Lumi
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={`Tema ${themeMeta.label}. Ganti ke ${THEME_META[nextTheme].label}.`}
          title={`${themeMeta.hint} · tap untuk ${THEME_META[nextTheme].label}`}
          className="flex items-center gap-1.5 rounded-full border border-lumos-line bg-lumos-surface/70 px-2.5 py-1 text-[10.5px] font-medium text-zinc-300 shadow-sm shadow-black/40 transition-all duration-300 ease-glide hover:border-lumos-accent/45 hover:bg-lumos-elevated hover:text-zinc-100 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lumos-accent/45 focus-visible:ring-offset-2 focus-visible:ring-offset-lumos-bg"
        >
          <span
            key={`${theme}-emoji`}
            aria-hidden="true"
            className="animate-theme-pop text-[12px] leading-none"
          >
            {themeMeta.emoji}
          </span>
          <span key={`${theme}-label`} className="animate-theme-pop capitalize">
            {themeMeta.label}
          </span>
        </button>

        <div
          role="status"
          aria-live="polite"
          aria-label={`${label} — ${title}`}
          title={title}
          className={cn(
            'flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10.5px] font-medium transition-colors duration-300',
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
      </div>
    </header>
  );
}
