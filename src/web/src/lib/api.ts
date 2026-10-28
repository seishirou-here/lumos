import type { DumpPayload, DumpResult, HealthStatus, MemoItem } from '@shared/types';

/**
 * Empty by default: Vite proxies `/api` to the host bridge in development and
 * the PWA is served from the same origin in production. Set
 * `VITE_LUMOS_API_URL` when the host lives on a different Tailscale address.
 */
const API_BASE_URL = (import.meta.env.VITE_LUMOS_API_URL ?? '').replace(/\/+$/, '');

function apiUrl(path: string): string {
  return `${API_BASE_URL}${path}`;
}

/** Heartbeat probe. Returns null when the host is unreachable or unhealthy. */
export async function checkHealth(signal?: AbortSignal): Promise<HealthStatus | null> {
  try {
    const response = await fetch(apiUrl('/api/health'), {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
      signal,
    });

    if (!response.ok) return null;

    const payload = (await response.json()) as Partial<HealthStatus>;
    if (
      payload.status !== 'ok' ||
      typeof payload.timestamp !== 'number' ||
      typeof payload.version !== 'string'
    ) {
      return null;
    }

    return payload as HealthStatus;
  } catch {
    return null;
  }
}

/**
 * Send a batch of memos to the host and return the ids it acknowledged.
 * Throws on network or protocol failures so the caller can keep them queued.
 */
export async function dumpMemos(memos: MemoItem[]): Promise<string[]> {
  const payload: DumpPayload = { memos };
  const response = await fetch(apiUrl('/api/memos/dump'), {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(
      `Host rejected memo dump (${response.status})${detail ? `: ${detail}` : '.'}`,
    );
  }

  const result = (await response.json()) as Partial<DumpResult>;
  if (!Array.isArray(result.accepted)) {
    throw new Error('Host returned an invalid dump acknowledgement.');
  }

  return result.accepted.filter((id): id is string => typeof id === 'string');
}
