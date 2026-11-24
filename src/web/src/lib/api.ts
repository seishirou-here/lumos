import type {
  DumpPayload,
  DumpResult,
  GetMemosResponse,
  GetTagsResponse,
  HealthStatus,
  MemoItem,
} from '@shared/types';

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

/** Minimal structural guard for memos arriving from the host archive. */
function isServerMemo(value: unknown): value is MemoItem {
  if (typeof value !== 'object' || value === null) return false;

  const memo = value as Partial<MemoItem>;
  return (
    typeof memo.id === 'string' &&
    memo.id.length > 0 &&
    typeof memo.content === 'string' &&
    typeof memo.createdAt === 'number' &&
    Number.isFinite(memo.createdAt)
  );
}

export interface FetchMemosOptions {
  since?: number;
  limit?: number;
  tag?: string;
  completed?: boolean;
  archived?: boolean;
  trash?: boolean;
}

/**
 * Fetch archived memos from the host, newest first, with optional filtering.
 */
export async function fetchMemos(options: FetchMemosOptions = {}): Promise<MemoItem[]> {
  const params = new URLSearchParams();
  if (typeof options.since === 'number' && Number.isFinite(options.since)) {
    params.set('since', String(Math.max(0, Math.floor(options.since))));
  }
  if (typeof options.limit === 'number' && Number.isFinite(options.limit) && options.limit > 0) {
    params.set('limit', String(Math.floor(options.limit)));
  }
  if (options.tag) {
    params.set('tag', options.tag);
  }
  if (typeof options.completed === 'boolean') {
    params.set('completed', String(options.completed));
  }
  if (typeof options.archived === 'boolean') {
    params.set('archived', String(options.archived));
  }
  if (typeof options.trash === 'boolean') {
    params.set('trash', String(options.trash));
  }

  const query = params.toString();
  const response = await fetch(apiUrl(`/api/memos${query ? `?${query}` : ''}`), {
    method: 'GET',
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(
      `Host rejected memo history request (${response.status})${detail ? `: ${detail}` : '.'}`,
    );
  }

  const payload = (await response.json()) as Partial<GetMemosResponse>;
  if (!Array.isArray(payload.memos)) {
    throw new Error('Host returned an invalid memo history payload.');
  }

  return payload.memos
    .filter(isServerMemo)
    .map((memo) => ({ ...memo, status: 'synced' as const }));
}

/** Fetch metadata tag tracking metrics from the backend. */
export async function fetchTagStats(): Promise<GetTagsResponse> {
  const response = await fetch(apiUrl('/api/tags'), {
    method: 'GET',
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Host rejected tags request (${response.status})`);
  }

  return (await response.json()) as GetTagsResponse;
}

/**
 * Toggle completed / checklist status of a memo on the host backend.
 */
export async function completeServerMemo(id: string, completed: boolean): Promise<MemoItem | null> {
  const response = await fetch(apiUrl(`/api/memos/${encodeURIComponent(id)}/complete`), {
    method: 'PATCH',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ completed }),
  });

  if (response.status === 404) return null;

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(
      `Host rejected memo complete update (${response.status})${detail ? `: ${detail}` : '.'}`,
    );
  }

  const payload = (await response.json()) as { memo?: unknown };
  return isServerMemo(payload.memo) ? { ...payload.memo, status: 'synced' } : null;
}

/**
 * Restore a soft-deleted memo from the 30-day trash.
 */
export async function restoreServerMemo(id: string): Promise<MemoItem | null> {
  const response = await fetch(apiUrl(`/api/memos/${encodeURIComponent(id)}/restore`), {
    method: 'PATCH',
    headers: {
      Accept: 'application/json',
    },
  });

  if (response.status === 404) return null;

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(
      `Host rejected memo restore (${response.status})${detail ? `: ${detail}` : '.'}`,
    );
  }

  const payload = (await response.json()) as { memo?: unknown };
  return isServerMemo(payload.memo) ? { ...payload.memo, status: 'synced' } : null;
}

export interface DeleteMemoResult {
  deleted: boolean;
  permanent: boolean;
  memo?: MemoItem;
}

/**
 * Delete a memo on the host bridge.
 * If options.permanent === true, it permanently deletes the memo.
 * Otherwise, it soft-deletes it with a 30-day retention window.
 */
export async function deleteServerMemo(
  id: string,
  options: { permanent?: boolean } = {},
): Promise<DeleteMemoResult> {
  const query = options.permanent ? '?permanent=true' : '';
  const response = await fetch(apiUrl(`/api/memos/${encodeURIComponent(id)}${query}`), {
    method: 'DELETE',
    headers: { Accept: 'application/json' },
  });

  if (!response.ok && response.status !== 404) {
    const detail = await response.text().catch(() => '');
    throw new Error(
      `Host rejected memo delete (${response.status})${detail ? `: ${detail}` : '.'}`,
    );
  }

  const payload = (await response.json().catch(() => ({}))) as Partial<DeleteMemoResult>;
  return {
    deleted: payload.deleted ?? true,
    permanent: payload.permanent ?? Boolean(options.permanent),
    memo: isServerMemo(payload.memo) ? { ...payload.memo, status: 'synced' } : undefined,
  };
}

/**
 * Toggle the archive flag of a memo on the host bridge.
 */
export async function archiveServerMemo(id: string, archived: boolean): Promise<MemoItem | null> {
  const response = await fetch(apiUrl(`/api/memos/${encodeURIComponent(id)}/archive`), {
    method: 'PATCH',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ archived }),
  });

  if (response.status === 404) return null;

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(
      `Host rejected memo archive update (${response.status})${detail ? `: ${detail}` : '.'}`,
    );
  }

  const payload = (await response.json()) as { memo?: unknown };
  return isServerMemo(payload.memo) ? { ...payload.memo, status: 'synced' } : null;
}
