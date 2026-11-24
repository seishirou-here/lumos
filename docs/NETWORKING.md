# Project Lumos - Networking & Sync Architecture (`docs/NETWORKING.md`)

**Document:** Cloud Connectivity, Security & Offline Sync Specification  
**Status:** Active (v0.3.0 — Full Cloud Firestore)  
**Primary Solution:** Firebase Hosting (HTTPS PWA) + Cloud Firestore (Spark Always Free) + Local Windows Watcher  
**Authors:** Papa (Seishirou) & Lumi  

---

## 1. Overview & Motivation

Starting in v0.3.0, Project Lumos transitions from Pure Local LAN to **Full Cloud Offline-First** via Google Cloud / Firebase Spark Free Tier:
1. **Works When Laptop Is Off:** Memos (including `#agy` requests) and calendar events sync from Papa's phone to Cloud Firestore anytime, anywhere.
2. **Automatic HTTPS for PWA:** Firebase Hosting serves the PWA over valid HTTPS, enabling Service Worker installation and offline caching on mobile without `mkcert` or Chrome insecure-origin flags.
3. **Zero Cost:** Operates comfortably inside Firebase Spark Always Free limits (1 GiB Firestore storage, 50k reads/day, 20k writes/day, 10 GB Hosting).

---

## 2. Security Model

1. **Client Access (`src/web`):**
   - Protected by **Firebase Authentication (Google Sign-In)**.
   - Client checks `VITE_ALLOWED_EMAIL` and immediately signs out unauthorized accounts.
   - **Firestore Security Rules** (`firestore.rules`) enforce server-side ownership: only `request.auth.token.email_verified == true && request.auth.token.email == "<PAPA_EMAIL>"` can read or write `memos` and `calendarEvents`.
2. **Laptop Watcher & AGY Inbox CLI (`src/watcher`):**
   - Authenticates using a local Firebase Admin **Service Account JSON** (`src/watcher/service-account.json`), strictly excluded from git via `.gitignore`.

---

## 3. Offline-to-Online Sync & `#agy` Notification Lifecycle

```text
[ HP Menulis Memo `#agy` (Online atau Offline) ]
                   │
                   ▼
[ Firestore Local IndexedDB Cache (status: pending) ]
                   │ (otomatis sync begitu HP dapat internet)
                   ▼
[ Cloud Firestore: memos/{id} (agyStatus: "pending") ]
                   │ (saat laptop Papa menyala)
                   ▼
[ Windows Startup: LumosAgyWatcher (Node Admin SDK) ]
                   │
                   ├──► Munculkan Windows Toast Notification (Rp 0 API)
                   │
                   └──► Papa buka `agy` → "cek inbox agy"
                              │
                              ▼
                  [ Lumi baca pending → minta Approval ]
                              │
                              ▼
                  [ Eksekusi → update agyStatus: "done" + agyNote ]
```

---

## 4. Always-On Laptop Watcher Control

The watcher runs automatically on Windows logon via Windows Task Scheduler (`LumosAgyWatcher`) in hidden background mode, and stays enabled unless Papa explicitly disables it:
- `npm run watcher:install` — register startup task and start immediately.
- `npm run watcher:stop` — stop running watcher and disable auto-start until re-enabled.
- `npm run watcher:start` — re-enable auto-start and start immediately.
- `npm run watcher:status` — show running status, startup task state, and pending `#agy` count.
