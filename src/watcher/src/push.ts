import { getMessaging } from 'firebase-admin/messaging';

import { getFirestoreDb } from './firebase.js';

/**
 * Send phone notifications through Firebase Cloud Messaging (free on Spark).
 * Device tokens are written by the PWA into `pushTokens/{sha256(token)}`.
 * Messages are data-only; `src/web/public/push-sw.js` renders them.
 */

const PUSH_TOKENS_COLLECTION = 'pushTokens';
const ONE_DAY_SECONDS = 24 * 60 * 60;

const STALE_TOKEN_CODES = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
  'messaging/invalid-argument',
]);

export interface PushPayload {
  title: string;
  body: string;
  /** Path opened when the notification is tapped (default `/`). */
  url?: string;
  /** Same tag replaces the previous notification instead of stacking. */
  tag?: string;
}

export interface PushResult {
  total: number;
  sent: number;
  failed: number;
  pruned: number;
  errors: string[];
}

export async function sendPushToAllDevices(payload: PushPayload): Promise<PushResult> {
  const db = getFirestoreDb(); // also initializes the Admin app
  const snapshot = await db.collection(PUSH_TOKENS_COLLECTION).get();

  const devices = snapshot.docs
    .map((docSnap) => ({ id: docSnap.id, token: docSnap.get('token') as unknown }))
    .filter((d): d is { id: string; token: string } => typeof d.token === 'string' && d.token.length > 0);

  const result: PushResult = { total: devices.length, sent: 0, failed: 0, pruned: 0, errors: [] };
  if (devices.length === 0) return result;

  const data: Record<string, string> = {
    title: payload.title,
    body: payload.body,
    url: payload.url ?? '/',
  };
  if (payload.tag) data.tag = payload.tag;

  const response = await getMessaging().sendEachForMulticast({
    tokens: devices.map((d) => d.token),
    data,
    webpush: {
      headers: { Urgency: 'high', TTL: String(ONE_DAY_SECONDS) },
    },
  });

  result.sent = response.successCount;
  result.failed = response.failureCount;

  await Promise.all(
    response.responses.map(async (res, index) => {
      if (res.success) return;
      const code = res.error?.code ?? 'unknown';
      result.errors.push(`${code}: ${res.error?.message ?? ''}`.trim());
      if (STALE_TOKEN_CODES.has(code)) {
        await db.collection(PUSH_TOKENS_COLLECTION).doc(devices[index].id).delete();
        result.pruned += 1;
      }
    }),
  );

  return result;
}
