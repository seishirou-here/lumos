# Project Lumos - Technical Specification (TECH_SPEC)

**Project Name:** Project Lumos (*Lumi + Memos*)  
**Tagline:** Mobile Quick-Dump & AI-Refined Ingestion to Hermes Kanban  
**Status:** In Progress (Stage 1: Architecture & Brainstorming)  
**Authors:** Papa (Seishirou) & Lumi  

---

## 1. Project Overview & Philosophy

Project Lumos is designed to capture thoughts, ideas, and tasks the instant they occur on mobile devices with zero friction, ensure resilient storage regardless of host network availability, refine raw thoughts through Lumi AI on the host laptop, and inject structured cards into the Hermes Kanban `triage` lane.

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
│  [ Text / Quick Composer ]                             │
│             │                                          │
│             ▼                                          │
│  [ Local Queue (IndexedDB) ] ──► (Status: pending)     │
└─────────────┬──────────────────────────────────────────┘
              │ (Sync Protocol: LAN / Tailscale / Tunnel)
              ▼
┌────────────────────────────────────────────────────────┐
│                   Laptop (Lumos Server)                │
│                                                        │
│  [ Ingestion API (/api/dump) ]                         │
│             │                                          │
│             ▼                                          │
│  [ Lumi Refinement Engine ]                            │
│    - Title extraction (concise & focused)              │
│    - Content structuring & key bullet points           │
│    - Raw text preservation (unaltered backup)          │
│             │                                          │
│             ▼                                          │
│  [ Hermes Kanban Bridge ]                              │
│    - Injects into column: 'triage'                     │
│    - Card status: Passive (Human-in-the-Middle)        │
└────────────────────────────────────────────────────────┘
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

### C. Lumi Refinement Engine
- **Primary Role:** Formats messy thoughts into clean, structured Kanban cards.
- **Refinement Strategy:**
  1. Concise title generation (3–7 words).
  2. Contextual summary and actionable key points.
  3. Strict preservation of original raw text in a dedicated quote block.
- **Target Schema in Kanban:**
  ```markdown
  ### 💡 Ringkasan Ide
  <Deskripsi terstruktur hasil kurasi Lumi>

  ### 🎯 Poin-Poin Kunci
  - Poin 1
  - Poin 2

  ---
  > 📝 **Raw Mobile Dump:**
  > "<Teks asli dari HP>"
  ```

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
- [ ] **Milestone 2:** Deep-dive specs (`NETWORKING.md`, `TECH_STACK.md`, `UI_UX_DESIGN.md`, `AI_REFINEMENT.md`).
- [ ] **Milestone 3:** Client Scaffolding (`src/web`) with Offline Queue.
- [ ] **Milestone 4:** Host Bridge Server & Hermes Kanban Ingestion (`src/server`).
- [ ] **Milestone 5:** AI Refinement Engine Integration.
- [ ] **Milestone 6:** End-to-End Field Testing & PWA Deployment.
