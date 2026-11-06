import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Merge conditional Tailwind classes without conflicting duplicates. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Light haptic tick on devices that support the Vibration API (no-op elsewhere). */
export function haptic(pattern: number | number[] = 10): void {
  if (typeof navigator === 'undefined') return;

  try {
    navigator.vibrate?.(pattern);
  } catch {
    // Some browsers throw when vibration is blocked by policy.
  }
}

/**
 * Copy text to the clipboard. Falls back to a hidden textarea when the async
 * Clipboard API is unavailable (e.g. plain-HTTP access over the tailnet).
 */
export async function copyText(text: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Permission denied: try the legacy path below.
    }
  }

  if (typeof document === 'undefined') return false;

  const active = document.activeElement as HTMLElement | null;
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none;font-size:16px;';
  document.body.appendChild(textarea);
  textarea.select();
  textarea.setSelectionRange(0, text.length);

  let copied = false;
  try {
    copied = document.execCommand('copy');
  } catch {
    copied = false;
  }

  textarea.remove();
  active?.focus({ preventScroll: true });
  return copied;
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
