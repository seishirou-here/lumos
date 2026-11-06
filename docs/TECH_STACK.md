# Project Lumos - Technology Stack Specification (`docs/TECH_STACK.md`)

**Document:** Technology Stack & Toolchain Specification  
**Status:** Approved & Finalized  
**Architecture:** Unified Full-Stack TypeScript (Monorepo)  
**Authors:** Papa (Seishirou) & Lumi  

---

## 1. Architectural Decision & Core Philosophy

To achieve maximum development ergonomics, prevent mental friction, and enable seamless data sharing between mobile client and laptop host, Project Lumos adopts a **Unified TypeScript Monorepo** approach.

### Core Advantages:
1. **Single Language & Ecosystem:** Both frontend and backend share TypeScript and `npm`. No conflicting virtual environments or language context-switching.
2. **Shared Data Contracts:** Data structures (`Memo`, `SyncPayload`, `RefinedCard`, `IngestResult`) are defined once in a shared directory and used across client and server with 100% type safety.
3. **Optimized for OpenCode:** Autonomous coding agents excel at TypeScript monorepos, reducing scaffolding friction and runtime bugs.

---

## 2. Client Stack (`src/web` - Mobile PWA)

Designed for instant cold-starts, offline durability, and zero-latency input capture on mobile devices:

| Component | Technology | Rationale |
| :--- | :--- | :--- |
| **Framework** | **React + TypeScript** | Robust ecosystem, component-driven, predictable state management. |
| **Build Tool** | **Vite** | Sub-second HMR, micro-bundle output (~80 KB gzipped). |
| **PWA Engine** | **`vite-plugin-pwa`** | Automatic Service Worker generation, offline asset caching, web app manifest for "Add to Home Screen". |
| **Styling** | **Tailwind CSS** | Mobile-first utility classes, native dark-mode ergonomics, minimal CSS footprint. |
| **Offline Storage** | **`idb-keyval` (IndexedDB)** | Lightweight (< 1 KB) promise-based key-value wrapper around browser IndexedDB. Handles offline queues safely without localStorage quota limits. |
| **Icons** | **Lucide React** | Clean, minimalist, and lightweight icon set. |

---

## 3. Host Server Stack (`src/server` - Bridge & Ingestion)

Designed as a lightweight, dependable local daemon running on Papa's laptop:

| Component | Technology | Rationale |
| :--- | :--- | :--- |
| **Runtime** | **Node.js (v24.x)** | Already pre-installed on Papa's host machine. Native modern JavaScript/ESM support. |
| **Framework** | **Express.js (TypeScript)** | Minimal, battle-tested REST API framework with zero magic and predictable lifecycle. |
| **Dev Runner** | **`tsx`** | Blazing-fast TypeScript execution without compilation overhead during development. |
| **Validation** | **Zod** | Runtime payload validation for incoming mobile memos. |
| **Local Archive DB** | **`node:sqlite` (Node v24 Built-in)** | Zero external dependencies, native C-speed SQLite with WAL mode, persistent cross-device feed synchronization. |
| **Hermes Bridge** | **`node:child_process` (execFile)** | Calls `hermes kanban create` through the official CLI interface, insulating Lumos from internal database migrations. |
| **AI Client** | **Native `fetch` / OpenAI SDK** | Lightweight HTTP client to call the local/configured LLM endpoint for text refinement. |
| **Security** | **CORS + Dotenv** | Restricted origins (Tailscale mesh & localhost) and bearer token authentication. |

---

## 4. Shared Data Contracts (`src/shared/types.ts`)

A unified module referenced by both `src/web` and `src/server`:

```typescript
// Core Memo Status Lifecycle
export type MemoSyncStatus = 'pending' | 'syncing' | 'synced' | 'failed';

// Client-side Memo Structure
export interface MemoItem {
  id: string;             // UUID v4
  rawContent: string;     // Unedited input from Papa
  createdAt: string;      // ISO-8601 string
  status: MemoSyncStatus;
  retryCount: number;
  syncedAt?: string;
  kanbanTaskId?: string;
}

// Ingestion Payload from HP to Laptop
export interface DumpPayload {
  memos: MemoItem[];
}

// Refined Result Schema for Kanban Ingestion
export interface RefinedKanbanCard {
  title: string;          // 3-7 words punchy title
  summary: string;        // Polished concept overview
  keyPoints: string[];    // Extracted actionable bullets
  rawContent: string;     // Untouched raw mobile dump
  tags: string[];         // e.g. ['lumos', 'mobile-dump']
}

// Bridge Health Response
export interface HealthStatus {
  status: 'ok' | 'degraded';
  version: string;
  uptime: number;
  kanbanAvailable: boolean;
}
```

---

## 5. Project Directory Structure

```text
lumos/
├── docs/                      # Architectural specs & roadmaps
│   ├── TECH_SPEC.md
│   ├── NETWORKING.md
│   ├── TECH_STACK.md
│   ├── UI_UX_DESIGN.md
│   ├── AI_REFINEMENT.md
│   └── TODO.md
├── src/
│   ├── shared/                # Shared TS interfaces & schemas
│   │   └── types.ts
│   ├── web/                   # Frontend PWA (React + Vite + Tailwind)
│   │   ├── public/            # PWA icons & manifest
│   │   ├── src/               # React components, hooks, storage
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   └── package.json
│   └── server/                # Host Bridge Server (Node.js + Express)
│       ├── src/               # Express routes, AI polisher, Hermes bridge
│       ├── .env.example
│       ├── tsconfig.json
│       └── package.json
├── package.json               # Root scripts (concurrently run web + server)
└── README.md
```

---

## 6. Development Scripts (Root `package.json`)

* `npm run dev` ➔ Concurrently starts `src/web` (Vite dev server) and `src/server` (`tsx watch`).
* `npm run build` ➔ Typechecks and builds both web client and backend server.
* `npm run start` ➔ Starts production server and serves static web PWA directly.
