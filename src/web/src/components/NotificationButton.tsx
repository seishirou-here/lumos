import { Bell, BellOff, BellRing, Loader2, Send, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  disablePush,
  enablePush,
  getPushState,
  refreshPushToken,
  showLocalTestNotification,
  type PushState,
} from '../lib/push';
import { cn, haptic } from '../lib/utils';

const STATE_COPY: Record<PushState, { label: string; desc: string }> = {
  checking: { label: 'Mengecek…', desc: 'Memeriksa dukungan notifikasi di perangkat ini.' },
  unsupported: {
    label: 'Tidak didukung',
    desc: 'Browser ini belum mendukung Web Push. Coba buka Lumos di Chrome (Android) atau dari Home Screen.',
  },
  'needs-install': {
    label: 'Perlu Home Screen',
    desc: 'Di iPhone: Safari → Share → Add to Home Screen, lalu buka Lumos dari ikon Home Screen.',
  },
  default: {
    label: 'Belum aktif',
    desc: 'Aktifkan supaya HP ini bisa menerima reminder & kabar dari laptop.',
  },
  denied: {
    label: 'Diblokir',
    desc: 'Izin notifikasi ditolak. Buka pengaturan situs di browser → Notifikasi → Izinkan.',
  },
  enabled: {
    label: 'Aktif di HP ini',
    desc: 'Perangkat ini terdaftar untuk menerima reminder dari Lumos.',
  },
};

export function NotificationButton() {
  const [state, setState] = useState<PushState>('checking');
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const refreshState = useCallback(async () => {
    setState(await getPushState());
  }, []);

  useEffect(() => {
    void refreshState();
    void refreshPushToken();
  }, [refreshState]);

  // Close the panel on outside tap / Escape.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const run = async (action: () => Promise<void>, success: string) => {
    haptic(8);
    setBusy(true);
    setMessage(null);
    try {
      await action();
      setMessage({ tone: 'ok', text: success });
    } catch (error) {
      setMessage({
        tone: 'error',
        text: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setBusy(false);
      await refreshState();
    }
  };

  const Icon = state === 'enabled' ? BellRing : state === 'denied' ? BellOff : Bell;
  const copy = STATE_COPY[state];

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => {
          haptic(8);
          setOpen((prev) => !prev);
          setMessage(null);
        }}
        aria-label={`Notifikasi HP: ${copy.label}`}
        aria-expanded={open}
        title={`Notifikasi HP: ${copy.label}`}
        className={cn(
          'relative grid h-9 w-9 place-items-center rounded-full border transition-colors active:scale-95',
          state === 'enabled'
            ? 'border-lumos-accent/35 bg-lumos-accent/10 text-lumos-accent'
            : 'border-lumos-line bg-lumos-surface/70 text-zinc-400 hover:border-lumos-accent/40 hover:text-zinc-200',
        )}
      >
        <Icon className="h-4 w-4" aria-hidden="true" />
        {state === 'default' && (
          <span
            aria-hidden="true"
            className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-lumos-accent"
          />
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Pengaturan notifikasi HP"
          className="absolute right-0 top-full z-40 mt-2 w-[min(18rem,calc(100vw-2rem))] rounded-2xl border border-lumos-line bg-lumos-elevated p-3.5 text-left shadow-panel-raised"
        >
          <div className="mb-2 flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-zinc-100">Notifikasi HP</p>
              <p
                className={cn(
                  'mt-0.5 text-[11px] font-medium',
                  state === 'enabled'
                    ? 'text-emerald-400'
                    : state === 'denied' || state === 'unsupported'
                      ? 'text-rose-300'
                      : 'text-zinc-400',
                )}
              >
                {copy.label}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Tutup"
              className="-m-1.5 grid h-9 w-9 place-items-center rounded-full text-zinc-500 hover:text-zinc-200"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <p className="text-xs leading-relaxed text-zinc-400">{copy.desc}</p>

          <div className="mt-3 flex flex-col gap-2">
            {(state === 'default' || state === 'denied') && (
              <button
                type="button"
                disabled={busy}
                onClick={() => void run(enablePush, 'Notifikasi aktif! Coba kirim tes ya.')}
                className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-lumos-accent px-3 text-sm font-semibold text-lumos-accent-ink transition-colors hover:bg-lumos-accent-soft active:bg-lumos-accent-strong disabled:opacity-60"
              >
                {busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <BellRing className="h-4 w-4" aria-hidden="true" />
                )}
                Aktifkan notifikasi
              </button>
            )}

            {state === 'enabled' && (
              <>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    void run(showLocalTestNotification, 'Tes terkirim. Cek bar notifikasi HP.')
                  }
                  className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-lumos-accent px-3 text-sm font-semibold text-lumos-accent-ink transition-colors hover:bg-lumos-accent-soft active:bg-lumos-accent-strong disabled:opacity-60"
                >
                  <Send className="h-4 w-4" aria-hidden="true" />
                  Kirim tes notifikasi
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void run(disablePush, 'Notifikasi dimatikan untuk HP ini.')}
                  className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-lumos-line px-3 text-sm font-medium text-zinc-300 transition-colors hover:border-rose-500/40 hover:text-rose-300 disabled:opacity-60"
                >
                  <BellOff className="h-4 w-4" aria-hidden="true" />
                  Matikan di HP ini
                </button>
              </>
            )}
          </div>

          {message && (
            <p
              role="status"
              className={cn(
                'mt-2.5 text-[11px] leading-relaxed',
                message.tone === 'ok' ? 'text-emerald-400' : 'text-rose-300',
              )}
            >
              {message.text}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
