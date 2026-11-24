# Project Lumos - Technical Specification (TECH_SPEC)

**Project Name:** Project Lumos (*Lumi + Memos*)  
**Tagline:** Full-Cloud Offline-First Quick-Dump, Calendar & Human-in-the-Middle `#agy` Inbox  
**Status:** Active (v0.3.0 — Cloud Firestore Architecture)  
**Authors:** Papa (Seishirou) & Lumi  

---

## 1. Project Overview & Philosophy

Project Lumos captures thoughts, checklists, calendar events, and `#agy` task requests instantly on mobile or desktop with zero friction, persists them offline-first in Cloud Firestore (Spark Always Free tier), and bridges `#agy` requests to Papa's laptop with zero paid LLM API overhead.

### Core Principles
- **Zero Friction on Mobile:** Instant quick-dump, checklist, tag tracking, and calendar scheduling from phone or laptop.
- **Offline-First Cloud Sync:** Powered by Cloud Firestore's persistent local IndexedDB cache — writes succeed even when the phone is offline or the laptop is turned off, and synchronize automatically on reconnect.
- **Zero Extra AI API Cost:** No Claude/OpenAI/9router API calls. `#agy` memos queue passively as `pending` until Papa's laptop is on and Papa explicitly reviews & approves them inside Antigravity (`agy`).
- **Human-in-the-Middle:** The laptop background watcher ONLY raises Windows Toast notifications; no autonomous agent execution runs without Papa's confirmation.

---

## 2. High-Level Architecture

```text
┌────────────────────────────────────────────────────────┐
│            HP & Laptop Browser (Lumos PWA)             │
│           Hosted on Firebase Hosting (HTTPS)           │
│                                                        │
│  [ Memos Stream + #agy ]   [ Calendar (FullCalendar) ] │
│  [ Firestore Offline Cache (IndexedDB) + Google Auth ] │
└───────────────────────────┬────────────────────────────┘
                            │ HTTPS / WebChannel (Real-Time)
                            ▼
┌────────────────────────────────────────────────────────┐
│           Google Cloud Firestore (Spark Free)          │
│                                                        │
│  - memos/{id}          (memos, checklist, #agy queue)  │
│  - calendarEvents/{id} (FullCalendar events)           │
│  - Security Rules: locked strictly to Papa's email     │
└───────────────────────────┬────────────────────────────┘
                            │ Firebase Admin SDK (onSnapshot)
                            ▼
┌────────────────────────────────────────────────────────┐
│               Laptop Papa (Always-On)                  │
│                                                        │
│  [ Lumos Watcher Daemon (Windows Startup Task) ]       │
│    └─► Detects `#agy` (agyStatus: pending)             │
│    └─► Sends Windows Toast Notification (Rp 0 token)   │
│                                                        │
│  [ Antigravity (agy) + `lumos-inbox` Skill / CLI ]     │
│    └─► Papa reviews pending `#agy` memos               │
│    └─► Executes ONLY after explicit approval           │
│    └─► Marks `agyStatus: done | dismissed` + `agyNote` │
└────────────────────────────────────────────────────────┘
```

---

## 3. Data Collections (Firestore)

### A. `memos/{id}`
Matches `MemoItem` in `src/shared/types.ts`:
- `id`: string (UUID)
- `content`: string (raw memo text, inline `#tags`)
- `createdAt`: number (epoch ms)
- `tags`: string[] (extracted lowercase tags)
- `completed`: boolean, `completedAt?`: number
- `archived`: boolean
- `deletedAt?`: number (soft-delete with 30-day retention)
- `agyStatus?`: `'pending' | 'done' | 'dismissed'` (auto-set to `'pending'` when `#agy` tag is present)
- `agyNote?`: string (outcome note recorded by AGY/Lumi)
- `agyUpdatedAt?`: number

### B. `calendarEvents/{id}`
Matches `CalendarEventItem` in `src/shared/types.ts`:
- `id`: string
- `title`: string
- `start`: string (ISO date/datetime)
- `end?`: string
- `allDay?`: boolean
- `description?`: string
- `location?`: string
- `tags?`: string[] (`kuliah`, `event`, `personal`)

---

## 4. Legacy Local Stack Note
- `src/server` (Express + SQLite) and `src/server/radicale` (CalDAV) are retained as legacy/archived reference from v0.2.0 and are no longer required for daily cloud operation.
