# Project Lumos - Multi-Week Evolution Roadmap (`docs/ROADMAP.md`)

**Document:** Future Feature Evolution & Multi-Week Roadmap  
**Status:** Approved by Papa (Seishirou) & Lumi  
**Target:** Personal Command Center & Academic OS Expansion  

---

## 🧭 Overview

Project Lumos berevolusi dari sekadar aplikasi *mobile quick-dump* menjadi ekosistem komprehensif untuk mendokumentasikan pemikiran, jadwal akademik kuliah, agenda penting, dan pengingat tugas dengan tetap mempertahankan filosofi **P2P, Offline-First, dan Human-in-the-Middle**.

---

## 🗓️ Phased Milestones

### 🎨 Phase 1 (Minggu 1): UI/UX Exploration di Figma & Memo Deletion
*Fokus: Mematangkan wireframe & mockup visual sebelum pengkodean, plus fitur dasar pengelolaan memo.*

1. **Figma UI/UX Concept (Integrasi Calendar & Timeline):**
   - Rancang arsitektur antarmuka baru dengan tab/view navigasi terpadu:
     - **Feed Stream View:** Tampilan micro-journaling quick-dump saat ini.
     - **Calendar View:** Tampilan agenda harian/mingguan/bulanan.
     - **Semester Timeline View:** Visualisasi garis waktu kegiatan kuliah & event.
   - Menggunakan token desain khas Lumos (*Kuro Sakura* & *Kuro Midori*) berbasis kanvas OLED `#09090b`.
2. **Delete / Archive Memos (COMPLETED):**
   - [x] Menambahkan aksi arsip & konfirmasi hapus dua-langkah pada kartu memo (`MemoCard.tsx`) serta filter tab Aktif / Arsip di `MemoStream.tsx`.
   - [x] Penambahan endpoint `DELETE /api/memos/:id` dan `PATCH /api/memos/:id/archive` di `src/server`.
   - [x] Propagasi penghapusan dan pengarsipan di IndexedDB lokal dan SQLite `lumos.db` via event SSE (`memo_deleted` & `memos_updated`).

---

### 📅 Phase 2 (Minggu 2): Custom Timeline & Academic Semester Tracker
*Fokus: Melacak kegiatan kampus, timeline semester aktif, dan acara favorit.*

1. **Interactive Timeline Component:**
   - Tampilan visual milestone kegiatan semester (KRS, masa perkuliahan, UTS, UAS, deadline tugas besar, webinar/event pilihan).
   - Pengelompokan & filter berdasarkan tag: `#kuliah`, `#event`, `#personal`.
2. **Temporal Metadata Tagging:**
   - Ekstraksi entitas waktu secara terstruktur untuk disematkan langsung ke dalam node timeline.

---

### 🔔 Phase 3 (Minggu 3): Web Push Notifications & Task Reminder System
*Fokus: Pengingat tugas otomatis dari hasil pemikiran/dumping.*

1. **PWA Web Push Notifications:**
   - Pemanfaatan Service Worker Notification & Push API pada perangkat mobile.
   - Kemampuan menjadwalkan alarm / reminder lokal langsung dari memo.
2. **AI Task & Due Date Extraction:**
   - Peningkatan Lumi Refinement Engine untuk mengenali konteks batas waktu (misal: *"kumpul sebelum jumat jam 23.59"*) dan mengonversi menjadi trigger reminder.

---

### 🗓️ Phase 4 (Minggu 4): CalDAV Radicale Integration & External Calendar Sync
*Fokus: Ekosistem kalender mandiri (self-hosted) dengan CalDAV Radicale dan integrasi kalender eksternal.*

1. **Radicale CalDAV Server Integration:**
   - Setup daemon CalDAV lokal Radicale pada laptop host.
   - Sinkronisasi standar RFC 4791/5545 `.ics` langsung dengan FullCalendar di frontend `src/web`.
   - Sinkronisasi ke smartphone Papa melalui Tailscale menggunakan aplikasi kalender native (iOS Calendar atau DAVx⁵ di Android).
2. **Optional External Calendar Bi-Directional Sync:**
   - Ekspor/impor agenda antara Radicale CalDAV dan Google Calendar via service account/OAuth jika diperlukan.
