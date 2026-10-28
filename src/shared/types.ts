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
}

/** Batch of queued memos sent from the phone to the host. */
export interface DumpPayload {
  memos: MemoItem[];
}

/** Structured card produced by Lumi before it enters Hermes Kanban. */
export interface RefinedKanbanCard {
  title: string;
  summary: string;
  keyPoints: string[];
  tags: string[];
  rawDump: string;
}

/** Heartbeat response of the host bridge. */
export interface HealthStatus {
  status: string;
  timestamp: number;
  version: string;
}

/** Acknowledgement returned by the host after a memo dump. */
export interface DumpResult {
  received: number;
  accepted: string[];
}
