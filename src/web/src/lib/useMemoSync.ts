import { useCallback, useEffect, useRef } from 'react';

import type { MemoItem } from '@shared/types';

/**
 * Base URL for the EventSource connection. Mirrors the same env variable used
 * by the REST client in `api.ts`, falling back to the current origin (which
 * works both with Vite's dev proxy and production same-origin serving).
 */
const API_BASE_URL = (import.meta.env.VITE_LUMOS_API_URL ?? '').replace(/\/+$/, '');

const SSE_URL = `${API_BASE_URL}/api/memos/events`;

/** Minimum delay before reconnecting after an error. */
const RECONNECT_BASE_MS = 3_000;
/** Maximum reconnect delay (capped exponential back-off). */
const RECONNECT_MAX_MS = 30_000;

interface UseMemoSyncOptions {
  /** Called when new memos arrive from another device via SSE. */
  onMemos: (memos: MemoItem[]) => void;
  /** Whether the app has finished hydrating from IndexedDB. */
  isReady: boolean;
}

/**
 * Subscribes to real-time memo events via Server-Sent Events (SSE).
 *
 * - Connects to `/api/memos/events` when `isReady` is true and the browser is
 *   online.
 * - Reconnects automatically with exponential back-off on errors.
 * - Reconnects immediately when the browser transitions from offline → online
 *   or the tab regains visibility.
 * - Falls back gracefully: if `EventSource` is unavailable, the existing
 *   polling logic in `App.tsx` continues to work as before.
 */
export function useMemoSync({ onMemos, isReady }: UseMemoSyncOptions): void {
  const onMemosRef = useRef(onMemos);
  onMemosRef.current = onMemos;

  const esRef = useRef<EventSource | null>(null);
  const retriesRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimerRef.current !== null) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    // Guard: no SSE support or already connected.
    if (typeof EventSource === 'undefined') return;
    if (esRef.current) return;
    if (!navigator.onLine) return;

    clearReconnectTimer();

    const es = new EventSource(SSE_URL);
    esRef.current = es;

    es.addEventListener('connected', () => {
      retriesRef.current = 0;
    });

    es.addEventListener('memos_updated', (event) => {
      try {
        const memos = JSON.parse(event.data) as MemoItem[];
        if (Array.isArray(memos) && memos.length > 0) {
          onMemosRef.current(memos);
        }
      } catch {
        // Malformed event data — ignore and wait for the next one.
      }
    });

    es.onerror = () => {
      disconnect();
      scheduleReconnect();
    };
  }, [clearReconnectTimer]);

  const disconnect = useCallback(() => {
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }
  }, []);

  const scheduleReconnect = useCallback(() => {
    clearReconnectTimer();
    const delay = Math.min(
      RECONNECT_BASE_MS * Math.pow(2, retriesRef.current),
      RECONNECT_MAX_MS,
    );
    retriesRef.current += 1;
    reconnectTimerRef.current = setTimeout(() => {
      reconnectTimerRef.current = null;
      connect();
    }, delay);
  }, [clearReconnectTimer, connect]);

  useEffect(() => {
    if (!isReady) return;

    connect();

    const handleOnline = () => {
      retriesRef.current = 0;
      if (!esRef.current) connect();
    };

    const handleOffline = () => {
      clearReconnectTimer();
      disconnect();
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && !esRef.current && navigator.onLine) {
        retriesRef.current = 0;
        connect();
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearReconnectTimer();
      disconnect();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [isReady, connect, disconnect, clearReconnectTimer]);
}
