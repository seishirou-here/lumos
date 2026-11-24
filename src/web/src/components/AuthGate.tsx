import { onAuthStateChanged, type User } from 'firebase/auth';
import { Cloud, Loader2, LogIn, ShieldAlert } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';

import {
  allowedEmail,
  auth,
  isFirebaseConfigured,
  signInWithGoogle,
  signOutUser,
} from '../lib/firebase';

interface AuthGateProps {
  children: (user: User, onSignOut: () => Promise<void>) => ReactNode;
}

export function AuthGate({ children }: AuthGateProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(isFirebaseConfigured);
  const [signingIn, setSigningIn] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!auth) return;

    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      if (nextUser && allowedEmail) {
        const currentEmail = (nextUser.email ?? '').toLowerCase();
        if (currentEmail !== allowedEmail) {
          setErrorMessage(
            `Akun ${nextUser.email ?? 'ini'} tidak diizinkan mengakses Lumos. Gunakan akun pemilik.`,
          );
          setUser(null);
          setLoading(false);
          void signOutUser();
          return;
        }
      }

      setUser(nextUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (!isFirebaseConfigured) {
    return (
      <div className="relative flex min-h-dvh items-center justify-center bg-lumos-bg px-4 text-zinc-100">
        <div
          aria-hidden="true"
          className="ambient-glow pointer-events-none fixed inset-x-0 top-0 h-[420px]"
        />
        <div className="relative z-10 w-full max-w-md rounded-2xl border border-lumos-line bg-lumos-surface/90 p-6 shadow-panel backdrop-blur-xl">
          <div className="mb-3 flex items-center gap-2 text-lumos-accent">
            <Cloud className="h-5 w-5" />
            <h1 className="text-sm font-semibold uppercase tracking-[0.16em]">
              Lumos Cloud Setup
            </h1>
          </div>
          <p className="text-sm leading-relaxed text-zinc-300">
            Konfigurasi Firebase belum terisi di <code className="text-lumos-accent">src/web/.env</code>.
          </p>
          <ol className="mt-4 list-decimal space-y-2 pl-5 text-xs leading-relaxed text-zinc-400">
            <li>Salin <code className="text-zinc-200">src/web/.env.example</code> menjadi <code className="text-zinc-200">src/web/.env</code>.</li>
            <li>Isi nilai <code className="text-zinc-200">VITE_FIREBASE_*</code> dan <code className="text-zinc-200">VITE_ALLOWED_EMAIL</code> dari Firebase Console.</li>
            <li>Ikuti panduan singkat di <code className="text-zinc-200">docs/SETUP_FIREBASE.md</code> lalu restart Vite.</li>
          </ol>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-lumos-bg text-zinc-400">
        <div className="flex items-center gap-2.5 text-xs tracking-wider uppercase">
          <Loader2 className="h-4 w-4 animate-spin text-lumos-accent" />
          <span>Menghubungkan Lumos Cloud...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    const handleSignIn = async () => {
      setErrorMessage(null);
      setSigningIn(true);
      try {
        await signInWithGoogle();
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : 'Gagal login dengan Google. Coba lagi.';
        setErrorMessage(message);
      } finally {
        setSigningIn(false);
      }
    };

    return (
      <div className="relative flex min-h-dvh items-center justify-center bg-lumos-bg px-4 text-zinc-100">
        <div
          aria-hidden="true"
          className="ambient-glow pointer-events-none fixed inset-x-0 top-0 h-[420px]"
        />
        <div aria-hidden="true" className="grain pointer-events-none fixed inset-0" />

        <div className="relative z-10 w-full max-w-sm rounded-2xl border border-lumos-line/80 bg-lumos-surface/85 p-6 text-center shadow-panel backdrop-blur-xl">
          <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl border border-lumos-accent/30 bg-lumos-accent/10 text-lumos-accent">
            <Cloud className="h-6 w-6" />
          </div>

          <h1 className="text-base font-semibold tracking-[0.2em] text-zinc-50">LUMOS</h1>
          <p className="mt-1.5 text-xs leading-relaxed text-zinc-400">
            Offline-first memos, kalender, &amp; antrean <span className="text-lumos-accent">#agy</span> pribadi Papa.
          </p>

          {errorMessage && (
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-left text-xs text-rose-200">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          <button
            type="button"
            disabled={signingIn}
            onClick={() => void handleSignIn()}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-lumos-accent/40 bg-lumos-accent px-4 py-2.5 text-xs font-semibold text-lumos-accent-ink shadow-glow transition-all hover:bg-lumos-accent-soft active:scale-[0.98] disabled:opacity-60"
          >
            {signingIn ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <LogIn className="h-4 w-4" />
            )}
            <span>{signingIn ? 'Membuka Google Sign-In...' : 'Masuk dengan Google'}</span>
          </button>

          <p className="mt-4 text-[10.5px] text-zinc-500">
            Dilindungi Firebase Auth &amp; Firestore Security Rules.
          </p>
        </div>
      </div>
    );
  }

  return <>{children(user, signOutUser)}</>;
}
