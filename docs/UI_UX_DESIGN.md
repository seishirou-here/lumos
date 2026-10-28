# Project Lumos - UI/UX Design Specification (`docs/UI_UX_DESIGN.md`)

**Document:** UI/UX Design & Ergonomics Specification  
**Status:** Approved & Finalized  
**Inspiration:** useMemos & flomo (Micro-journaling & Stream-of-Consciousness)  
**Authors:** Papa (Seishirou) & Lumi  

---

## 1. Philosophy: Stream-of-Consciousness & Micro-Journaling

Project Lumos treats ideas not as rigid assignments, but as organic, fleeting sparks. 

### Core Tenets:
1. **Zero Cognitive Friction:** Papa should never be forced to invent a title, choose a category, or format text when capturing an idea. The only objective is getting thoughts out of the head into storage within seconds.
2. **Mental Unloading (Stream):** Chronological stream of thoughts without pressure. Refining, structuring, and actioning are handled later by Lumi on the host machine.
3. **Optimistic Instant Feedback:** Tapping the "Dump" button updates the feed instantly (sub-16ms UI latency) before network sync or disk persistence occurs.

---

## 2. Visual Aesthetic & Design Tokens

A clean, modern recreation inspired by flomo/useMemos built purely with Tailwind CSS:

* **Color Palette (Ergonomic Dark Mode):**
  * Background Root: `bg-zinc-950` (`#09090b`)
  * Card Surface: `bg-zinc-900/80` (`#18181b`) with `border-zinc-800`
  * Typography: Primary text `text-zinc-100`, secondary/timestamps `text-zinc-400`, placeholders `text-zinc-500`
  * Status Accent:
    * `emerald-400` / `emerald-500/10` ➔ Synced to Host / Online
    * `amber-400` / `amber-500/10` ➔ Saved Locally (Offline)
    * `blue-400` ➔ In-flight Syncing
* **Typography:** Clean geometric sans-serif (Inter / Geist font stack) with generous line heights (`leading-relaxed`).
* **Geometry:** Modern rounded curves (`rounded-2xl` for cards, `rounded-xl` for buttons/badges).

---

## 3. Screen Anatomy & Layout (Mobile Viewport)

```text
┌───────────────────────────────────────────────┐
│ ⚡ LUMOS                  🟢 Connected (Host) │ ◄── [Header] Status Pill
├───────────────────────────────────────────────┤
│                                               │
│ ┌───────────────────────────────────────────┐ │
│ │ Tulis apa pun yang melintas, Paa...       │ │ ◄── [Composer] Auto-expanding
│ │                                           │ │     Auto-focus on launch
│ │                                           │ │
│ ├───────────────────────────────────────────┤ │
│ │ [# Tag]                      [ 🚀 Dump ]  │ │ ◄── [Thumb Zone Actions]
│ └───────────────────────────────────────────┘ │
│                                               │
│ ─── Linimasa Ide (Memos Stream) ───────────── │
│                                               │
│ ┌───────────────────────────────────────────┐ │
│ │ 🕒 Baru saja · 🟡 Offline (Tersimpan)     │ │ ◄── [Memo Card]
│ │ Evaluasi bridge socket buat sync...       │ │     Unedited raw stream
│ │ #lumos #arsitektur                        │ │
│ └───────────────────────────────────────────┘ │
│                                               │
│ ┌───────────────────────────────────────────┐ │
│ │ 🕒 14:20 · 🟢 Synced to Triage            │ │
│ │ Cek pointer C++ dan memory layout struct  │ │
│ │ #kuliah #cpp                              │ │
│ └───────────────────────────────────────────┘ │
└───────────────────────────────────────────────┘
```

---

## 4. Mobile Ergonomics & Interaction Details

1. **Auto-Focus Composer:**
   - On opening the PWA on mobile, the input area immediately gains focus so typing can start without tapping.
2. **One-Handed Thumb Zone:**
   - Composer actions (Tag button and Dump button) sit comfortably in the lower natural reach area of both left and right thumbs.
3. **Keyboard Convenience:**
   - Desktop/Laptop: `Ctrl + Enter` (or `Cmd + Enter`) triggers instant dump.
   - Mobile: Big tactile primary button with subtle haptic tap feedback.

---

## 5. Modular Component Architecture (Extensibility by Design)

To enable Papa to add features seamlessly "along the way", components are isolated:

* **`<Header />`:** Displays app brand and real-time host connectivity pill (`/api/health`).
* **`<Composer />`:** Independent input engine.
  * *Future Extension Points:* Audio voice-dump toggle, screenshot attachment button, template snippets.
* **`<MemoStream />`:** Virtualized or paginated stream of cards sorted newest-first.
* **`<MemoCard />`:** Single memo item display with status badges.
  * *Future Extension Points:* Swipe-to-delete, tap-to-inspect (viewing Lumi's refined Kanban card preview), quick copy.
* **`<TagBar />` (Future):** Quick-filter chips for tags like `#kuliah`, `#project`, `#random`.

---

## 6. Incremental UX Evolution Roadmap

* **Stage 1 (Core MVP):**
  - Ultra-fast text composer.
  - Offline IndexedDB persistence.
  - Real-time connection badge (Offline/Synced).
  - Reverse-chronological timeline feed.
* **Stage 2 (Enhancement):**
  - In-line hashtag highlighting (`#tag`).
  - Search/filter across local memos.
* **Stage 3 (Rich Capture):**
  - Voice memo capture (transcription).
  - Quick image attachments.
* **Stage 4 (Inspection):**
  - Modal drawer to see how Lumi transformed the raw memo into a structured Kanban card.
