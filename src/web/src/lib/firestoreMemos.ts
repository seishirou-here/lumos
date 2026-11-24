import {
  collection,
  deleteDoc,
  deleteField,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  type DocumentData,
} from 'firebase/firestore';

import type { AgyStatus, MemoItem } from '@shared/types';

import { db } from './firebase';

const MEMOS_COLLECTION = 'memos';
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function requireDb() {
  if (!db) {
    throw new Error('Cloud Firestore belum dikonfigurasi.');
  }
  return db;
}

function isAgyStatus(value: unknown): value is AgyStatus {
  return value === 'pending' || value === 'done' || value === 'dismissed';
}

function toMemoItem(id: string, data: DocumentData, hasPendingWrites: boolean): MemoItem {
  return {
    id,
    content: typeof data.content === 'string' ? data.content : '',
    createdAt: typeof data.createdAt === 'number' ? data.createdAt : Date.now(),
    status: hasPendingWrites ? 'pending' : 'synced',
    tags: Array.isArray(data.tags)
      ? data.tags.filter((t): t is string => typeof t === 'string')
      : undefined,
    completed: Boolean(data.completed),
    completedAt: typeof data.completedAt === 'number' ? data.completedAt : undefined,
    archived: Boolean(data.archived),
    deletedAt: typeof data.deletedAt === 'number' ? data.deletedAt : undefined,
    agyStatus: isAgyStatus(data.agyStatus) ? data.agyStatus : undefined,
    agyNote: typeof data.agyNote === 'string' ? data.agyNote : undefined,
    agyUpdatedAt: typeof data.agyUpdatedAt === 'number' ? data.agyUpdatedAt : undefined,
  };
}

/**
 * Subscribe to Cloud Firestore `memos` in real time (with local offline cache).
 * Automatically prunes soft-deleted memos older than 30 days when online.
 */
export function subscribeMemos(
  onData: (memos: MemoItem[], hasPendingWrites: boolean) => void,
  onError: (error: Error) => void,
): () => void {
  const firestore = requireDb();
  const memosQuery = query(
    collection(firestore, MEMOS_COLLECTION),
    orderBy('createdAt', 'desc'),
    limit(300),
  );

  return onSnapshot(
    memosQuery,
    { includeMetadataChanges: true },
    (snapshot) => {
      const now = Date.now();
      const memos: MemoItem[] = [];
      const expiredIds: string[] = [];

      for (const docSnap of snapshot.docs) {
        const memo = toMemoItem(docSnap.id, docSnap.data(), docSnap.metadata.hasPendingWrites);
        if (typeof memo.deletedAt === 'number' && now - memo.deletedAt > THIRTY_DAYS_MS) {
          expiredIds.push(memo.id);
          continue;
        }
        memos.push(memo);
      }

      onData(memos, snapshot.metadata.hasPendingWrites);

      if (expiredIds.length > 0 && navigator.onLine) {
        for (const expiredId of expiredIds) {
          void deleteDoc(doc(firestore, MEMOS_COLLECTION, expiredId)).catch(() => {});
        }
      }
    },
    (error) => {
      onError(error);
    },
  );
}

/** Create a new memo in Firestore (succeeds offline via persistent local cache). */
export async function createFirestoreMemo(memo: MemoItem): Promise<void> {
  const firestore = requireDb();
  const payload: Record<string, unknown> = {
    content: memo.content,
    createdAt: memo.createdAt,
    completed: Boolean(memo.completed),
    archived: Boolean(memo.archived),
  };

  if (memo.tags && memo.tags.length > 0) payload.tags = memo.tags;
  if (typeof memo.completedAt === 'number') payload.completedAt = memo.completedAt;
  if (typeof memo.deletedAt === 'number') payload.deletedAt = memo.deletedAt;
  if (memo.agyStatus) payload.agyStatus = memo.agyStatus;
  if (memo.agyNote) payload.agyNote = memo.agyNote;
  if (typeof memo.agyUpdatedAt === 'number') payload.agyUpdatedAt = memo.agyUpdatedAt;

  await setDoc(doc(firestore, MEMOS_COLLECTION, memo.id), payload);
}

export async function toggleFirestoreMemoComplete(id: string, completed: boolean): Promise<void> {
  const firestore = requireDb();
  await updateDoc(doc(firestore, MEMOS_COLLECTION, id), {
    completed,
    completedAt: completed ? Date.now() : deleteField(),
  });
}

export async function setFirestoreMemoArchived(id: string, archived: boolean): Promise<void> {
  const firestore = requireDb();
  await updateDoc(doc(firestore, MEMOS_COLLECTION, id), { archived });
}

export async function softDeleteFirestoreMemo(id: string): Promise<void> {
  const firestore = requireDb();
  await updateDoc(doc(firestore, MEMOS_COLLECTION, id), {
    deletedAt: Date.now(),
  });
}

export async function restoreFirestoreMemo(id: string): Promise<void> {
  const firestore = requireDb();
  await updateDoc(doc(firestore, MEMOS_COLLECTION, id), {
    deletedAt: deleteField(),
  });
}

export async function permanentDeleteFirestoreMemo(id: string): Promise<void> {
  const firestore = requireDb();
  await deleteDoc(doc(firestore, MEMOS_COLLECTION, id));
}
