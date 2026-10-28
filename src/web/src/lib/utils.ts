import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Merge conditional Tailwind classes without conflicting duplicates. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** UUID v4 with a safe fallback for non-secure browser contexts. */
export function createMemoId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `memo-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Pull unique lowercase tags out of inline `#hashtags`. */
export function extractTags(content: string): string[] {
  const matches = content.match(/#[\p{L}\p{N}_-]+/gu) ?? [];
  return [...new Set(matches.map((tag) => tag.slice(1).toLowerCase()))].slice(0, 5);
}

const timeFormatter = new Intl.DateTimeFormat('id-ID', {
  hour: '2-digit',
  minute: '2-digit',
});

const dateFormatter = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'short',
});

/** Compact Indonesian timestamp for memo cards. */
export function formatMemoTime(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const elapsed = Math.max(0, now.getTime() - timestamp);
  const minute = 60_000;

  if (elapsed < minute) return 'Baru saja';
  if (elapsed < 60 * minute) return `${Math.floor(elapsed / minute)} mnt lalu`;
  if (date.toDateString() === now.toDateString()) return timeFormatter.format(date);

  return `${dateFormatter.format(date)} · ${timeFormatter.format(date)}`;
}
