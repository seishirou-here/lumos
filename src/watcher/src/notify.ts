import { execFile } from 'node:child_process';

const POWERSHELL_AUMID =
  '{1AC14E77-02E7-4E5D-B744-2EB1AE5198B7}\\WindowsPowerShell\\v1.0\\powershell.exe';

const TOAST_PS_SCRIPT = `
$ErrorActionPreference = 'Stop'
[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null
[Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom.XmlDocument, ContentType = WindowsRuntime] | Out-Null
$title = [System.Security.SecurityElement]::Escape($env:LUMOS_TOAST_TITLE)
$body = [System.Security.SecurityElement]::Escape($env:LUMOS_TOAST_BODY)
$xml = New-Object Windows.Data.Xml.Dom.XmlDocument
$xml.LoadXml("<toast><visual><binding template='ToastGeneric'><text>$title</text><text>$body</text></binding></visual></toast>")
$toast = New-Object Windows.UI.Notifications.ToastNotification $xml
[Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier('${POWERSHELL_AUMID}').Show($toast)
`;

/**
 * Show a native Windows 10/11 Toast notification using WinRT via PowerShell.
 * Uses environment variables + XML escaping so memo contents can never break quoting.
 */
export function sendWindowsToast(title: string, body: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const cleanTitle = title.replace(/\r?\n/g, ' ').slice(0, 120);
    const cleanBody = body.replace(/\r?\n/g, ' ').slice(0, 240);

    execFile(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-WindowStyle', 'Hidden', '-Command', TOAST_PS_SCRIPT],
      {
        env: {
          ...process.env,
          LUMOS_TOAST_TITLE: cleanTitle,
          LUMOS_TOAST_BODY: cleanBody,
        },
        windowsHide: true,
      },
      (error, _stdout, stderr) => {
        if (error) {
          reject(new Error(stderr?.trim() || error.message));
          return;
        }
        resolve();
      },
    );
  });
}
