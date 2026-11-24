# Project Lumos - Actionable Subtasks (TODO)

Tracked subtasks for Papa & Lumi:

## Completed Foundation (v0.1 – v0.2)
- [x] **Tasks 1–4, 7–9:** Monorepo scaffold, Kuro Sakura & Kuro Midori themes, PWA Service Worker (`vite-plugin-pwa`), offline-first memo stream, real-time sync.
- [x] **Task 10 & Cleanup:** Removed Hermes Kanban & 9router AI refinement pipeline (`kanban.ts`, `queue.ts`, `refinement.ts`) to eliminate external API costs.
- [x] **Task 12:** Memo checklist (`completed`), tag tracker, archive/restore, and 30-day soft-delete trash system.
- [x] **Task 11.2:** FullCalendar UI (`CalendarView.tsx`) styled with Lumos OLED dark palette.

## Active Milestone (v0.3 — Full Cloud Firestore + `#agy` Always-On Watcher)
- [x] **Task 13.1: Checkpoint & Architecture Docs Update**
  - [x] Commit v0.2.0 checkpoint (`1376c46`).
  - [x] Update `TECH_SPEC.md`, `NETWORKING.md`, `TECH_STACK.md`, `TODO.md`, and create `SETUP_FIREBASE.md`.
  - [x] Add `firebase.json`, `firestore.rules`, `firestore.indexes.json`.
  - [x] Extend `MemoItem` in `src/shared/types.ts` with `agyStatus`, `agyNote`, and `agyUpdatedAt`.
- [x] **Task 13.2: Migrate `src/web` (Memos + Calendar) to Cloud Firestore**
  - [x] Install `firebase` SDK and add `src/web/src/lib/firebase.ts` (persistent IndexedDB cache + Google Auth).
  - [x] Implement `firestoreMemos.ts` and `firestoreCalendar.ts` with real-time `onSnapshot`.
  - [x] Add `AuthGate.tsx` login screen & setup guide fallback.
  - [x] Auto-tag `#agy` memos with `agyStatus: 'pending'` and render AGY status badges + outcome notes in `MemoCard.tsx`.
  - [x] Connect `CalendarView.tsx` to Firestore `calendarEvents`.
- [x] **Task 13.3: Always-On Laptop Watcher & AGY Inbox CLI (`src/watcher`)**
  - [x] Create `@lumos/watcher` workspace with `firebase-admin` real-time `#agy` listener.
  - [x] Implement native Windows Toast notifications (`notify.ts`).
  - [x] Implement `inbox.ts` CLI (`list`, `done`, `dismiss`, `test-toast`).
  - [x] Implement Windows Startup Task Scheduler manager (`watcher:install`, `watcher:start`, `watcher:stop`, `watcher:status`).
  - [x] Create AGY skill (`lumos-inbox/SKILL.md`) for Human-in-the-Middle review & approval.
- [ ] **Task 13.4: Firebase Project Provisioning & End-to-End Validation**
  - [ ] Papa creates new Firebase project (Spark Free), enables Google Auth & Firestore, and adds `src/web/.env` + `src/watcher/service-account.json`.
  - [ ] Deploy Firestore Rules & PWA to Firebase Hosting (`npm run deploy`).
  - [ ] Register & start `LumosAgyWatcher` (`npm run watcher:install`).
  - [ ] Test mobile `#agy` dump while laptop offline → boot laptop → verify Windows Toast → approve in `agy`.

## Future Roadmap (See `docs/ROADMAP.md`)
- [ ] **Phase 2:** Semester Timeline View (`#kuliah`, `#event`, `#personal`).
- [ ] **Phase 3:** PWA Web Push Notifications & Reminders.
