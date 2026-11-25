import type { AgyStatus, MemoItem } from '../../shared/types.js';

import { getFirestoreDb } from './firebase.js';
import { sendWindowsToast } from './notify.js';
import { sendPushToAllDevices } from './push.js';

function formatTime(epochMs: number): string {
  return new Date(epochMs).toLocaleString('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

async function listPending(asJson: boolean): Promise<void> {
  const db = getFirestoreDb();
  const snapshot = await db.collection('memos').where('agyStatus', '==', 'pending').get();

  const items: MemoItem[] = [];
  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    if (data.deletedAt || data.archived) continue;
    items.push({
      id: docSnap.id,
      content: typeof data.content === 'string' ? data.content : '',
      createdAt: typeof data.createdAt === 'number' ? data.createdAt : 0,
      status: 'synced',
      tags: Array.isArray(data.tags) ? data.tags : undefined,
      completed: Boolean(data.completed),
      agyStatus: 'pending',
    });
  }

  items.sort((a, b) => b.createdAt - a.createdAt);

  if (asJson) {
    console.log(JSON.stringify(items, null, 2));
    return;
  }

  if (items.length === 0) {
    console.log('Inbox #agy kosong (0 memo pending).');
    return;
  }

  console.log(`Ditemukan ${items.length} memo #agy pending:\n`);
  items.forEach((item, index) => {
    console.log(`${index + 1}. [${item.id}] (${formatTime(item.createdAt)})`);
    console.log(`   ${item.content}\n`);
  });
}

async function updateStatus(
  id: string,
  status: AgyStatus,
  note: string | undefined,
  markComplete: boolean,
): Promise<void> {
  if (!id) {
    throw new Error('ID memo wajib diisi.');
  }

  const db = getFirestoreDb();
  const ref = db.collection('memos').doc(id);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new Error(`Memo dengan ID "${id}" tidak ditemukan di Firestore.`);
  }

  const now = Date.now();
  const update: Record<string, unknown> = {
    agyStatus: status,
    agyUpdatedAt: now,
  };

  if (note && note.trim()) {
    update.agyNote = note.trim();
  }

  if (markComplete) {
    update.completed = true;
    update.completedAt = now;
  }

  await ref.update(update);
  console.log(`Updated memo ${id} -> agyStatus=${status}${markComplete ? ', completed=true' : ''}`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0] ?? 'list';

  if (command === 'list') {
    await listPending(args.includes('--json'));
    return;
  }

  if (command === 'done') {
    const id = args[1] ?? '';
    const markComplete = args.includes('--complete');
    const noteParts = args.slice(2).filter((a) => a !== '--complete');
    await updateStatus(id, 'done', noteParts.join(' '), markComplete);
    return;
  }

  if (command === 'dismiss') {
    const id = args[1] ?? '';
    const note = args.slice(2).join(' ');
    await updateStatus(id, 'dismissed', note, false);
    return;
  }

  if (command === 'test-toast') {
    await sendWindowsToast(
      'Lumos · Tes Notifikasi #agy',
      'Watcher siap! Memo #agy dari HP akan muncul di sini saat laptop menyala.',
    );
    console.log('Windows Toast notification sent.');
    return;
  }

  if (command === 'test-push') {
    const custom = args.slice(1).join(' ').trim();
    const result = await sendPushToAllDevices({
      title: 'Lumos · Tes notifikasi dari laptop',
      body: custom || 'Push FCM berhasil sampai ke HP. Siap dipakai buat reminder 🔔',
      tag: 'lumos-test',
    });

    if (result.total === 0) {
      console.log(
        'Belum ada HP terdaftar. Buka Lumos di HP → ikon 🔔 di header → "Aktifkan notifikasi".',
      );
      return;
    }

    console.log(
      `Push terkirim ke ${result.sent}/${result.total} perangkat` +
        (result.pruned > 0 ? ` (${result.pruned} token kedaluwarsa dihapus)` : '') +
        '.',
    );
    for (const err of result.errors) console.log(`  - ${err}`);
    if (result.sent === 0) process.exitCode = 1;
    return;
  }

  console.log(`Usage:
  inbox list [--json]
  inbox done <memoId> [note...] [--complete]
  inbox dismiss <memoId> [note...]
  inbox test-toast
  inbox test-push [message...]`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
