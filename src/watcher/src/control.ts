import { execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  getFirestoreDb,
  getServiceAccountPath,
  getWatcherDataDir,
  getWatcherRoot,
  hasServiceAccount,
} from './firebase.js';

const STARTUP_VBS_NAME = 'LumosAgyWatcher.vbs';

function getPaths() {
  const watcherRoot = getWatcherRoot();
  const dataDir = getWatcherDataDir();
  const appData = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
  const startupDir = path.join(appData, 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup');
  return {
    watcherRoot,
    dataDir,
    startupDir,
    startupVbs: path.join(startupDir, STARTUP_VBS_NAME),
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

function buildHiddenVbsContent(watcherScript: string): string {
  const nodeExe = process.execPath.replace(/"/g, '""');
  const scriptEscaped = watcherScript.replace(/"/g, '""');
  return [
    'Set WshShell = CreateObject("WScript.Shell")',
    `WshShell.Run """${nodeExe}"" ""${scriptEscaped}""", 0, False`,
    '',
  ].join('\r\n');
}

function enableAutoStart(vbsLauncher: string, startupDir: string, startupVbs: string, watcherScript: string): void {
  const content = buildHiddenVbsContent(watcherScript);
  fs.writeFileSync(vbsLauncher, content, 'utf8');
  fs.mkdirSync(startupDir, { recursive: true });
  fs.writeFileSync(startupVbs, content, 'utf8');
}

function disableAutoStart(startupVbs: string): boolean {
  if (fs.existsSync(startupVbs)) {
    fs.unlinkSync(startupVbs);
    return true;
  }
  return false;
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

async function handleInstallOrStart(): Promise<void> {
  const { pidFile, vbsLauncher, startupDir, startupVbs, watcherScript } = getPaths();
  ensureBuilt(watcherScript);
  enableAutoStart(vbsLauncher, startupDir, startupVbs, watcherScript);
  console.log(`Auto-start Windows aktif (${startupVbs}).`);

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

function handleStop(): void {
  const { pidFile, startupVbs } = getPaths();
  const stopped = stopRunningProcess(pidFile);
  console.log(stopped ? 'Lumos #agy watcher dihentikan.' : 'Watcher sedang tidak berjalan.');

  const disabled = disableAutoStart(startupVbs);
  console.log(
    disabled
      ? 'Auto-start Windows dinonaktifkan sampai Papa jalankan: npm run watcher:start'
      : 'Auto-start Windows sudah dalam kondisi nonaktif.',
  );
}

async function handleStatus(): Promise<void> {
  const { pidFile, startupVbs } = getPaths();
  const pid = readRunningPid(pidFile);
  const autoStartEnabled = fs.existsSync(startupVbs);

  console.log(`Watcher Process : ${pid ? `RUNNING (PID ${pid})` : 'STOPPED'}`);
  console.log(
    `Auto-Start      : ${autoStartEnabled ? `ENABLED (${startupVbs})` : 'DISABLED'}`,
  );
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
      console.log(
        `Pending #agy    : error (${error instanceof Error ? error.message : String(error)})`,
      );
    }
  }
}

async function main(): Promise<void> {
  const cmd = process.argv[2] ?? 'status';
  if (cmd === 'install' || cmd === 'start') {
    await handleInstallOrStart();
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
