# Project Lumos - Technology Stack Specification (`docs/TECH_STACK.md`)

**Document:** Technology Stack & Toolchain Specification  
**Status:** Active (v0.3.0 — Full Cloud Firestore + AGY Watcher)  
**Architecture:** Unified TypeScript Monorepo  
**Authors:** Papa (Seishirou) & Lumi  

---

## 1. Client Stack (`src/web` - Mobile & Desktop PWA)

| Component | Technology | Rationale |
| :--- | :--- | :--- |
| **Framework** | **React 19 + TypeScript** | Predictable component architecture with shared types. |
| **Build & PWA** | **Vite 6 + `vite-plugin-pwa`** | Fast builds, Service Worker precaching, installable mobile PWA. |
| **Cloud DB & Sync** | **Firebase JS SDK (`firebase/firestore`)** | Real-time `onSnapshot` sync + built-in IndexedDB persistent offline cache. |
| **Authentication** | **Firebase Auth (Google Sign-In)** | Zero-friction login locked strictly to Papa's email via Firestore Rules. |
| **Calendar Engine** | **FullCalendar (`@fullcalendar/react`)** | Month, Week, and Agenda views synced via Firestore `calendarEvents`. |
| **Styling & Icons** | **Tailwind CSS + Lucide React** | Kuro Sakura & Kuro Midori OLED dark themes. |
| **Hosting** | **Firebase Hosting** | Free HTTPS static hosting with SPA rewrites. |

---

## 2. Laptop Watcher & AGY Bridge (`src/watcher`)

| Component | Technology | Rationale |
| :--- | :--- | :--- |
| **Runtime** | **Node.js (v26+)** | Native TypeScript stripping (`--experimental-strip-types`) & compiled ESM build. |
| **Firestore Client** | **`firebase-admin`** | Direct real-time listener on `memos` (`agyStatus == 'pending'`) using local Service Account JSON. |
| **Notifications** | **Windows Native Toast (WinRT PowerShell)** | Zero native C++ dependencies; reliable Windows Action Center toasts. |
| **Auto-Start** | **Windows Task Scheduler (`LumosAgyWatcher`)** | Always-on at Windows logon with hidden background launch and easy `watcher:stop` / `watcher:start` toggles. |
| **AGY Integration** | **`lumos-inbox` CLI + AGY Skill** | Lets Antigravity (`agy`) list pending `#agy` memos and mark them `done` / `dismissed` after Papa's approval. |

---

## 3. Root Scripts (`package.json`)

- `npm run dev:web` — run PWA locally via Vite.
- `npm run build` — typecheck & build `src/web` and `src/watcher`.
- `npm run watcher:install` / `watcher:start` / `watcher:stop` / `watcher:status` — manage the always-on Windows `#agy` notification daemon.
- `npm run inbox:list` — inspect pending `#agy` memos from terminal/AGY.
- `npm run deploy` — build PWA and deploy Hosting + Firestore rules via Firebase CLI.
