import { deleteDoc, doc, setDoc } from 'firebase/firestore';
import { deleteToken, getMessaging, getToken, isSupported } from 'firebase/messaging';

import { db, firebaseApp } from './firebase';

/**
 * Phone notifications via Firebase Cloud Messaging (Web Push, free on Spark).
 *
 * Each device that opts in stores its FCM token in `pushTokens/{sha256(token)}`
 * (owner-locked in firestore.rules). Anything holding the Admin SDK (the laptop
 * watcher today, a reminder scheduler later) can then push to every device.
 */

const PUSH_TOKENS_COLLECTION = 'pushTokens';
const TOKEN_ID_STORAGE_KEY = 'lumos:push-token-id';
const SW_READY_TIMEOUT_MS = 10_000;

/** Optional custom VAPID key; the FCM SDK falls back to Firebase's default key. */
const vapidKey = (import.meta.env.VITE_FIREBASE_VAPID_KEY as string | undefined)?.trim() || undefined;

export type PushState =
  | 'checking'
  | 'unsupported'
  | 'needs-install'
  | 'default'
  | 'denied'
  | 'enabled';

export function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

async function pushSupported(): Promise<boolean> {
  if (!firebaseApp || typeof window === 'undefined') return false;
  if (!('Notification' in window) || !('serviceWorker' in navigator)) return false;
  try {
    return await isSupported();
  } catch {
    return false;
  }
}

export async function getPushState(): Promise<PushState> {
  // iOS only exposes Web Push to PWAs launched from the Home Screen (iOS 16.4+).
  if (isIOS() && !isStandalone()) return 'needs-install';
  if (!(await pushSupported())) return 'unsupported';
  if (Notification.permission === 'denied') return 'denied';
  if (Notification.permission === 'granted' && localStorage.getItem(TOKEN_ID_STORAGE_KEY)) {
    return 'enabled';
  }
  return 'default';
}

async function getServiceWorker(): Promise<ServiceWorkerRegistration> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () =>
        reject(
          new Error(
            'Service worker belum aktif. Buka versi deploy (HTTPS) lalu muat ulang halaman.',
          ),
        ),
      SW_READY_TIMEOUT_MS,
    );
  });

  try {
    return await Promise.race([navigator.serviceWorker.ready, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

async function sha256Hex(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

function describeDevice(): string {
  const ua = navigator.userAgent;
  if (/Android/i.test(ua)) return 'Android';
  if (isIOS()) return 'iOS';
  if (/Windows/i.test(ua)) return 'Windows';
  if (/Mac OS X/i.test(ua)) return 'macOS';
  if (/Linux/i.test(ua)) return 'Linux';
  return 'Unknown';
}

async function fetchToken(): Promise<string> {
  if (!firebaseApp) throw new Error('Firebase belum dikonfigurasi.');
  const registration = await getServiceWorker();
  const token = await getToken(getMessaging(firebaseApp), {
    serviceWorkerRegistration: registration,
    ...(vapidKey ? { vapidKey } : {}),
  });
  if (!token) throw new Error('Gagal mendapatkan token push dari Firebase Cloud Messaging.');
  return token;
}

async function saveToken(token: string): Promise<void> {
  if (!db) throw new Error('Cloud Firestore belum dikonfigurasi.');
  const id = await sha256Hex(token);
  await setDoc(
    doc(db, PUSH_TOKENS_COLLECTION, id),
    {
      token,
      device: describeDevice(),
      userAgent: navigator.userAgent.slice(0, 300),
      standalone: isStandalone(),
      updatedAt: Date.now(),
    },
    { merge: true },
  );

  const previousId = localStorage.getItem(TOKEN_ID_STORAGE_KEY);
  localStorage.setItem(TOKEN_ID_STORAGE_KEY, id);
  if (previousId && previousId !== id) {
    await deleteDoc(doc(db, PUSH_TOKENS_COLLECTION, previousId)).catch(() => undefined);
  }
}

/** Ask for permission, register this device with FCM, and store its token. */
export async function enablePush(): Promise<void> {
  if (isIOS() && !isStandalone()) {
    throw new Error('Di iPhone, tambahkan Lumos ke Home Screen dulu lalu buka dari ikonnya.');
  }
  if (!(await pushSupported())) {
    throw new Error('Browser ini belum mendukung Web Push.');
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error(
      permission === 'denied'
        ? 'Izin notifikasi ditolak. Aktifkan lagi lewat pengaturan situs di browser.'
        : 'Izin notifikasi belum diberikan.',
    );
  }

  await saveToken(await fetchToken());
}

/** Silently refresh the stored token on app open (FCM tokens rotate). */
export async function refreshPushToken(): Promise<void> {
  if ((await getPushState()) !== 'enabled') return;
  try {
    await saveToken(await fetchToken());
  } catch (error) {
    console.warn('Lumos: push token refresh failed.', error);
  }
}

/** Unregister this device from FCM and remove its stored token. */
export async function disablePush(): Promise<void> {
  const id = localStorage.getItem(TOKEN_ID_STORAGE_KEY);

  if (firebaseApp && (await pushSupported()) && Notification.permission === 'granted') {
    try {
      // getToken binds our Workbox SW to the messaging instance first, otherwise
      // deleteToken would try to register the default firebase-messaging-sw.js.
      await fetchToken();
      await deleteToken(getMessaging(firebaseApp));
    } catch (error) {
      console.warn('Lumos: FCM deleteToken failed.', error);
    }
  }

  if (id && db) {
    await deleteDoc(doc(db, PUSH_TOKENS_COLLECTION, id)).catch(() => undefined);
  }
  localStorage.removeItem(TOKEN_ID_STORAGE_KEY);
}

/** Show a notification straight from the service worker (no server round-trip). */
export async function showLocalTestNotification(): Promise<void> {
  const registration = await getServiceWorker();
  await registration.showNotification('Lumos · Tes notifikasi', {
    body: 'Notifikasi HP sudah siap dipakai buat reminder 🔔',
    icon: '/icon.svg',
    badge: '/favicon.svg',
    tag: 'lumos-test',
    data: { url: '/' },
  });
}
