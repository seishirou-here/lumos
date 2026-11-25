# ✨ LUMOS — Offline-First Cloud Memos, Calendar & `#agy` Inbox

> *A tiny glowing lantern for fleeting ideas, daily checklists, academic schedules, and human-in-the-middle AI requests — right from your pocket.* (✿◠‿◠)

---

## 🌸 About Project Lumos

**Project Lumos** (*Lumi + Memos*) is a personal, installable **Progressive Web App (PWA)** designed for zero-friction quick dumps on mobile and desktop. Capture thoughts even when you're offline or your laptop is asleep, sync them effortlessly through **Cloud Firestore (Firebase Spark Free Tier)**, and tag tasks with `#agy` to queue them for review on your laptop with **native Windows Toast notifications** — zero paid LLM APIs required!

### ✨ Highlights
- **Offline-First Cloud Sync:** Powered by Cloud Firestore persistent IndexedDB cache — write memos and schedule events even in airplane mode, then sync seamlessly on reconnect.
- **Dual OLED Dark Themes:** Switch smoothly between **Kuro Sakura** 🌸 (`#fb7185`) and **Kuro Midori** 🌿 (`#34d399`) on a deep `#09090b` canvas with tactile micro-interactions.
- **Memos, Checklists & Tag Tracker:** Inline `#hashtag` extraction, completion checklists, Archive, and a 30-day soft-delete Trash bin.
- **Cloud Calendar (`FullCalendar`):** Month, Week, and Agenda views with category filters (`#kuliah`, `#event`, `#personal`), synced in real time across devices.
- **`#agy` Human-in-the-Middle Inbox (`$0` Extra API Cost):**
  - Tag any memo with `#agy` from your phone (even when your laptop is off).
  - When your laptop wakes up, the lightweight always-on **Windows Watcher** (`src/watcher`) pops a native **Windows Toast Notification** — with automatic reconnect after sleep/wake!
  - Nothing runs autonomously behind your back: open Antigravity (`agy`), review pending items, approve what you want executed, and sync status (`AGY · Done` / `AGY · Dismissed`) + notes right back to your phone.
- **Private by Default:** Protected by Google Sign-In (`Firebase Auth`) and owner-only `firestore.rules`.

---

## 🗺️ Architecture

```text
📱 Phone / Desktop PWA (Firebase Hosting · HTTPS)
   ├── Memos Stream + Checklist + #agy Queue
   ├── FullCalendar (Month / Week / Agenda)
   └── Firestore Offline Cache (IndexedDB) + Google Auth
                         │
                         ▼ Real-time Sync
☁️  Cloud Firestore (Spark Always Free Tier)
   ├── memos/{id}
   └── calendarEvents/{id}
                         │
                         ▼ Firebase Admin SDK (onSnapshot + Auto-Reconnect)
💻 Laptop Always-On Watcher (Windows Startup · $0 Token)
   ├── Native Windows Toast Notification on `#agy` pending
   └── `inbox` CLI for Human-in-the-Middle review & approval
```

---

## 🚀 Quick Start (Your Own Free Instance)

All personal configs and secrets use `*.example` templates so you can self-host your own private Lumos on Firebase Spark Free Tier in ~2 minutes:

1. **Install dependencies:**
   ```powershell
   npm install
   ```
2. **Create your Firebase configs from templates:**
   - Copy `src/web/.env.example` → `src/web/.env` (fill in your Firebase Web App config & `VITE_ALLOWED_EMAIL`).
   - Copy `firestore.rules.example` → `firestore.rules` (replace `YOUR_EMAIL@gmail.com`).
   - Copy `.firebaserc.example` → `.firebaserc` (replace `your-firebase-project-id`).
   - Save your Firebase Admin Service Account key to `src/watcher/service-account.json`.
   - Full step-by-step clicks live in [docs/SETUP_FIREBASE.md](docs/SETUP_FIREBASE.md).
3. **Run locally or deploy to Firebase Hosting:**
   ```powershell
   npm run dev:web          # Local Vite dev server
   npm run build            # Typecheck & build PWA + Watcher
   npx firebase-tools login
   npm run deploy           # Deploy PWA Hosting + Firestore Rules
   ```
4. **Enable the Always-On Windows `#agy` Watcher (No Admin Required):**
   ```powershell
   npm run watcher:install  # Register Windows Startup (.vbs) & start in background
   npm run watcher:status   # Check running PID, auto-start & pending #agy count
   npm run watcher:stop     # Stop watcher & pause auto-start
   npm run watcher:start    # Resume watcher & re-enable auto-start
   npm run inbox:list       # List pending #agy memos from terminal
   npm run inbox:toast      # Test native Windows Toast notification
   ```

---

## 📁 Project Structure

```text
lumos/
├── docs/                  # Architecture specs, roadmap & Firebase setup guide
├── src/
│   ├── shared/            # Shared TypeScript contracts (MemoItem, CalendarEventItem)
│   ├── web/               # React 19 + Vite + Tailwind + FullCalendar + Firebase PWA
│   └── watcher/           # Always-on Windows #agy watcher, Toast notifier & inbox CLI
├── firebase.json          # Firebase Hosting & Firestore config
├── firestore.rules.example
└── .firebaserc.example
```

---

## 💖 Credits

**Crafted with care by Seishirou & Lumi** ✧･ﾟ: *✧･ﾟ:* `(✿◠‿◠)`

*First shipped app built together — from late-night ideas to a real installable PWA in your pocket.*
