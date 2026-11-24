# Project Lumos - Technical Specification (TECH_SPEC)

**Project Name:** Project Lumos (*Lumi + Memos*)  
**Tagline:** Mobile Quick-Dump & AI-Refined Ingestion to Hermes Kanban  
**Status:** In Progress (Stage 1: Architecture & Brainstorming)  
**Authors:** Papa (Seishirou) & Lumi  

---

## 1. Project Overview & Philosophy

Project Lumos is designed to capture thoughts, ideas, and tasks the instant they occur on mobile devices with zero friction, ensure resilient storage regardless of host network availability, archive raw and refined thoughts through the Lumos Host Bridge, and enable flexible AI interactions on the host data.

> **Note (Architecture Update):** The automated Hermes Kanban bridge has been disabled per user request. Memos now persist directly in SQLite (`lumos.db`) with real-time SSE syncing across devices. The Lumi AI Refinement Engine is preserved modularly for on-demand use and future AI platform updates.

### Core Principles
- **Zero Friction on Mobile:** Quick-dump interface optimized for instant typing without worrying about format, syntax, or typos.
- **Offline-First Resilience:** Memos are saved immediately to local storage on the device; synchronization occurs automatically when connection to the host is established.
- **AI Refinement on Host:** Intensive processing and summarization are offloaded to the laptop to preserve mobile device battery and data.
- **Human-in-the-Middle:** Ingested cards remain strictly passive in the Kanban `triage` column; no automated execution or card archiving occurs without explicit approval from Papa.

---

## 2. High-Level Architecture

```text
┌────────────────────────────────────────────────────────┐
│                   HP Papa (Mobile PWA)                 │
│                                                        │
│  [ Quick Composer ]  ──►  [ Local Queue (IndexedDB) ]  │
│  [ Calendar View (FullCalendar) ]                      │
└─────────────┬──────────────────────────┬───────────────┘
              │ (Sync Protocol: Tailscale / LAN)
              ▼                          ▼
┌─────────────────────────────┐  ┌───────────────────────┐
│    Laptop (Lumos Server)    │  │ Radicale CalDAV Server│
│                             │  │                       │
│  [ Ingestion API / SSE ]    │  │ [ CalDAV Protocol ]   │
│  [ SQLite lumos.db ]        │  │ [ Standard .ics Store]│
│  [ Preserved Lumi Engine ]  │  │ (Syncs to Mobile via  │
│                             │  │  Tailscale/DAVx⁵/iOS) │
└─────────────────────────────┘  └───────────────────────┘
```

---

## 3. Component Architecture & Data Flow

### A. Mobile Client (Offline-First PWA)
- **Primary Role:** Instant capture interface.
- **Storage:** Local database (e.g. IndexedDB / LocalStorage) acting as a persistent queue.
- **Data Model:**
  ```json
  {
    "id": "uuid-v4",
    "content": "raw text dump from Papa",
    "created_at": "ISO-8601-timestamp",
    "sync_status": "pending" // 'pending' | 'syncing' | 'synced'
  }
  ```
- **Sync Trigger:** Periodically checks host heartbeat; flushes pending queue upon detecting online connectivity.

### B. Ingestion & Bridge Server (Host Laptop)
- **Primary Role:** Local gateway receiver and durable archive on the laptop.
- **Server Storage:** Lightweight SQLite database (`src/server/data/lumos.db`) using Node v24 built-in `node:sqlite` (`PRAGMA journal_mode = WAL`).
- **Table Schema (`memos`):**
  - `id` (TEXT PRIMARY KEY)
  - `content` (TEXT NOT NULL)
  - `created_at` (INTEGER NOT NULL)
  - `tags` (TEXT)
  - `status` (TEXT NOT NULL DEFAULT 'synced')
  - `kanban_task_id` (TEXT)
  - `server_created_at` (INTEGER NOT NULL)
- **Endpoints:**
  - `GET /api/health`: Heartbeat probe reporting server, database status, and memo count.
  - `POST /api/memos/dump`: Accepts batches of raw memos, archives them idempotently into SQLite, and responds immediately.
  - `GET /api/memos`: Returns recent memo history for bi-directional cross-device feed synchronization.
