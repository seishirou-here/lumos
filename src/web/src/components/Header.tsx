import { cn, haptic } from '../lib/utils';
import { THEME_META, useTheme } from '../lib/theme';

export type ConnectionStatus = 'checking' | 'online' | 'offline';

interface HeaderProps {
  status: ConnectionStatus;
  pendingCount?: number;
  /** True while a push/pull cycle with the host is in flight. */
  isSyncing?: boolean;
}

const STATUS_META: Record<
  ConnectionStatus,
  { label: string; title: string; pill: string; dot: string }
> = {
  checking: {
    label: 'Checking',
    title: 'Mencari host Lumos di laptop...',
    pill: 'border-lumos-line bg-lumos-surface/80 text-zinc-400',
    dot: 'bg-zinc-500 text-zinc-500',
  },
  online: {
    label: 'Connected',
    title: 'Terhubung ke bridge Lumos di laptop.',
    pill: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300 shadow-[0_0_14px_-6px_rgb(52_211_153/0.55)]',
    dot: 'bg-emerald-400 text-emerald-400',
  },
  offline: {
    label: 'Offline',
    title: 'Host belum terjangkau. Memo tersimpan aman di perangkat ini.',
    pill: 'border-amber-500/25 bg-amber-500/10 text-amber-300',
    dot: 'bg-amber-400 text-amber-400',
  },
};

const SYNCING_META = {
  label: 'Syncing',
  title: 'Sedang menyinkronkan memo dengan laptop...',
  pill: 'border-sky-500/25 bg-sky-500/10 text-sky-300 shadow-[0_0_14px_-6px_rgb(56_189_248/0.55)]',
  dot: 'bg-sky-400 text-sky-400',
};

export function Header({ status, pendingCount = 0, isSyncing = false }: HeaderProps) {
  const { theme, toggleTheme } = useTheme();
  const themeMeta = THEME_META[theme];
  const nextTheme = theme === 'sakura' ? 'forest' : 'sakura';
  const nextMeta = THEME_META[nextTheme];

  const syncing = isSyncing && status !== 'offline';
  const meta = syncing ? SYNCING_META : STATUS_META[status];
  const waiting = status === 'offline' && pendingCount > 0;
  const label = waiting ? `Offline · ${pendingCount}` : meta.label;
  const title = waiting ? `${pendingCount} memo menunggu sinkronisasi ke laptop.` : meta.title;
  const breathing = syncing || status === 'online';

  const handleThemeToggle = () => {
    haptic();
    toggleTheme();
  };

  return (
    <header className="sticky top-0 z-20 -mx-4 mb-6 flex items-center justify-between gap-3 border-b border-lumos-line/60 bg-lumos-bg/80 px-4 pb-3.5 pt-[calc(var(--safe-top)+0.875rem)] backdrop-blur-xl transition-colors duration-300 sm:-mx-6 sm:px-6">
      <div className="min-w-0">
        <h1 className="flex items-center text-[17px] font-semibold leading-none tracking-[0.16em] text-zinc-50">
          <span className="brand-mark mr-2 inline-flex" aria-hidden="true">
            <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none">
              <path
                d="M12 3.5c.5 4.1 1.5 5.6 5 6.5-3.5.9-4.5 2.4-5 6.5-.5-4.1-1.5-5.6-5-6.5 3.5-.9 4.5-2.4 5-6.5Z"
                fill="currentColor"
              />
              <path
                d="M18.5 15.5c.2 1.6.6 2.2 2 2.5-1.4.3-1.8.9-2 2.5-.2-1.6-.6-2.2-2-2.5 1.4-.3 1.8-.9 2-2.5Z"
                fill="currentColor"
                opacity="0.6"
              />
            </svg>
          </span>
          LUMOS
        </h1>
        <p className="mt-1.5 text-[10px] font-medium uppercase tracking-[0.2em] text-zinc-500">
          Quick dump · Lumi
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        <div className="group relative">
          <button
            type="button"
            onClick={handleThemeToggle}
            aria-label={`Tema ${themeMeta.label}. Ganti ke ${nextMeta.label}.`}
            className="flex min-h-9 items-center gap-1.5 rounded-full border border-lumos-line bg-lumos-surface/70 px-3 text-[11px] font-medium text-zinc-300 shadow-sm shadow-black/40 transition-[border-color,background-color,color,transform,box-shadow] duration-150 ease-glide hover:border-lumos-accent/45 hover:bg-lumos-elevated hover:text-zinc-100 hover:shadow-glow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lumos-accent/45 focus-visible:ring-offset-2 focus-visible:ring-offset-lumos-bg active:scale-95 active:border-lumos-accent/60 active:bg-lumos-elevated"
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
          <span role="tooltip" className="lumos-tooltip">
            {themeMeta.hint}
            <span className="mt-0.5 block text-[10px] font-normal text-zinc-500">
              Klik untuk {nextMeta.emoji} {nextMeta.label}
            </span>
          </span>
        </div>

        <div
          role="status"
          aria-live="polite"
          aria-label={`${label} — ${title}`}
          title={title}
          className={cn(
            'flex min-h-9 items-center gap-2 rounded-full border px-3 text-[11px] font-medium transition-[color,background-color,border-color,box-shadow] duration-300',
            meta.pill,
          )}
        >
          <span
            aria-hidden="true"
            data-tempo={syncing ? 'fast' : undefined}
            className={cn(
              'h-1.5 w-1.5 shrink-0 rounded-full',
              meta.dot,
              breathing && 'status-breathe',
              status === 'checking' && !syncing && 'animate-soft-pulse',
            )}
          />
          <span>{label}</span>
        </div>
      </div>
    </header>
  );
}
