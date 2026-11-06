# Project Lumos - Actionable Subtasks (TODO)

Tracked decomposed subtasks for OpenCode & Papa:

- [x] **Task 1: Tech Spec & Architecture**
  - Path: `docs/TECH_SPEC.md`
  - High-level data model, offline-first philosophy, and system architecture.
- [x] **Task 2: Dedicated Architecture Specs**
  - [x] `docs/NETWORKING.md` (Tailscale Mesh, MagicDNS, offline-to-online sync lifecycle)
  - [x] `docs/TECH_STACK.md` (Unified Full-Stack TypeScript, React PWA + Node.js Express)
  - [x] `docs/UI_UX_DESIGN.md` (Micro-journaling, stream-of-consciousness, modular extensibility)
  - [x] `docs/AI_REFINEMENT.md` (9router integration, JSON prompting, fallback safety)
- [x] **Task 3: Scaffold Frontend Workspace**
  - Location: `src/web`
  - Setup base memo stream feed, composer, and offline IndexedDB queue.
- [x] **Task 4: Server SQLite Archive & Cross-Device Feed Sync**
  - Location: `src/server`, `src/web`
  - [x] Setup lightweight SQLite database (`lumos.db`) in `src/server` for persistent memo archiving.
  - [x] Add `GET /api/memos` endpoint in `src/server` to query memo history with pagination.
  - [x] Update `src/web` to merge server history into local IndexedDB feed (bi-directional sync between mobile & laptop).
- [x] **Task 5: Hermes Kanban Bridge & AI Refinement Ingestion**
  - Location: `src/server`
  - [x] Connect dump flow to Lumi Refinement Engine via 9router (`reasoning-lumos`).
  - [x] Inject refined structured cards into Hermes Kanban `triage` lane (`hermes kanban create`).
  - [x] Resilient offline fallback (`#unrefined` card) if 9router is unreachable.
- [ ] **Task 6: Live End-to-End Testing & Mobile Tailscale Validation**
  - [ ] Connect live 9router auth key (`ROUTER_API_KEY`) for full AI refinement pipeline.
  - [ ] Test mobile capture over Tailscale mesh and verify cards landing in Kanban `triage`.
- [ ] **Task 7: Aesthetic Polish & Mobile PWA Touch Ergonomics Pass**
  - [ ] Fine-tune Kuro Sakura & Kuro Midori themes, tactile micro-interactions (`active:scale-[0.98]`).
  - [ ] Optimize mobile virtual keyboard handling & quick-dump ergonomics.
