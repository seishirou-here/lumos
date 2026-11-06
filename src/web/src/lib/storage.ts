import { clear, createStore, del, get, keys, set } from 'idb-keyval';

import type { MemoItem, MemoSyncStatus } from '@shared/types';

/**
 * One IndexedDB record per memo, so a single status update never rewrites the
 * whole queue. `idb-keyval` creates the object store lazily on first write.
 */
const memoStore = createStore('lumos', 'memo-queue');

/** Load the queue newest-first. */
export async function listMemos(): Promise<MemoItem[]> {
  const ids = await keys(memoStore);
  const stored = await Promise.all(ids.map((id) => get<MemoItem>(id, memoStore)));

  return stored
    .filter((memo): memo is MemoItem => memo !== undefined)
    .sort((a, b) => b.createdAt - a.createdAt);
}

/** Persist a newly captured memo. */
export async function saveMemo(memo: MemoItem): Promise<void> {
  await set(memo.id, memo, memoStore);
}

/** Patch an existing memo, preserving its id. Returns undefined if missing. */
export async function updateMemo(
  id: string,
  patch: Partial<Omit<MemoItem, 'id'>>,
): Promise<MemoItem | undefined> {
  const existing = await get<MemoItem>(id, memoStore);
  if (!existing) return undefined;

  const updated: MemoItem = { ...existing, ...patch, id: existing.id };
  await set(id, updated, memoStore);
  return updated;
}

/** Update only the sync lifecycle status of a memo. */
export function setMemoStatus(id: string, status: MemoSyncStatus): Promise<MemoItem | undefined> {
  return updateMemo(id, { status });
}

/** Remove a single memo from the local queue. */
export async function removeMemo(id: string): Promise<void> {
  await del(id, memoStore);
}

/** Everything that still needs to reach the host, including retries. */
export async function getPendingMemos(): Promise<MemoItem[]> {
  const memos = await listMemos();
  return memos.filter((memo) => memo.status !== 'synced');
}

/** Wipe the queue (used on explicit device reset / future debug tools). */
export async function clearMemoQueue(): Promise<void> {
  await clear(memoStore);
}

function sameTags(a: string[] | undefined, b: string[] | undefined): boolean {
  if (a === b) return true;
  if (!a || !b || a.length !== b.length) return false;
  return a.every((tag, index) => tag === b[index]);
}

function isSameMemo(a: MemoItem, b: MemoItem): boolean {
  return (
    a.content === b.content &&
    a.createdAt === b.createdAt &&
    a.status === b.status &&
    a.kanbanTaskId === b.kanbanTaskId &&
    sameTags(a.tags, b.tags)
  );
}

/**
 * Fold server history into the on-device queue.
 *
 * CRITICAL: memos that are still `pending` or `syncing` locally are
 * unpublished work and are never overwritten by a server copy. Missing memos
 * are inserted and already `synced` memos are refreshed from the archive.
 */
export async function mergeServerMemos(serverMemos: MemoItem[]): Promise<MemoItem[]> {
  const localMemos = await listMemos();
  const byId = new Map(localMemos.map((memo) => [memo.id, memo]));
  const writes: Promise<void>[] = [];

  for (const serverMemo of serverMemos) {
    const localMemo = byId.get(serverMemo.id);

    // `pending`/`syncing` are unpublished work; `failed` still awaits a retry.
    if (localMemo && localMemo.status !== 'synced') continue;

    const archived: MemoItem = { ...serverMemo, status: 'synced' };

    if (localMemo && isSameMemo(localMemo, archived)) continue;

    byId.set(archived.id, archived);
    writes.push(set(archived.id, archived, memoStore));
  }

  if (writes.length > 0) {
    await Promise.all(writes);
  }

  return [...byId.values()].sort((a, b) => b.createdAt - a.createdAt);
}
