import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import dotenv from 'dotenv';
import { cert, getApps, initializeApp, type ServiceAccount } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** Resolve `src/watcher` directory whether running from `src/` or `dist/watcher/src/`. */
export function getWatcherRoot(): string {
  const normalized = __dirname.replace(/\\/g, '/');
  if (normalized.endsWith('/dist/watcher/src')) {
    return path.resolve(__dirname, '..', '..', '..');
  }
  return path.resolve(__dirname, '..');
}

export function getWatcherDataDir(): string {
  const dir = path.join(getWatcherRoot(), 'data');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function getServiceAccountPath(): string {
  const root = getWatcherRoot();
  dotenv.config({ path: path.join(root, '.env') });

  const envPath = process.env.LUMOS_SERVICE_ACCOUNT_PATH?.trim();
  if (envPath) {
    return path.isAbsolute(envPath) ? envPath : path.resolve(root, envPath);
  }
  return path.join(root, 'service-account.json');
}

export function hasServiceAccount(): boolean {
  return fs.existsSync(getServiceAccountPath());
}

let cachedDb: Firestore | null = null;

export function getFirestoreDb(): Firestore {
  if (cachedDb) return cachedDb;

  const keyPath = getServiceAccountPath();
  if (!fs.existsSync(keyPath)) {
    throw new Error(
      `Firebase service account tidak ditemukan di: ${keyPath}\n` +
        'Ikuti langkah 5 di docs/SETUP_FIREBASE.md untuk mengunduh service-account.json.',
    );
  }

  const raw = fs.readFileSync(keyPath, 'utf8');
  const serviceAccount = JSON.parse(raw) as ServiceAccount;

  if (getApps().length === 0) {
    initializeApp({ credential: cert(serviceAccount) });
  }

  cachedDb = getFirestore();
  return cachedDb;
}