- **Bi-Directional Sync Rules:**
  1. *Pending is King:* Local client memos with status `pending` or `syncing` are never overwritten by server memos.
  2. *Push-then-Pull:* Clients push local pending queues first, then pull server history to merge into local feeds.
  3. *Optimistic Stream:* Newly captured memos appear in the UI stream instantly.
- **Execution:** Bridges refined payloads into Hermes Kanban CLI (`hermes kanban create ...`).

### C. Lumi Refinement Engine (Preserved for Future Update)
- **Primary Role:** Modular structuring utility, currently preserved for on-demand use and future AI platforms.
- **Refinement Strategy:**
  1. Concise title generation (3–7 words).
  2. Contextual summary and actionable key points.
  3. Strict preservation of original raw text in a dedicated quote block.

### D. Calendar & Scheduling Subsystem (Radicale CalDAV + FullCalendar)
- **Primary Role:** Unified personal and academic schedule management with full offline-first self-hosted privacy.
- **Client Component (`FullCalendar` in `src/web`):**
  - Integrated via `@fullcalendar/react` with DayGrid (month), TimeGrid (week/day), and List views.
  - Styled with Lumos OLED obsidian dark themes (*Kuro Sakura* `#fb7185` and *Kuro Midori* `#34d399`).
  - Supports interactive event creation, filtering by tag (`#kuliah`, `#event`, `#personal`), and memo association.
- **Server Component (`Radicale CalDAV`):**
  - Lightweight, standards-compliant (RFC 4791 / RFC 5545) CalDAV server running on Papa's host laptop.
  - Stores calendar events as standard `.ics` (iCalendar) files locally.
  - Multi-device interoperability: Native mobile sync over Tailscale via iOS Calendar or Android DAVx⁵, alongside the Lumos FullCalendar interface.
  - Bridge integration: Lumos server connects to Radicale to synchronize event metadata with memos and timeline items.

---

## 4. Dedicated Topic Deep-Dives (To Be Elaborated)

The following topics will be explored and specified in dedicated documents under `docs/`:

1. **`docs/NETWORKING.md` (Koneksi HP ke Laptop/Server):**
   - Evaluating Wi-Fi Local LAN vs. Tailscale Mesh vs. Cloudflare Tunnel.
   - Authentication & security between mobile device and host.
2. **`docs/TECH_STACK.md` (Tech Stack Client & Host):**
   - Client evaluation (React/Vite PWA, SvelteKit, Vanilla lightweight).
   - Host runtime evaluation (Node/Express, Python/FastAPI, Go).
3. **`docs/UI_UX_DESIGN.md` (Tampilan & User Experience):**
   - Interaction gestures, composer auto-focus, offline indicators, dark theme ergonomics.
4. **`docs/AI_REFINEMENT.md` (Prompting & Refinement Engine):**
   - LLM prompting templates, model routing, tagging strategies, and raw dump formatting.

---

## 5. Implementation Roadmap

- [x] **Milestone 1:** High-Level Architecture & Tech Spec (`docs/TECH_SPEC.md`).
- [x] **Milestone 2:** Deep-dive specs (`NETWORKING.md`, `TECH_STACK.md`, `UI_UX_DESIGN.md`, `AI_REFINEMENT.md`).
- [x] **Milestone 3:** Client Scaffolding (`src/web`) with Offline Queue & PWA Shell.
- [x] **Milestone 4:** Host Bridge Server (`src/server`) with SQLite Archive & Real-time SSE.
- [x] **Milestone 5:** Modular AI Refinement Engine Preserved (9router).
- [ ] **Milestone 6:** Radicale CalDAV Server Daemon & Tailscale Setup on Host.
- [ ] **Milestone 7:** FullCalendar Client Component & Multi-View Navigation (Feed / Calendar).
- [ ] **Milestone 8:** Calendar Event Creation from Quick-Dumps & Bidirectional Mobile CalDAV Sync.
