import fs from 'node:fs';
import path from 'node:path';

import type { MemoItem } from '../../shared/types.js';

import { getFirestoreDb, getWatcherDataDir } from './firebase.js';
import { sendWindowsToast } from './notify.js';

const dataDir = getWatcherDataDir();
const pidFile = path.join(dataDir, 'watcher.pid');
const logFile = path.join(dataDir, 'watcher.log');

const INITIAL_RETRY_MS = 5_000;
const MAX_RETRY_MS = 30_000;

function log(message: string): void {
  const line = `[${new Date().toISOString()}] ${message}\n`;
  process.stdout.write(line);
  try {
    fs.appendFileSync(logFile, line, 'utf8');
  } catch {
    // Ignore log write failures
  }
}

function summarizeMemo(content: string): string {
  const compact = content.replace(/\s+/g, ' ').trim();
  return compact.length > 90 ? `${compact.slice(0, 87)}...` : compact;
}

function cleanupPid(): void {
  try {
    if (fs.existsSync(pidFile)) {
      const current = fs.readFileSync(pidFile, 'utf8').trim();
      if (current === String(process.pid)) {
        fs.unlinkSync(pidFile);
      }
    }
  } catch {
    // Ignore cleanup errors
  }
}

async function main(): Promise<void> {
  fs.writeFileSync(pidFile, String(process.pid), 'utf8');
  log(`Lumos #agy watcher started (PID ${process.pid}).`);

  const db = getFirestoreDb();
  const seenIds = new Set<string>();
  let isInitialSnapshot = true;
  let retryDelayMs = INITIAL_RETRY_MS;
  let unsubscribe: (() => void) | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let isStopping = false;

  const scheduleReconnect = () => {
    if (isStopping || reconnectTimer) return;
    const delay = retryDelayMs;
    retryDelayMs = Math.min(retryDelayMs * 2, MAX_RETRY_MS);
    log(`Reconnecting Firestore listener in ${Math.round(delay / 1000)}s...`);
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      if (!isStopping) attachListener();
    }, delay);
  };

  const attachListener = () => {
    if (unsubscribe) {
      try {
        unsubscribe();
      } catch {
        // Ignore previous listener cleanup errors
      }
      unsubscribe = null;
    }

    unsubscribe = db
      .collection('memos')
      .where('agyStatus', '==', 'pending')
      .onSnapshot(
        async (snapshot) => {
          retryDelayMs = INITIAL_RETRY_MS;
          const activePending: MemoItem[] = [];

          for (const docSnap of snapshot.docs) {
            const data = docSnap.data();
            if (data.deletedAt || data.archived) continue;
            activePending.push({
              id: docSnap.id,
              content: typeof data.content === 'string' ? data.content : '',
              createdAt: typeof data.createdAt === 'number' ? data.createdAt : 0,
              status: 'synced',
              agyStatus: 'pending',
            });
          }

          activePending.sort((a, b) => b.createdAt - a.createdAt);

          if (isInitialSnapshot) {
            isInitialSnapshot = false;
            for (const memo of activePending) {
              seenIds.add(memo.id);
            }

            if (activePending.length > 0) {
              const count = activePending.length;
              const title =
                count === 1
                  ? 'Lumos · 1 memo #agy menunggu approval'
                  : `Lumos · ${count} memo #agy menunggu approval`;
              const body = `${summarizeMemo(activePending[0].content)} — Buka AGY lalu ketik: cek inbox agy`;
              log(`Startup check found ${count} pending #agy memo(s). Sending toast.`);
              try {
                await sendWindowsToast(title, body);
              } catch (err) {
                log(`Toast failed: ${err instanceof Error ? err.message : String(err)}`);
              }
            } else {
              log('Startup check: 0 pending #agy memos.');
            }
            return;
          }

          // Subsequent real-time updates (including after sleep/wake reconnects):
          // notify immediately for any brand-new pending #agy memo not yet seen.
          const newlyArrived = activePending.filter((memo) => !seenIds.has(memo.id));
          for (const memo of activePending) {
            seenIds.add(memo.id);
          }

          for (const memo of newlyArrived) {
            log(`New #agy memo received (${memo.id}): ${summarizeMemo(memo.content)}`);
            try {
              await sendWindowsToast(
                'Lumos · Memo #agy baru dari HP',
                `${summarizeMemo(memo.content)} — Buka AGY: cek inbox agy`,
              );
            } catch (err) {
              log(`Toast failed: ${err instanceof Error ? err.message : String(err)}`);
            }
          }
        },
        (error) => {
          log(`Firestore listener error: ${error.message}`);
          scheduleReconnect();
        },
      );
  };

  attachListener();

  const shutdown = (signal: string) => {
    if (isStopping) return;
    isStopping = true;
    log(`Stopping Lumos #agy watcher (${signal})...`);
    if (reconnectTimer) clearTimeout(reconnectTimer);
    if (unsubscribe) unsubscribe();
    cleanupPid();
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('exit', cleanupPid);
}

main().catch((error) => {
  log(`Fatal watcher error: ${error instanceof Error ? error.message : String(error)}`);
  cleanupPid();
  process.exit(1);
});
