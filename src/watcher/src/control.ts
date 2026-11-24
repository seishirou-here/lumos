import { execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

import {
  getFirestoreDb,
  getServiceAccountPath,
  getWatcherDataDir,
  getWatcherRoot,
  hasServiceAccount,
} from './firebase.js';

const TASK_NAME = 'LumosAgyWatcher';

function getPaths() {
  const watcherRoot = getWatcherRoot();
  const dataDir = getWatcherDataDir();
  return {
    watcherRoot,
    dataDir,
    pidFile: path.join(dataDir, 'watcher.pid'),
    vbsLauncher: path.join(dataDir, 'launch-watcher.vbs'),
    watcherScript: path.join(watcherRoot, 'dist', 'watcher', 'src', 'watcher.js'),
  };
}

function readRunningPid(pidFile: string): number | null {
  if (!fs.existsSync(pidFile)) return null;
  const raw = fs.readFileSync(pidFile, 'utf8').trim();
  const pid = Number(raw);
  if (!Number.isInteger(pid) || pid <= 0) return null;

  try {
    process.kill(pid, 0);
    return pid;
  } catch {
    return null;
  }
}

function writeHiddenVbsLauncher(vbsPath: string, watcherScript: string): void {
  const nodeExe = process.execPath.replace(/"/g, '""');
  const scriptEscaped = watcherScript.replace(/"/g, '""');
  const vbsContent = [
    'Set WshShell = CreateObject("WScript.Shell")',
    `WshShell.Run """${nodeExe}"" ""${scriptEscaped}""", 0, False`,
    '',
  ].join('\r\n');
  fs.writeFileSync(vbsPath, vbsContent, 'utf8');
}

function runSchtasks(args: string[]): { ok: boolean; output: string } {
  try {
    const out = execFileSync('schtasks.exe', args, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });
    return { ok: true, output: out.trim() };
  } catch (error: unknown) {
    const err = error as { stdout?: string; stderr?: string; message?: string };
    return {
      ok: false,
      output: (err.stderr || err.stdout || err.message || '').trim(),
    };
  }
}

function startBackgroundProcess(vbsLauncher: string): void {
  const child = spawn('wscript.exe', [vbsLauncher], {
    detached: true,
    stdio: 'ignore',
    windowsHide: true,
  });
  child.unref();
}

function stopRunningProcess(pidFile: string): boolean {
  const pid = readRunningPid(pidFile);
  if (!pid) {
    if (fs.existsSync(pidFile)) fs.unlinkSync(pidFile);
    return false;
  }

  try {
    process.kill(pid, 'SIGTERM');
  } catch {
    try {
      execFileSync('taskkill.exe', ['/PID', String(pid), '/F'], {
        stdio: 'ignore',
        windowsHide: true,
      });
    } catch {
      // Ignore if already exited
    }
  }

  if (fs.existsSync(pidFile)) fs.unlinkSync(pidFile);
  return true;
}

function ensureBuilt(watcherScript: string): void {
  if (!fs.existsSync(watcherScript)) {
    throw new Error(
      `Build watcher belum ditemukan di ${watcherScript}. Jalankan: npm run build:watcher`,
    );
  }
}

async function handleInstall(): Promise<void> {
  const { pidFile, vbsLauncher, watcherScript } = getPaths();
  ensureBuilt(watcherScript);
  writeHiddenVbsLauncher(vbsLauncher, watcherScript);

  const taskCmd = `wscript.exe "${vbsLauncher}"`;
  const created = runSchtasks([
    '/Create',
    '/TN',
    TASK_NAME,
    '/SC',
    'ONLOGON',
    '/TR',
    taskCmd,
    '/F',
  ]);

  if (!created.ok) {
    console.warn(`Peringatan: gagal mendaftarkan Task Scheduler (${created.output}).`);
  } else {
    console.log(`Task Scheduler "${TASK_NAME}" terdaftar (auto-start setiap Windows logon).`);
  }

  if (!hasServiceAccount()) {
    console.log(
      `Watcher belum dinyalakan sekarang karena ${getServiceAccountPath()} belum ada.\n` +
        'Setelah simpan service-account.json, jalankan: npm run watcher:start',
    );
    return;
  }

  if (!readRunningPid(pidFile)) {
    startBackgroundProcess(vbsLauncher);
    console.log('Lumos #agy watcher dijalankan di background.');
  } else {
    console.log('Lumos #agy watcher sudah berjalan.');
  }
}

async function handleStart(): Promise<void> {
  const { pidFile, vbsLauncher, watcherScript } = getPaths();
  ensureBuilt(watcherScript);
  writeHiddenVbsLauncher(vbsLauncher, watcherScript);

  const enabled = runSchtasks(['/Change', '/TN', TASK_NAME, '/ENABLE']);
  if (!enabled.ok) {
    // Task not registered yet — install it automatically.
    await handleInstall();
    return;
  }

  console.log(`Auto-start "${TASK_NAME}" diaktifkan kembali.`);

  if (!hasServiceAccount()) {
    throw new Error(
      `service-account.json belum ditemukan di ${getServiceAccountPath()}. Lihat docs/SETUP_FIREBASE.md.`,
    );
  }

  if (!readRunningPid(pidFile)) {
    startBackgroundProcess(vbsLauncher);
    console.log('Lumos #agy watcher berjalan di background.');
  } else {
    console.log('Lumos #agy watcher sudah aktif.');
  }
}

function handleStop(): void {
  const { pidFile } = getPaths();
  const stopped = stopRunningProcess(pidFile);
  console.log(stopped ? 'Lumos #agy watcher dihentikan.' : 'Watcher sedang tidak berjalan.');

  const disabled = runSchtasks(['/Change', '/TN', TASK_NAME, '/DISABLE']);
  if (disabled.ok) {
    console.log(`Auto-start "${TASK_NAME}" dinonaktifkan sampai Papa jalankan npm run watcher:start.`);
  }
}

async function handleStatus(): Promise<void> {
  const { pidFile } = getPaths();
  const pid = readRunningPid(pidFile);
  const taskQuery = runSchtasks(['/Query', '/TN', TASK_NAME, '/FO', 'LIST']);
  const taskLine = taskQuery.ok
    ? taskQuery.output
        .split(/\r?\n/)
        .find((l) => /Status:|Scheduled Task State:/i.test(l))
        ?.trim() ?? 'Registered'
    : 'Not installed';

  console.log(`Watcher Process : ${pid ? `RUNNING (PID ${pid})` : 'STOPPED'}`);
  console.log(`Auto-Start Task : ${TASK_NAME} (${taskLine})`);
  console.log(
    `Service Account : ${hasServiceAccount() ? `FOUND (${getServiceAccountPath()})` : `MISSING (${getServiceAccountPath()})`}`,
  );

  if (hasServiceAccount()) {
    try {
      const db = getFirestoreDb();
      const snap = await db.collection('memos').where('agyStatus', '==', 'pending').get();
      const activeCount = snap.docs.filter((d) => !d.data().deletedAt && !d.data().archived).length;
      console.log(`Pending #agy    : ${activeCount} memo(s)`);
    } catch (error) {
      console.log(`Pending #agy    : error (${error instanceof Error ? error.message : String(error)})`);
    }
  }
}

async function main(): Promise<void> {
  const cmd = process.argv[2] ?? 'status';
  if (cmd === 'install') {
    await handleInstall();
  } else if (cmd === 'start') {
    await handleStart();
  } else if (cmd === 'stop') {
    handleStop();
  } else if (cmd === 'status') {
    await handleStatus();
  } else {
    console.log('Usage: control <install|start|stop|status>');
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
