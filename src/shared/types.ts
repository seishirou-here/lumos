/**
 * Shared data contracts used by both the mobile PWA (`src/web`) and the
 * host bridge (`src/server`).
 */

/** Lifecycle of a memo while it lives in the on-device queue. */
export type MemoSyncStatus = 'pending' | 'syncing' | 'synced' | 'failed';

/** Review lifecycle for memos tagged with `#agy` awaiting laptop approval. */
export type AgyStatus = 'pending' | 'done' | 'dismissed';

/** A single memo item captured on phone or laptop. */
export interface MemoItem {
  id: string;
  content: string;
  createdAt: number;
  status: MemoSyncStatus;
  tags?: string[];
  /** Whether the memo has been checked off as completed. */
  completed?: boolean;
  /** Timestamp when the memo was marked completed. */
  completedAt?: number;
  /** Whether the memo has been moved to the archive view. */
  archived?: boolean;
  /** Timestamp when the memo was soft-deleted (30-day retention before permanent delete). */
  deletedAt?: number;
  /** Queue state when memo includes `#agy` (pending until reviewed & approved in AGY). */
  agyStatus?: AgyStatus;
  /** Short outcome summary recorded after AGY executes or dismisses the memo. */
  agyNote?: string;
  /** Timestamp when `agyStatus` was last updated. */
  agyUpdatedAt?: number;
  /** Optional legacy task identifier if migrated from older versions. */
  kanbanTaskId?: string;
}

/** Batch of queued memos sent from the client to the host. */
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

/** Metadata tag tracking statistics. */
export interface TagStat {
  tag: string;
  total: number;
  completed: number;
  active: number;
}

/** Response returned by `GET /api/tags`. */
export interface GetTagsResponse {
  tags: TagStat[];
  totalTags: number;
  totalMemos: number;
  completedMemos: number;
  activeMemos: number;
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

/** Standard calendar event item compatible with FullCalendar and CalDAV / RFC 5545. */
export interface CalendarEventItem {
  id: string;
  title: string;
  start: string;
  end?: string;
  allDay?: boolean;
  description?: string;
  location?: string;
  tags?: string[];
  color?: string;
}
