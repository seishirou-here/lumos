/**
 * Shared data contracts used by both the mobile PWA (`src/web`) and the
 * host bridge (`src/server`).
 */

/** Lifecycle of a memo while it lives in the on-device queue. */
export type MemoSyncStatus = 'pending' | 'syncing' | 'synced' | 'failed';

/** A single raw thought captured on the phone. */
export interface MemoItem {
  id: string;
  content: string;
  createdAt: number;
  status: MemoSyncStatus;
  tags?: string[];
  /** Set once Lumi has bridged the memo into Hermes Kanban. */
  kanbanTaskId?: string;
}

/** Batch of queued memos sent from the phone to the host. */
export interface DumpPayload {
  memos: MemoItem[];
}

/** Acknowledgement returned by the host after a memo dump. */
export interface DumpResult {
  received: number;
  accepted: string[];
}

/** Archived memo history returned by `GET /api/memos`. */
export interface GetMemosResponse {
  memos: MemoItem[];
  total: number;
}

/** Structured card produced by Lumi before it enters Hermes Kanban. */
export interface RefinedKanbanCard {
  title: string;
  summary: string;
  keyPoints: string[];
  tags: string[];
  rawDump: string;
}

/** Health of the host's SQLite archive. */
export interface DbHealth {
  status: 'ok' | 'error';
  memoCount: number;
  error?: string;
}

/** Heartbeat response of the host bridge. */
export interface HealthStatus {
  status: string;
  timestamp: number;
  version: string;
  db: DbHealth;
  sseClients?: number;
}
