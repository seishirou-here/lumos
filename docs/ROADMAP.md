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
2. **Delete / Archive Memos:**
   - Menambahkan gesture swipe / aksi hapus pada kartu memo (`MemoCard.tsx`).
   - Penambahan endpoint `DELETE /api/memos/:id` di `src/server`.
   - Propagasi penghapusan di IndexedDB lokal dan SQLite `lumos.db` via event SSE.

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

### 🗓️ Phase 4 (Minggu 4): Google Calendar Bi-Directional Sync
*Fokus: Jembatan jadwal eksternal ke ekosistem kalender Google.*

1. **Google Calendar API Integration:**
   - Integrasi server-side OAuth / Service Account di `src/server`.
   - Ekspor otomatis agenda/jadwal dari memo Lumos langsung ke Google Calendar akun Papa.
   - Pembacaan agenda Google Calendar untuk dirender di Calendar View Lumos.
